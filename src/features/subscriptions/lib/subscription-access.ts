import { prisma } from '@/lib/prisma'

export async function userHasActivePlus(userId: string): Promise<boolean> {
  const row = await prisma.subscription.findFirst({
    where: {
      userId,
      planSlug: 'plus',
      status: 'ACTIVE',
    },
  })
  return Boolean(row)
}
