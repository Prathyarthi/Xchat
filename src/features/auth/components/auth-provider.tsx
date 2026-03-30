'use client'

import { SessionProvider, useSession, signOut } from 'next-auth/react'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
