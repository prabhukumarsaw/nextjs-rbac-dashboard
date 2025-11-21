"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentOrganizationId, buildOrganizationFilter } from "./context";
import { isSuperadmin } from "./validation";

/**
 * Organization Role Management
 * Get roles that organizations can assign to users
 */

/**
 * Get assignable roles for current organization
 * Returns only roles that the organization can assign (not restricted, not from other orgs)
 */
export async function getAssignableRoles() {
  try {
    const isSuper = await isSuperadmin();
    const orgId = await getCurrentOrganizationId();

    if (isSuper) {
      // Superadmin can see all roles
      const roles = await prisma.role.findMany({
        where: { isActive: true },
        include: {
          permissions: {
            include: { permission: true },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return {
        success: true,
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          organizationId: role.organizationId,
          isGlobal: role.organizationId === null,
          permissionCount: role.permissions.length,
          userCount: role._count.users,
        })),
      };
    }

    if (!orgId) {
      return { success: false, error: "No organization context" };
    }

    // Regular organization: only their roles + global roles (except superadmin)
    const roles = await prisma.role.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: orgId },
          { 
            organizationId: null,
            slug: { not: "superadmin" }, // Exclude superadmin from assignable roles
          },
        ],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        organizationId: role.organizationId,
        isGlobal: role.organizationId === null,
        permissionCount: role.permissions.length,
        userCount: role._count.users,
      })),
    };
  } catch (error) {
    console.error("Get assignable roles error:", error);
    return { success: false, error: "Failed to fetch assignable roles" };
  }
}

/**
 * Get assignable permissions for current organization
 */
export async function getAssignablePermissions() {
  try {
    const isSuper = await isSuperadmin();
    const orgId = await getCurrentOrganizationId();

    if (isSuper) {
      // Superadmin can see all permissions
      const permissions = await prisma.permission.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { roles: true },
          },
        },
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      });

      return {
        success: true,
        permissions: permissions.map((perm) => ({
          id: perm.id,
          name: perm.name,
          slug: perm.slug,
          resource: perm.resource,
          action: perm.action,
          organizationId: perm.organizationId,
          isGlobal: perm.organizationId === null,
          roleCount: perm._count.roles,
        })),
      };
    }

    if (!orgId) {
      return { success: false, error: "No organization context" };
    }

    // Regular organization: only their permissions + global permissions (except restricted)
    const { RESTRICTED_PERMISSIONS } = await import("./constants");
    
    const permissions = await prisma.permission.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: orgId },
          { 
            organizationId: null,
            // Exclude restricted permissions
            slug: {
              not: {
                in: RESTRICTED_PERMISSIONS as any,
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: { roles: true },
        },
      },
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });

    return {
      success: true,
      permissions: permissions.map((perm) => ({
        id: perm.id,
        name: perm.name,
        slug: perm.slug,
        resource: perm.resource,
        action: perm.action,
        organizationId: perm.organizationId,
        isGlobal: perm.organizationId === null,
        roleCount: perm._count.roles,
      })),
    };
  } catch (error) {
    console.error("Get assignable permissions error:", error);
    return { success: false, error: "Failed to fetch assignable permissions" };
  }
}

