import OpenAI from "openai"

const MODEL = "nvidia/nemotron-3.5-bolt-e4b"
const FALLBACK_REPLY = "Sorry, I couldn't come up with a response."

const apiKey = process.env.NVIDIA_API_KEY

if (!apiKey) {
  throw new Error("NVIDIA_API_KEY is not set. Copy .env.example to .env and fill it in.")
}

const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey
})

export async function generateResponse(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }]
  })

  return completion.choices[0]?.message?.content?.trim() || FALLBACK_REPLY
}
