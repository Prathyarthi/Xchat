'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/components/auth-provider'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TrackedLink } from '@/components/analytics/tracked-link'

export function Navbar() {
  const { user, logout, loading } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/pricing', label: 'Subscribe' },
    ...(user
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/journal', label: 'Journal' },
          ...(user.role === 'ADMIN' ? [{ href: '/analytics', label: 'Analytics' }] : []),
        ]
      : []),
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/6">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold gradient-text tracking-wider">Closr</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/8">
            AI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${
                pathname.startsWith(link.href)
                  ? 'text-zinc-200 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
                <span className="w-8 h-8 rounded-full bg-zinc-800 border border-white/8 flex items-center justify-center text-sm font-bold">
                  {user.avatar || user.name[0].toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{user.name}</span>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="border-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-full">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-full">
                <TrackedLink href="/sign-in" eventName="sign_in_cta_clicked">Sign in</TrackedLink>
              </Button>
              <Button size="sm" asChild className="rounded-full">
                <TrackedLink href="/sign-up" eventName="sign_up_cta_clicked">Get Started</TrackedLink>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-zinc-500 hover:text-zinc-200"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <path d="M18 6L6 18M6 6l12 12" />
              : <path d="M3 12h18M3 6h18M3 18h18" />
            }
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden glass border-t border-white/6 px-4 py-4 flex flex-col gap-3">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 hover:text-zinc-200 py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/profile" className="text-sm text-zinc-400 py-2" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="border-white/8 text-zinc-400 w-full rounded-full">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-zinc-400 py-2" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Button size="sm" asChild className="w-full rounded-full" onClick={() => setMenuOpen(false)}>
                <TrackedLink href="/sign-up" eventName="sign_up_cta_clicked">Get Started</TrackedLink>
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
