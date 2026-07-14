// ============================================================================
// lib/auth.js
// NextAuth configuration + server-side session helpers.
//
// Auth strategy: credentials provider (no third-party account required).
// Roles: VIEWER | ANALYST | ADMIN — stored in JWT, verified on every request.
//
// Required env vars:
//   NEXTAUTH_SECRET=<openssl rand -base64 32>
//   NEXTAUTH_URL=https://your-app.vercel.app
//   ADMIN_EMAIL=admin@example.com
//   ADMIN_PASSWORD=<strong-password>
//   ANALYST_EMAIL=analyst@example.com
//   ANALYST_PASSWORD=<strong-password>
// ============================================================================

import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth/next';

/** @type {import('next-auth').NextAuthOptions} */
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'FraudGuard',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Check ADMIN credentials
        if (
          credentials.email    === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id:    'admin',
            email: process.env.ADMIN_EMAIL,
            name:  'Admin',
            role:  'ADMIN',
          };
        }

        // Check ANALYST credentials
        if (
          credentials.email    === process.env.ANALYST_EMAIL &&
          credentials.password === process.env.ANALYST_PASSWORD
        ) {
          return {
            id:    'analyst',
            email: process.env.ANALYST_EMAIL,
            name:  'Analyst',
            role:  'ANALYST',
          };
        }

        // Check VIEWER credentials (read-only dashboard access)
        if (
          credentials.email    === process.env.VIEWER_EMAIL &&
          credentials.password === process.env.VIEWER_PASSWORD
        ) {
          return {
            id:    'viewer',
            email: process.env.VIEWER_EMAIL,
            name:  'Viewer',
            role:  'VIEWER',
          };
        }

        return null; // Authentication failed
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id   = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id   = token.id;
      }
      return session;
    },
  },

  pages: {
    signIn:  '/login',
    error:   '/login',
  },

  session: {
    strategy:   'jwt',
    maxAge:     24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// ─── Server-side helpers ─────────────────────────────────────────────────────

/**
 * Get the current session in a Server Component or API route.
 * Returns null if not authenticated.
 *
 * @returns {Promise<import('next-auth').Session | null>}
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Require authentication and optionally a specific role in an API route.
 * Returns the session if authenticated, or throws a Response with 401/403.
 *
 * @param {string[]} [allowedRoles]  If omitted, any authenticated user is allowed.
 * @returns {Promise<import('next-auth').Session>}
 * @throws {Response}  401 if unauthenticated, 403 if insufficient role
 */
export async function requireAuth(allowedRoles = null) {
  const session = await getSession();

  if (!session?.user) {
    throw new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new Response(
      JSON.stringify({ error: `Requires role: ${allowedRoles.join(' or ')}` }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return session;
}

// Role constants for use across the app
export const ROLES = {
  VIEWER:  'VIEWER',
  ANALYST: 'ANALYST',
  ADMIN:   'ADMIN',
};

/**
 * Check if a role has at least analyst-level access.
 * @param {string} role
 */
export function isAnalystOrAbove(role) {
  return role === ROLES.ANALYST || role === ROLES.ADMIN;
}

/**
 * Check if a role has admin-level access.
 * @param {string} role
 */
export function isAdmin(role) {
  return role === ROLES.ADMIN;
}
