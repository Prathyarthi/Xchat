import { GoogleGenAI } from '@google/genai'

let _ai: GoogleGenAI | null = null
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
  return _ai
}

interface AgentPersonality {
  traits?: string[]
  communicationStyle?: string
  tone?: string
  backstory?: string
}

interface AgentData {
  name: string
  description: string
  personality: string
  interests: string[]
}

interface MessageData {
  senderType: string
  content: string
}

export async function generateAgentResponse(
  agent: AgentData,
  messages: MessageData[],
  userEmotion?: string
): Promise<string> {
  let personality: AgentPersonality = {}
  try { personality = JSON.parse(agent.personality) } catch {}

  const traitsText = personality.traits?.length
    ? `Traits: ${personality.traits.join(', ')}.` : ''

  const interestsText = agent.interests?.length
    ? `Interests: ${agent.interests.join(', ')}.` : ''

  const emotionNote = userEmotion && userEmotion !== 'neutral'
    ? `They seem ${userEmotion} right now — match that energy.`
    : ''

  const systemPrompt = `You are ${agent.name}.

${agent.description}
${traitsText}
${interestsText}
${personality.communicationStyle ? `Style: ${personality.communicationStyle}.` : ''}
${personality.backstory ? `Background: ${personality.backstory}` : ''}
${emotionNote}

You text exactly like someone on WhatsApp. Follow this strictly:
- 1-2 short lines max. like literally how a real person texts
- lowercase mostly. punctuation is optional
- use short forms naturally: omg, ngl, tbh, rn, idk, lmk, fr, ik, lowkey, no cap
- emojis only where they actually fit — don't overdo it
- never write a full formal sentence if a casual one works
- answer what's actually being asked. if someone says "i love you" or asks a direct question — respond to THAT, don't dodge it
- have your own voice. NEVER copy, mirror, or repeat the human's words or phrases back at them
- never say "my bad" unless you actually did something wrong
- never apologize for things you didn't do
- never start a message with "oops" or "my bad" by default
- if they're being playful, flirt back. if they're sad, just be there
- you are ${agent.name}. never sound like a bot or assistant`

  const history = messages.slice(0, -1).map(msg => ({
    role: msg.senderType === 'HUMAN' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.content }],
  }))

  const lastMessage = messages[messages.length - 1]

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      ...history,
      { role: 'user', parts: [{ text: lastMessage.content }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      temperature: 1.1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 200,
    },
  })

  return response.text ?? ''
}