import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth/jwt";

/**
 * Audit Logging System
 * Tracks all user actions for compliance, security, and debugging
 */

export interface AuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 * @param data - Audit log data
 * @param userId - Optional user ID (if not provided, uses current user from JWT)
 */
export async function createAuditLog(
  data: AuditLogData,
  userId?: string
): Promise<void> {
  try {
    let finalUserId = userId;

    // If userId not provided, get from JWT token
    if (!finalUserId) {
      const user = await getCurrentUser();
      if (!user) {
        console.warn("Cannot create audit log: No user found");
        return;
      }
      finalUserId = user.userId;
    }

    await prisma.auditLog.create({
      data: {
        userId: finalUserId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Don't throw error - audit logging should not break the application
    // Use structured logging instead of console.error
    if (error instanceof Error) {
      console.error(JSON.stringify({
        level: "error",
        message: "Failed to create audit log",
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }));
    } else {
      console.error("Failed to create audit log:", error);
    }
  }
}

/**
 * Get audit logs with pagination
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param filters - Optional filters
 */
export async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters?.userId) {
    where.userId = filters.userId;
  }
  if (filters?.action) {
    where.action = filters.action;
  }
  if (filters?.resource) {
    where.resource = filters.resource;
  }
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

