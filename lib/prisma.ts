import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/config/env";

/**
 * Prisma Client Singleton
 * Prevents multiple instances of Prisma Client in development
 * Uses globalThis to persist across hot reloads
 * 
 * Production optimizations:
 * - Connection pooling configured via DATABASE_URL
 * - Query logging disabled in production
 * - Error handling for connection issues
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Connection pool configuration (set via DATABASE_URL query params)
    // Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
    // For query timeouts, configure at database level or use connection string parameters
    // Example: postgresql://user:pass@host:5432/db?connect_timeout=10&statement_timeout=10000
  });

// Monitor slow queries in development
if (env.NODE_ENV === "development") {
  prisma.$use(async (params, next) => {
    const startTime = Date.now();
    const result = await next(params);
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      // Log slow queries (> 1 second in development)
      console.warn(
        `⚠️  Slow query: ${params.model}.${params.action} took ${duration}ms`
      );
    }
    
    return result;
  });
}

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Graceful shutdown handler
 * Closes database connections on process termination
 */
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
