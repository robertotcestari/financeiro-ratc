import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/auth/signin",
  "/api/auth", // All auth API routes
];

// Define routes that should redirect authenticated users
const authRoutes = [
  "/auth/signin",
];

// Define protected routes that require authentication
const protectedRoutes = [
  "/bancos",
  "/transacoes",
  "/categorias",
  "/imoveis",
  "/cidades",
  "/dre",
  "/integridade",
  "/settings",
  "/ofx-import",
  "/importacao-imobzi",
  "/regras-categorizacao",
  "/cadastros",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if it's an auth API route (allow all)
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    path.startsWith(route)
  );
  
  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => 
    route === "/" ? path === "/" : path.startsWith(route)
  );
  
  // Check if it's an auth route (signin page)
  const isAuthRoute = authRoutes.some(route => 
    path.startsWith(route)
  );

  // Get session from cookie (optimistic check - no DB call)
  const sessionCookie = await getSessionCookie(request);
  
  // If we have a session and user is on auth route, redirect to home
  if (sessionCookie && isAuthRoute) {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  
  // Redirect logic for protected routes without session
  if (isProtectedRoute && !sessionCookie) {
    // User is not authenticated, redirect to signin
    const signInUrl = new URL("/auth/signin", request.url);
    // Add the original URL as a redirect parameter
    signInUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.webp$).*)",
  ],
};