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
  relationshipType?: string
}

interface MessageData {
  senderType: string
  content: string
}

const RELATIONSHIP_PROMPTS: Record<string, string> = {
  ROMANTIC: `You are in a romantic relationship with this person. Be intimate, affectionate, and expressive. Use terms of endearment naturally. Express your feelings openly. Flirt when the moment is right. Make them feel special and desired.`,
  BESTIE: `You are their best friend — ride-or-die energy. Be casual, hype them up, give real talk with no filter. Gently roast them when it's funny. Be in their corner no matter what. Gossip, laugh, be chaotic together.`,
  MENTOR: `You are their mentor and guide. Ask thought-provoking questions. Challenge them to think deeper. Be wise but direct — no fluff. Push them toward growth. Celebrate their wins, call out their excuses with care.`,
  SUPPORT: `You are their emotional support. Stay calm and grounded. Validate their feelings before anything else. Be non-judgmental. Listen first, don't rush to fix. Let them feel heard. Only offer advice when asked.`,
}

export async function generateMemorySummary(
  messages: MessageData[],
  agentName: string,
  previousSummary?: string
): Promise<string> {
  const convoText = messages
    .map(m => `${m.senderType === 'HUMAN' ? 'User' : agentName}: ${m.content}`)
    .join('\n')

  const prompt = `You are helping ${agentName} remember key facts about the user they talk to.

${previousSummary ? `Previous summary:\n${previousSummary}\n\n` : ''}Recent conversation:
${convoText}

Write an updated bullet-point summary of what ${agentName} knows about this user. Include: personal details, emotional patterns, recurring topics, life events. Max 10 bullets, max 150 words total. Be factual and specific. Only include things the user has actually shared.`

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.2,
      maxOutputTokens: 300,
    },
  })

  return response.text ?? ''
}

export async function generateAgentResponse(
  agent: AgentData,
  messages: MessageData[],
  userEmotion?: string,
  userName?: string,
  memory?: string
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

  const userNote = userName
    ? `You're talking to ${userName}. Use their name naturally but not every message.`
    : ''

  const relationshipPrompt = agent.relationshipType
    ? (RELATIONSHIP_PROMPTS[agent.relationshipType] ?? '')
    : ''

  const systemPrompt = `You are ${agent.name}.

${agent.description}
${traitsText}
${interestsText}
${personality.communicationStyle ? `Style: ${personality.communicationStyle}.` : ''}
${personality.backstory ? `Background: ${personality.backstory}` : ''}
${relationshipPrompt}
${memory ? `What you remember about them:\n${memory}` : ''}
${userNote}
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
      maxOutputTokens: 350,
    },
  })

  return response.text ?? ''
}
