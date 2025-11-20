"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Server Actions for Permission Management
 * Handles CRUD operations for permissions
 */

const createPermissionSchema = z.object({
  name: z.string().min(1, "Permission name is required"),
  slug: z.string().min(1, "Permission slug is required"),
  description: z.string().optional(),
  resource: z.string().min(1, "Resource is required"),
  action: z.string().min(1, "Action is required"),
  isActive: z.boolean().default(true),
});

const updatePermissionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  resource: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Create a new permission
 */
export async function createPermission(data: z.infer<typeof createPermissionSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "permission.create");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to create permissions" };
    }

    const validated = createPermissionSchema.parse(data);

    // Check if slug already exists
    const existing = await prisma.permission.findUnique({
      where: { slug: validated.slug },
    });
    if (existing) {
      return { success: false, error: "Permission slug already exists" };
    }

    const permission = await prisma.permission.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        resource: validated.resource,
        action: validated.action,
        isActive: validated.isActive,
      },
    });

    await createAuditLog({
      action: "CREATE_PERMISSION",
      resource: "Permission",
      resourceId: permission.id,
      description: `User ${currentUser.email} created permission ${permission.name}`,
    });

    revalidatePath("/dashboard/permissions");

    return { success: true, permission };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Create permission error:", error);
    return { success: false, error: "Failed to create permission" };
  }
}

/**
 * Update an existing permission
 */
export async function updatePermission(data: z.infer<typeof updatePermissionSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "permission.update");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to update permissions" };
    }

    const validated = updatePermissionSchema.parse(data);

    const existingPermission = await prisma.permission.findUnique({
      where: { id: validated.id },
    });
    if (!existingPermission) {
      return { success: false, error: "Permission not found" };
    }

    // Check slug uniqueness if changing
    if (validated.slug && validated.slug !== existingPermission.slug) {
      const slugExists = await prisma.permission.findUnique({
        where: { slug: validated.slug },
      });
      if (slugExists) {
        return { success: false, error: "Permission slug already exists" };
      }
    }

    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.slug) updateData.slug = validated.slug;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.resource) updateData.resource = validated.resource;
    if (validated.action) updateData.action = validated.action;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const permission = await prisma.permission.update({
      where: { id: validated.id },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE_PERMISSION",
      resource: "Permission",
      resourceId: permission.id,
      description: `User ${currentUser.email} updated permission ${permission.name}`,
    });

    revalidatePath("/dashboard/permissions");

    return { success: true, permission };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Update permission error:", error);
    return { success: false, error: "Failed to update permission" };
  }
}

/**
 * Delete a permission
 */
export async function deletePermission(permissionId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "permission.delete");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to delete permissions" };
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return { success: false, error: "Permission not found" };
    }

    await prisma.permission.delete({
      where: { id: permissionId },
    });

    await createAuditLog({
      action: "DELETE_PERMISSION",
      resource: "Permission",
      resourceId: permissionId,
      description: `User ${currentUser.email} deleted permission ${permission.name}`,
    });

    revalidatePath("/dashboard/permissions");

    return { success: true };
  } catch (error) {
    console.error("Delete permission error:", error);
    return { success: false, error: "Failed to delete permission" };
  }
}

/**
 * Get all permissions
 */
export async function getPermissions() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "permission.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view permissions" };
    }

    const permissions = await prisma.permission.findMany({
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
      orderBy: [
        { resource: "asc" },
        { action: "asc" },
      ],
    });

    return {
      success: true,
      permissions: permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        isActive: permission.isActive,
        roleCount: permission._count.roles,
        createdAt: permission.createdAt,
      })),
    };
  } catch (error) {
    console.error("Get permissions error:", error);
    return { success: false, error: "Failed to fetch permissions" };
  }
}

/**
 * Get single permission by ID
 */
export async function getPermissionById(permissionId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "permission.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view permissions" };
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return { success: false, error: "Permission not found" };
    }

    return {
      success: true,
      permission: {
        id: permission.id,
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        isActive: permission.isActive,
      },
    };
  } catch (error) {
    console.error("Get permission error:", error);
    return { success: false, error: "Failed to fetch permission" };
  }
}

/**
 * Get permissions grouped by resource
 */
export async function getPermissionsByResource() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "permission.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view permissions" };
    }

    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [
        { resource: "asc" },
        { action: "asc" },
      ],
    });

    // Group by resource
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return { success: true, grouped };
  } catch (error) {
    console.error("Get permissions by resource error:", error);
    return { success: false, error: "Failed to fetch permissions" };
  }
}

