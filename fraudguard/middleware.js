// ============================================================================
// middleware.js
// Next.js Edge Middleware — protects /dashboard routes with NextAuth.
//
// Runs on Vercel Edge before every /dashboard request.
// Unauthenticated users are redirected to /login.
// ============================================================================

export { default } from 'next-auth/middleware';

export const config = {
  // Protect all dashboard routes. Login page and API are excluded.
  matcher: ['/dashboard/:path*'],
};
