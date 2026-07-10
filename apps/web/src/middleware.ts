import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

const publicPrefixes = ['/login', '/register', '/privacy', '/api/auth'];

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default auth((req) => {
  if (LOCAL_MODE) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    const dest = req.auth?.user?.isSuperAdmin ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  // Super admins use the platform console — skip company onboarding
  if (
    isAuthenticated &&
    req.auth?.user?.isSuperAdmin &&
    (pathname === '/dashboard' || pathname.startsWith('/onboarding'))
  ) {
    return NextResponse.redirect(new URL('/admin', req.nextUrl.origin));
  }

  if (pathname.startsWith('/admin') && isAuthenticated && !req.auth?.user?.isSuperAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads|api/v1|api/pdf/file).*)'],
};
