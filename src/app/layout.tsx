import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { getServerSession } from 'next-auth'
import './globals.css'
import { Providers } from '@/components/query-provider'
import { AuthProvider } from '@/features/auth/components/auth-provider'
import { Navbar } from '@/components/navbar'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Closer — AI Companions',
  description: 'Find your perfect AI companion. Meaningful conversations, emotional intelligence, and genuine connection.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider session={session}>
          <Providers>
            <PageViewTracker />
            <Navbar />
            <main className="pt-16">{children}</main>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
