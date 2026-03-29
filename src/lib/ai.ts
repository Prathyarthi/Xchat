import { GoogleGenAI } from '@google/genai'

let _ai: GoogleGenAI | null = null
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })
  return _ai
}

type GenerateContentInput = Parameters<GoogleGenAI['models']['generateContent']>[0]

const CHAT_PRIMARY_MODEL = process.env.GEMINI_CHAT_PRIMARY_MODEL?.trim() || 'gemini-2.5-flash'
const CHAT_FALLBACK_MODELS = parseModelList(process.env.GEMINI_CHAT_FALLBACK_MODELS)
const MEMORY_PRIMARY_MODEL = process.env.GEMINI_MEMORY_PRIMARY_MODEL?.trim() || CHAT_PRIMARY_MODEL
const MEMORY_FALLBACK_MODELS = (() => {
  const configured = parseModelList(process.env.GEMINI_MEMORY_FALLBACK_MODELS)
  return configured.length ? configured : CHAT_FALLBACK_MODELS
})()

export class AIQuotaExhaustedError extends Error {
  attemptedModels: string[]

  constructor(attemptedModels: string[]) {
    super('All configured AI models are quota-limited or rate-limited.')
    this.name = 'AIQuotaExhaustedError'
    this.attemptedModels = attemptedModels
  }
}

function parseModelList(raw?: string): string[] {
  if (!raw) return []

  return raw
    .split(',')
    .map(model => model.trim())
    .filter(Boolean)
}

function uniqueModels(models: string[]): string[] {
  return [...new Set(models.map(model => model.trim()).filter(Boolean))]
}

function getModelCandidates(kind: 'chat' | 'memory'): string[] {
  if (kind === 'memory') {
    return uniqueModels([MEMORY_PRIMARY_MODEL, ...MEMORY_FALLBACK_MODELS])
  }

  return uniqueModels([CHAT_PRIMARY_MODEL, ...CHAT_FALLBACK_MODELS])
}

function getErrorDetails(error: unknown): { status?: string; message: string } {
  if (!(error instanceof Error)) {
    return { message: String(error ?? '') }
  }

  const maybe = error as Error & {
    status?: number | string
    code?: number | string
    error?: {
      status?: number | string
      code?: number | string
      message?: string
    }
  }

  const nested = maybe.error
  const status = String(maybe.status ?? maybe.code ?? nested?.status ?? nested?.code ?? '')
  const message = `${maybe.message} ${nested?.message ?? ''}`.trim()
  return { status: status || undefined, message }
}

function isQuotaOrRateLimitError(error: unknown): boolean {
  const details = getErrorDetails(error)
  const status = details.status?.toUpperCase()
  const message = details.message.toLowerCase()

  if (status === '429' || status === '8' || status === 'RESOURCE_EXHAUSTED' || status === 'RATE_LIMIT_EXCEEDED') {
    return true
  }

  return (
    message.includes('quota') ||
    message.includes('resource exhausted') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  )
}

async function generateContentWithModelFallback(
  kind: 'chat' | 'memory',
  request: Omit<GenerateContentInput, 'model'>
) {
  const models = getModelCandidates(kind)
  let lastError: unknown
  let sawQuotaError = false

  for (const model of models) {
    try {
      return await getAI().models.generateContent({ ...request, model })
    } catch (error) {
      lastError = error

      if (!isQuotaOrRateLimitError(error)) {
        throw error
      }

      sawQuotaError = true
      console.warn(`[AI fallback] ${kind} model "${model}" hit quota/rate limit; trying next model.`)
    }
  }

  if (sawQuotaError) {
    throw new AIQuotaExhaustedError(models)
  }

  throw lastError ?? new Error(`No model candidates configured for ${kind}.`)
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

interface JournalEntryData {
  content: string
  mood?: string | null
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

  const response = await generateContentWithModelFallback('memory', {
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

  const response = await generateContentWithModelFallback('chat', {
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

export async function generateJournalReflection(
  entries: JournalEntryData[],
  options?: {
    dateLabel?: string
    mood?: string
    previousSummary?: string
  }
): Promise<string> {
  const entryText = entries
    .map((entry, index) => {
      const moodLabel = entry.mood && entry.mood !== 'neutral' ? ` (mood: ${entry.mood})` : ''
      return `Entry ${index + 1}${moodLabel}: ${entry.content}`
    })
    .join('\n')

  const prompt = `You are a calm journaling companion helping someone reflect on their day.

Date: ${options?.dateLabel ?? 'Today'}
${options?.mood ? `Overall mood: ${options.mood}` : ''}
${options?.previousSummary ? `Earlier summary for this day:\n${options.previousSummary}\n` : ''}
Journal entries for this day:
${entryText}

Respond with:
- a warm reflection that helps them feel seen
- 1 gentle pattern or observation from just this day
- 1 thoughtful follow-up question

Keep it to 4 short sentences max. Do not sound clinical. Do not mention anything outside this day.`

  const response = await generateContentWithModelFallback('chat', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 220,
    },
  })

  return response.text ?? ''
}
