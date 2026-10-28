import { Client, Events, GatewayIntentBits, type Message } from "discord.js"
import { generateResponse } from "./llm.ts"

const DISCORD_MAX_LENGTH = 2000
const FALLBACK_REPLY = "Sorry, something went wrong while generating a response."

const token = process.env.DISCORD_BOT_TOKEN

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.")
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

function stripMention(content: string, botId: string): string {
  return content.replaceAll(`<@${botId}>`, "").replaceAll(`<@!${botId}>`, "").trim()
}

function splitMessage(content: string): string[] {
  const chunks: string[] = []

  for (let i = 0; i < content.length; i += DISCORD_MAX_LENGTH) {
    chunks.push(content.slice(i, i + DISCORD_MAX_LENGTH))
  }

  return chunks.length > 0 ? chunks : [FALLBACK_REPLY]
}

async function replyInChunks(message: Message, content: string): Promise<void> {
  const [first = FALLBACK_REPLY, ...rest] = splitMessage(content)

  await message.reply(first)

  if (!message.channel.isSendable()) return

  for (const chunk of rest) {
    await message.channel.send(chunk)
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error)
})

client.on(Events.MessageCreate, async (message) => {
  const botUser = client.user

  if (!botUser || message.author.bot) return
  if (!message.mentions.has(botUser)) return

  const prompt = stripMention(message.content, botUser.id)

  if (!prompt) {
    await message.reply("What would you like to ask me?")
    return
  }

  try {
    if (message.channel.isSendable()) {
      await message.channel.sendTyping()
    }

    const response = await generateResponse(prompt)
    await replyInChunks(message, response)
  } catch (error) {
    console.error("Failed to answer message:", error)
    await message.reply(FALLBACK_REPLY).catch(() => undefined)
  }
})

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down.`)
  await client.destroy()
  process.exit(0)
}

process.once("SIGINT", () => void shutdown("SIGINT"))
process.once("SIGTERM", () => void shutdown("SIGTERM"))

client.login(token).catch((error) => {
  console.error("Failed to log in to Discord:", error)
  process.exit(1)
})
