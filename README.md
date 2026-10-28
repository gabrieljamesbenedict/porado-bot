# porado-bot

A Discord bot that replies to messages that @mention it, using an LLM served through
[NVIDIA NIM](https://build.nvidia.com) via the OpenAI-compatible API.

## Requirements

- Node.js **22.18+** (the bot runs `.ts` files directly through Node's built-in type stripping,
  so there is no build step)
- A Discord application with a bot token
- An NVIDIA API key

## Setup

1. Create a Discord application at <https://discord.com/developers/applications>, add a bot, and
   copy its token.
2. In the **Bot** tab, enable the **Message Content Intent** privileged intent. Without it, every
   incoming message body arrives empty and the bot has nothing to answer.
3. Copy the environment template and fill in the values:

   ```sh
   cp .env.example .env
   ```

4. Install dependencies and start the bot:

   ```sh
   npm install
   npm start
   ```

## Environment variables

| Variable            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `DISCORD_BOT_TOKEN` | Bot token from the Discord Developer Portal            |
| `NVIDIA_API_KEY`    | NVIDIA API key (`nvapi-...`) used for chat completions |

Neither variable is optional; the process exits at startup with a clear message if one is missing.

## Scripts

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm start`            | Run the bot once                               |
| `npm run dev`          | Run with `--watch`, restarting on file changes |
| `npm run typecheck`    | Type-check the project (`tsc --noEmit`)        |
| `npm run format`       | Format the repository with Prettier            |
| `npm run format:check` | Verify formatting without writing changes      |

## Project layout

```
src/
  index.ts   Discord client, intents, and the mention handler
  llm.ts     NVIDIA NIM client wrapper
```

## Behaviour

- Ignores messages written by bots and by itself.
- Only responds when the bot is @mentioned in the message.
- Strips the mention from the prompt before sending it to the model.
- Splits replies longer than Discord's 2,000 character limit across multiple messages.
