import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/query-provider'
import { AuthProvider } from '@/features/auth/components/auth-provider'
import { Navbar } from '@/components/navbar'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Closr — AI Companions',
  description: 'Find your perfect AI companion. Meaningful conversations, emotional intelligence, and genuine connection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <AuthProvider>
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
