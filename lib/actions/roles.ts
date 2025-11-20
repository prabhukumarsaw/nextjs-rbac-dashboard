"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Server Actions for Role Management
 * Handles CRUD operations for roles with permission checks
 */

const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  slug: z.string().min(1, "Role slug is required"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  menuIds: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  menuIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Create a new role
 */
export async function createRole(data: z.infer<typeof createRoleSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "role.create");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to create roles" };
    }

    const validated = createRoleSchema.parse(data);

    // Check if slug already exists
    const existing = await prisma.role.findUnique({
      where: { slug: validated.slug },
    });
    if (existing) {
      return { success: false, error: "Role slug already exists" };
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        isActive: validated.isActive,
      },
    });

    // Assign permissions
    if (validated.permissionIds && validated.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: validated.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    // Assign menus
    if (validated.menuIds && validated.menuIds.length > 0) {
      await prisma.roleMenu.createMany({
        data: validated.menuIds.map((menuId) => ({
          roleId: role.id,
          menuId,
        })),
      });
    }

    await createAuditLog({
      action: "CREATE_ROLE",
      resource: "Role",
      resourceId: role.id,
      description: `User ${currentUser.email} created role ${role.name}`,
      metadata: {
        permissions: validated.permissionIds,
        menus: validated.menuIds,
      },
    });

    revalidatePath("/dashboard/roles");

    return { success: true, role };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Create role error:", error);
    return { success: false, error: "Failed to create role" };
  }
}

/**
 * Update an existing role
 */
export async function updateRole(data: z.infer<typeof updateRoleSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "role.update");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to update roles" };
    }

    const validated = updateRoleSchema.parse(data);

    const existingRole = await prisma.role.findUnique({
      where: { id: validated.id },
    });
    if (!existingRole) {
      return { success: false, error: "Role not found" };
    }

    // Check slug uniqueness if changing
    if (validated.slug && validated.slug !== existingRole.slug) {
      const slugExists = await prisma.role.findUnique({
        where: { slug: validated.slug },
      });
      if (slugExists) {
        return { success: false, error: "Role slug already exists" };
      }
    }

    // Update role
    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.slug) updateData.slug = validated.slug;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const role = await prisma.role.update({
      where: { id: validated.id },
      data: updateData,
    });

    // Update permissions if provided
    if (validated.permissionIds) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: validated.id },
      });

      if (validated.permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: validated.permissionIds.map((permissionId) => ({
            roleId: validated.id,
            permissionId,
          })),
        });
      }
    }

    // Update menus if provided
    if (validated.menuIds) {
      await prisma.roleMenu.deleteMany({
        where: { roleId: validated.id },
      });

      if (validated.menuIds.length > 0) {
        await prisma.roleMenu.createMany({
          data: validated.menuIds.map((menuId) => ({
            roleId: validated.id,
            menuId,
          })),
        });
      }
    }

    await createAuditLog({
      action: "UPDATE_ROLE",
      resource: "Role",
      resourceId: role.id,
      description: `User ${currentUser.email} updated role ${role.name}`,
    });

    revalidatePath("/dashboard/roles");

    return { success: true, role };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Update role error:", error);
    return { success: false, error: "Failed to update role" };
  }
}

/**
 * Delete a role
 */
export async function deleteRole(roleId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "role.delete");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to delete roles" };
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return { success: false, error: "Role not found" };
    }

    // Prevent deletion of superadmin role
    if (role.slug === "superadmin") {
      return { success: false, error: "Cannot delete superadmin role" };
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    await createAuditLog({
      action: "DELETE_ROLE",
      resource: "Role",
      resourceId: roleId,
      description: `User ${currentUser.email} deleted role ${role.name}`,
    });

    revalidatePath("/dashboard/roles");

    return { success: true };
  } catch (error) {
    console.error("Delete role error:", error);
    return { success: false, error: "Failed to delete role" };
  }
}

/**
 * Get all roles
 */
export async function getRoles() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "role.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view roles" };
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        menus: {
          include: {
            menu: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isActive: role.isActive,
        permissions: role.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          slug: rp.permission.slug,
        })),
        menus: role.menus.map((rm) => ({
          id: rm.menu.id,
          name: rm.menu.name,
          slug: rm.menu.slug,
        })),
        userCount: role._count.users,
        createdAt: role.createdAt,
      })),
    };
  } catch (error) {
    console.error("Get roles error:", error);
    return { success: false, error: "Failed to fetch roles" };
  }
}

/**
 * Get single role by ID
 */
export async function getRoleById(roleId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "role.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view roles" };
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        menus: {
          include: {
            menu: true,
          },
        },
      },
    });

    if (!role) {
      return { success: false, error: "Role not found" };
    }

    return {
      success: true,
      role: {
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isActive: role.isActive,
        permissionIds: role.permissions.map((rp) => rp.permission.id),
        menuIds: role.menus.map((rm) => rm.menu.id),
      },
    };
  } catch (error) {
    console.error("Get role error:", error);
    return { success: false, error: "Failed to fetch role" };
  }
}

