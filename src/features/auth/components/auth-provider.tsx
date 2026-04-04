'use client'

import { SessionProvider, useSession, signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ReactNode } from 'react'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  bio?: string
  avatar?: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  return {
    user: session?.user ?? null,
    loading: status === 'loading',
    logout: () => signOut({ callbackUrl: '/' }),
    refetch: async () => {},
  }
}

export function AuthProvider({
  children,
  session,
}: {
  children: ReactNode
  session: Session | null
}) {
  return <SessionProvider session={session ?? undefined}>{children}</SessionProvider>
}
