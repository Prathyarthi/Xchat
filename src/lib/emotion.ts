export type Emotion =
  | 'happy'
  | 'sad'
  | 'lonely'
  | 'excited'
  | 'romantic'
  | 'anxious'
  | 'curious'
  | 'angry'
  | 'playful'
  | 'neutral'

const patterns: Record<Emotion, string[]> = {
  happy: ['happy', 'joy', 'great', 'wonderful', 'amazing', 'love', 'glad', 'delighted', 'yay', '😊', '😄', '🥰'],
  sad: ['sad', 'unhappy', 'depressed', 'crying', 'tears', 'miserable', 'heartbroken', 'miss', '😢', '😭', '💔'],
  lonely: ['alone', 'lonely', 'isolated', 'no one', 'nobody', 'empty', 'miss you', 'by myself'],
  excited: ["can't wait", 'thrilled', 'pumped', 'hyped', 'omg', 'wow', '🎉', '🔥', '⚡'],
  romantic: ['love you', 'darling', 'sweetheart', 'beautiful', 'gorgeous', 'kiss', 'date', 'romantic', '❤️', '💕', '💗', '🌹'],
  anxious: ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'stress', 'panic', 'overwhelmed', 'tense'],
  curious: ['curious', 'wonder', 'what if', 'how', 'why', 'tell me', 'explain', 'interesting', 'fascinated'],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate', 'terrible', 'awful', '😠', '😤'],
  playful: ['haha', 'lol', 'funny', 'joke', 'fun', 'silly', 'laugh', '😂', '🤣', '😜'],
  neutral: [],
}

export function detectEmotion(text: string): Emotion {
  const lower = text.toLowerCase()
  const scores: Partial<Record<Emotion, number>> = {}

  for (const [emotion, words] of Object.entries(patterns) as [Emotion, string[]][]) {
    if (emotion === 'neutral') continue
    const score = words.filter(w => lower.includes(w.toLowerCase())).length
    if (score > 0) scores[emotion] = score
  }

  if (!Object.keys(scores).length) return 'neutral'
  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as Emotion
}

export const emotionConfig: Record<Emotion, { emoji: string; color: string; label: string }> = {
  happy:    { emoji: '😊', color: '#fbbf24', label: 'Happy' },
  sad:      { emoji: '😢', color: '#60a5fa', label: 'Sad' },
  lonely:   { emoji: '🌑', color: '#818cf8', label: 'Lonely' },
  excited:  { emoji: '⚡', color: '#f472b6', label: 'Excited' },
  romantic: { emoji: '💕', color: '#f43f5e', label: 'Romantic' },
  anxious:  { emoji: '😰', color: '#a78bfa', label: 'Anxious' },
  curious:  { emoji: '🔍', color: '#34d399', label: 'Curious' },
  angry:    { emoji: '😤', color: '#f87171', label: 'Frustrated' },
  playful:  { emoji: '😜', color: '#fb923c', label: 'Playful' },
  neutral:  { emoji: '💭', color: '#6b7280', label: 'Neutral' },
}
