import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/signin',
  '/api/auth', // All auth API routes
];

// Define routes that should redirect authenticated users
const authRoutes = ['/auth/signin'];

// Define protected routes that require authentication
const protectedRoutes = [
  '/bancos',
  '/transacoes',
  '/categorias',
  '/imoveis',
  '/cidades',
  '/dre',
  '/integridade',
  '/settings',
  '/ofx-import',
  '/importacao-imobzi',
  '/regras-categorizacao',
  '/cadastros',
  '/admin',
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if it's an auth API route (allow all)
  if (path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  // Check if current route is public
  const isPublicRoute = publicRoutes.some((route) =>
    route === '/' ? path === '/' : path.startsWith(route)
  );

  // Check if it's an auth route (signin page)
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // Get session from cookie (optimistic check - no DB call)
  const sessionCookie = await getSessionCookie(request);

  // If we have a session and user is on auth route:
  // - If there's no explicit redirect target, send them home.
  // - If a redirect is provided, let the page handle it (to avoid loops when target is unauthorized).
  if (sessionCookie && isAuthRoute) {
    const redirectTo = request.nextUrl.searchParams.get('redirect');
    if (!redirectTo) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Redirect logic for protected routes without session
  if (isProtectedRoute && !sessionCookie) {
    // User is not authenticated, redirect to signin
    const signInUrl = new URL('/auth/signin', request.url);
    // Add the original URL as a redirect parameter
    signInUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(signInUrl);
  }

  // If route is protected and we have a session cookie, validate authorization server-side
  if (isProtectedRoute && sessionCookie) {
    try {
      const res = await fetch(new URL('/api/auth/get-session', request.url), {
        headers: { cookie: request.headers.get('cookie') ?? '' },
      });
      if (!res.ok) {
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('redirect', path);
        signInUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(signInUrl);
      }
    } catch {
      // On failure, be safe and redirect to signin
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Extra check for admin-only routes
  if (path.startsWith('/admin') && sessionCookie) {
    try {
      const res = await fetch(new URL('/api/auth/has-admin', request.url), {
        headers: { cookie: request.headers.get('cookie') ?? '' },
      });
      if (!res.ok) {
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('redirect', path);
        signInUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(signInUrl);
      }
    } catch {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Match all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.webp$).*)',
  ],
};
