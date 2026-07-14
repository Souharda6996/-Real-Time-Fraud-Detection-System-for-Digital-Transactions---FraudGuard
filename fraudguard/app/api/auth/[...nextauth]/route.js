// ============================================================================
// app/api/auth/[...nextauth]/route.js
// NextAuth.js catch-all route handler for App Router.
// Node.js runtime (not Edge) — NextAuth v4 requires Node.js crypto APIs.
// ============================================================================

import NextAuth from 'next-auth';
import { authOptions } from '../../../../lib/auth.js';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
