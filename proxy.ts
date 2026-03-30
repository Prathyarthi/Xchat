import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const protectedRoutes = ['/explore', '/chat', '/agents/create', '/profile']
const authRoutes = ['/sign-in', '/sign-up']

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl
    const isLoggedIn = !!req.nextauth.token

    if (authRoutes.some(r => pathname.startsWith(r)) && isLoggedIn) {
      return NextResponse.redirect(new URL('/explore', req.url))
    }
  },
  {
    pages: { signIn: '/sign-in' },
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        if (protectedRoutes.some(r => pathname.startsWith(r))) return !!token
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
