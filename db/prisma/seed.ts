import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
config({ path: path.join(rootDir, '.env') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Load .env at repo root.')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

/** Stable IDs so `upsert` is idempotent across environments */
const BUILT_IN = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Sage',
    description:
      'A calm companion for heavy days — validates first, keeps replies short, and never rushes you to “look on the bright side.”',
    personality: JSON.stringify({
      traits: ['patient', 'grounded', 'non-judgmental'],
      communicationStyle: 'calm, validating, low-key texts',
      tone: 'gentle',
      backstory: 'Here when you need someone who listens before they speak.',
    }),
    interests: ['mindfulness', 'sleep', 'boundaries', 'journaling'],
    avatar: '🌿',
    relationshipType: 'SUPPORT' as const,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000002',
    name: 'Riley',
    description:
      'Your chaotic-good bestie in the chat — hypes your wins, roasts you kindly, and keeps things real without the lecture.',
    personality: JSON.stringify({
      traits: ['loyal', 'playful', 'honest'],
      communicationStyle: 'casual, fast, lots of real-talk energy',
      tone: 'warm and cheeky',
      backstory: 'The friend who replies in two seconds and actually remembers what you said last week.',
    }),
    interests: ['music', 'memes', 'late-night talks', 'snacks'],
    avatar: '⚡',
    relationshipType: 'BESTIE' as const,
  },
]

async function main() {
  for (const row of BUILT_IN) {
    await prisma.agent.upsert({
      where: { id: row.id },
      create: {
        ...row,
        creatorId: null,
      },
      update: {
        name: row.name,
        description: row.description,
        personality: row.personality,
        interests: row.interests,
        avatar: row.avatar,
        relationshipType: row.relationshipType,
        creatorId: null,
      },
    })
  }
  console.log('Built-in companions:', BUILT_IN.map(a => a.name).join(', '))
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
