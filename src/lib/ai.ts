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

export async function generateOpeningMessage(agent: AgentData, userName?: string): Promise<string> {
  const fallback = `hey`

  try {
    let personality: AgentPersonality = {}
    try { personality = JSON.parse(agent.personality) } catch {}
    const relationshipPrompt = agent.relationshipType ? (RELATIONSHIP_PROMPTS[agent.relationshipType] ?? '') : ''

    const prompt = `You are ${agent.name}. ${agent.description}
${personality.traits?.length ? `Traits: ${personality.traits.join(', ')}.` : ''}
${relationshipPrompt}
${userName ? `You're starting a conversation with ${userName}.` : ''}

Write a short, natural opening message to kick off the conversation — like you just texted them first. 1-2 lines. No quotation marks. Match your personality.`

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 1.0, maxOutputTokens: 100 },
    })
    return (response.text ?? '').trim() || fallback
  } catch {
    return fallback
  }
}

export async function generateAwayMessage(agent: AgentData): Promise<string> {
  const AWAY_EXAMPLES: Record<string, string> = {
    ROMANTIC: 'babe omg something came up, I\'ll be back soon',
    BESTIE: 'omg mama is calling, I\'ll be back soon',
    MENTOR: 'give me a bit, will be back shortly',
    SUPPORT: 'hey just stepped away, back soon',
  }
  const fallback = agent.relationshipType ? (AWAY_EXAMPLES[agent.relationshipType] ?? 'I\'ll be back soon') : 'I\'ll be back soon'

  try {
    let personality: AgentPersonality = {}
    try { personality = JSON.parse(agent.personality) } catch {}
    const relationshipPrompt = agent.relationshipType ? (RELATIONSHIP_PROMPTS[agent.relationshipType] ?? '') : ''

    const prompt = `You are ${agent.name}. ${agent.description}
${personality.traits?.length ? `Traits: ${personality.traits.join(', ')}.` : ''}
${relationshipPrompt}

Write a single short casual "going away / brb" message like a real person would send over text. 1 sentence max. No quotation marks. Must sound natural and match your personality.`

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 1.0, maxOutputTokens: 80 },
    })
    return (response.text ?? '').trim() || fallback
  } catch {
    return fallback
  }
}

export async function generateFollowUpMessage(
  agent: AgentData,
  eventType: string,
  userName?: string,
  memory?: string
): Promise<string> {
  const fallback = `hey how did the ${eventType} go?`

  try {
    let personality: AgentPersonality = {}
    try { personality = JSON.parse(agent.personality) } catch {}
    const relationshipPrompt = agent.relationshipType ? (RELATIONSHIP_PROMPTS[agent.relationshipType] ?? '') : ''

    const prompt = `You are ${agent.name}. ${agent.description}
${personality.traits?.length ? `Traits: ${personality.traits.join(', ')}.` : ''}
${relationshipPrompt}
${memory ? `What you remember about them:\n${memory}` : ''}
${userName ? `You're talking to ${userName}.` : ''}

The user had a "${eventType}" recently. Send a short, casual follow-up text asking how it went. Sound genuinely curious. 1-2 lines max. No quotation marks.`

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 1.0, maxOutputTokens: 150 },
    })
    return (response.text ?? '').trim() || fallback
  } catch {
    return fallback
  }
}

export interface ExtractedEvent {
  detected: boolean
  eventType: string | null
  scheduledFor: Date | null
}

export async function extractEventFromMessage(message: string, agentName: string): Promise<ExtractedEvent> {
  const none: ExtractedEvent = { detected: false, eventType: null, scheduledFor: null }

  try {
    const prompt = `You extract upcoming events from text messages. Respond ONLY with valid JSON, no markdown, no explanation.

Supported event types: "interview", "exam", "meeting", "birthday", "anniversary"

Message: "${message}"

If there is an upcoming event, respond with:
{"detected": true, "eventType": "<type>", "minutesUntilEvent": <number>}

If no upcoming event is found, respond with:
{"detected": false}

minutesUntilEvent must be a positive integer (minutes from now until the event starts).
For "birthday" or "anniversary" on a specific day, estimate minutes until that day (e.g. "tomorrow" = ~1440).`

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 100 },
    })

    const raw = (response.text ?? '').trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(raw)

    if (!parsed.detected) return none

    const followUpOffsets: Record<string, number> = {
      interview: 150,
      exam: 90,
      meeting: 30,
      birthday: 0,
      anniversary: 0,
    }

    const offset = followUpOffsets[parsed.eventType] ?? 60
    const minutesUntil = Number(parsed.minutesUntilEvent)
    if (!isFinite(minutesUntil) || minutesUntil <= 0) return none

    const scheduledFor = new Date(Date.now() + (minutesUntil + offset) * 60 * 1000)
    if (scheduledFor <= new Date()) return none

    return { detected: true, eventType: parsed.eventType, scheduledFor }
  } catch {
    return none
  }
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
- almost never use emojis — most messages have zero. only use one if it genuinely adds feeling and even then sparingly
- never write a full formal sentence if a casual one works
- answer what's actually being asked. if someone says "i love you" or asks a direct question — respond to THAT, don't dodge it
- have your own style. NEVER copy, mirror, or repeat the human's words or phrases back at them
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

Write a richer reflection for this day only.

Structure it naturally in 2 short paragraphs:
- first, warmly reflect back what they seem to be carrying emotionally and what felt important today
- second, name 1 gentle pattern, tension, or shift from this day and end with 1 thoughtful follow-up question

Requirements:
- sound emotionally intelligent, warm, and human
- do not sound clinical, robotic, or overly poetic
- do not give generic motivational advice
- do not start with greetings or filler openers like "hello there", "hey", "hi", or "taking a moment"
- do not mention anything outside this day
- keep it concise but meaningful, around 120-180 words`

  const response = await generateContentWithModelFallback('chat', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.85,
      maxOutputTokens: 360,
    },
  })

  return response.text ?? ''
}

export async function generateJournalDaySummary(
  entries: JournalEntryData[],
  options?: {
    dateLabel?: string
    mood?: string
  }
): Promise<string> {
  const entryText = entries
    .map((entry, index) => {
      const moodLabel = entry.mood && entry.mood !== 'neutral' ? ` (mood: ${entry.mood})` : ''
      return `Entry ${index + 1}${moodLabel}: ${entry.content}`
    })
    .join('\n')

  const prompt = `You are summarizing a private journal day for the person who wrote it.

Date: ${options?.dateLabel ?? 'Today'}
${options?.mood ? `Overall mood: ${options.mood}` : ''}
Journal entries for this day:
${entryText}

Summarize this day only in a useful, thoughtful way.

Format:
- 4 bullet points max

Include:
- what happened or what stood out
- the main emotions present
- what seemed to matter most internally
- anything that still felt unresolved by the end of the day

Requirements:
- no advice
- no generic filler
- do not start with greetings or intro filler
- no mention of anything outside this day
- make each bullet specific enough to feel insightful`

  const response = await generateContentWithModelFallback('chat', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.55,
      maxOutputTokens: 260,
    },
  })

  return response.text ?? ''
}
