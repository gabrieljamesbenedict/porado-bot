import { Client, Events, GatewayIntentBits, type Message, type SendableChannels } from "discord.js"
import { generateResponse } from "./llm.ts"

const DISCORD_MAX_LENGTH = 2000
const TYPING_REFRESH_MS = 8000
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

// Discord clears the typing indicator after ~10 seconds, so keep refreshing it
// until the reply is actually sent. Returns a function that stops the refresh.
async function startTyping(channel: SendableChannels): Promise<() => void> {
	await channel.sendTyping().catch(() => undefined)

	const interval = setInterval(() => {
		void channel.sendTyping().catch(() => undefined)
	}, TYPING_REFRESH_MS)

	return () => clearInterval(interval)
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

	let stopTyping: (() => void) | undefined

	try {
		if (message.channel.isSendable()) {
			stopTyping = await startTyping(message.channel)
		}

		const response = await generateResponse(prompt)
		await replyInChunks(message, response)
	} catch (error) {
		console.error("Failed to answer message:", error)
		await message.reply(FALLBACK_REPLY).catch(() => undefined)
	} finally {
		stopTyping?.()
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
