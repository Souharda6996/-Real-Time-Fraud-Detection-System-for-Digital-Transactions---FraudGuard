// ============================================================================
// prisma/prisma.config.ts
// Prisma v7 configuration: connection URL goes here, not in schema.prisma.
// ============================================================================

import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
});
