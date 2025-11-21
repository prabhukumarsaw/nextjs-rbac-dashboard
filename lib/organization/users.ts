"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { getCurrentOrganizationId, hasOrganizationAccess } from "./context";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateRoleAssignment, shouldAuditRoleAssignment } from "./validation";
import { generatePassword } from "@/lib/utils";
import { emailSchema, usernameSchema } from "@/lib/security/validation";

/**
 * Organization User Management Actions
 * Organizations can add users and assign roles/permissions within their organization
 * Only superadmin can create roles/permissions/menus
 */

const addUserToOrganizationSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8).optional(),
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
});

const assignRolesToUserSchema = z.object({
  userId: z.string(),
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
});

/**
 * Add a new user to the current organization
 * Creates user if doesn't exist, or adds existing user to organization
 */
export async function addUserToOrganization(
  data: z.infer<typeof addUserToOrganizationSchema>
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get organization context
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return { success: false, error: "No organization context" };
    }

    // Check if user has access to this organization
    const hasAccess = await hasOrganizationAccess(currentUser.userId, orgId);
    if (!hasAccess) {
      return { success: false, error: "You don't have access to this organization" };
    }

    // Validate input
    const validated = addUserToOrganizationSchema.parse(data);

    // Validate role assignment (check for restricted roles)
    const roleValidation = await validateRoleAssignment(validated.roleIds);
    if (!roleValidation.valid) {
      return { success: false, error: roleValidation.error };
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      // Create new user
      const password = validated.password || generatePassword(12);
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: {
          email: validated.email,
          username: validated.username,
          password: hashedPassword,
          firstName: validated.firstName,
          lastName: validated.lastName,
          isActive: true,
          provider: "credentials",
        },
      });
    }

    // Add user to organization (if not already added)
    const userOrg = await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
      update: {
        isActive: true, // Reactivate if was deactivated
      },
      create: {
        userId: user.id,
        organizationId: orgId,
        isActive: true,
      },
    });

    // Assign roles to user in this organization
    // First, remove existing roles in this organization
    await prisma.userRole.deleteMany({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
    });

    // Get roles with their organization IDs
    const roles = await prisma.role.findMany({
      where: {
        id: { in: validated.roleIds },
        organizationId: orgId, // Only roles from this organization
      },
    });

    if (roles.length !== validated.roleIds.length) {
      return {
        success: false,
        error: "Some roles are invalid or belong to another organization",
      };
    }

    // Create user roles
    await prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId: user!.id,
        roleId: role.id,
        organizationId: orgId,
      })),
      skipDuplicates: true,
    });

    // Audit log (especially for privileged roles)
    const auditPromises = roles.map(async (role) => {
      const shouldAudit = await shouldAuditRoleAssignment(role.id);
      if (shouldAudit) {
        await createAuditLog({
          action: "ASSIGN_PRIVILEGED_ROLE",
          resource: "UserRole",
          resourceId: user!.id,
          description: `Privileged role "${role.name}" assigned to user ${user!.email} in organization`,
          organizationId: orgId,
          metadata: {
            userId: user!.id,
            roleId: role.id,
            roleSlug: role.slug,
          },
        });
      }
    });
    await Promise.all(auditPromises);

    await createAuditLog({
      action: "ADD_USER_TO_ORGANIZATION",
      resource: "UserOrganization",
      resourceId: user.id,
      description: `User ${currentUser.email} added user ${user.email} to organization`,
      organizationId: orgId,
      metadata: {
        userId: user.id,
        roleIds: validated.roleIds,
      },
    });

    revalidatePath("/dashboard/organization/users");

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      password: validated.password ? undefined : password, // Return generated password if not provided
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Add user to organization error:", error);
    return { success: false, error: "Failed to add user to organization" };
  }
}

/**
 * Assign roles to an existing user in the organization
 */
export async function assignRolesToUserInOrganization(
  data: z.infer<typeof assignRolesToUserSchema>
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get organization context
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return { success: false, error: "No organization context" };
    }

    // Check if user has access to this organization
    const hasAccess = await hasOrganizationAccess(currentUser.userId, orgId);
    if (!hasAccess) {
      return { success: false, error: "You don't have access to this organization" };
    }

    // Validate input
    const validated = assignRolesToUserSchema.parse(data);

    // Check if user exists and is in organization
    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: validated.userId,
          organizationId: orgId,
        },
        isActive: true,
      },
    });

    if (!userOrg) {
      return {
        success: false,
        error: "User is not a member of this organization",
      };
    }

    // Validate role assignment
    const roleValidation = await validateRoleAssignment(validated.roleIds);
    if (!roleValidation.valid) {
      return { success: false, error: roleValidation.error };
    }

    // Get roles with their organization IDs
    const roles = await prisma.role.findMany({
      where: {
        id: { in: validated.roleIds },
        organizationId: orgId,
      },
    });

    if (roles.length !== validated.roleIds.length) {
      return {
        success: false,
        error: "Some roles are invalid or belong to another organization",
      };
    }

    // Remove existing roles in this organization
    await prisma.userRole.deleteMany({
      where: {
        userId: validated.userId,
        organizationId: orgId,
      },
    });

    // Assign new roles
    await prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId: validated.userId,
        roleId: role.id,
        organizationId: orgId,
      })),
    });

    // Audit log for privileged roles
    const auditPromises = roles.map(async (role) => {
      const shouldAudit = await shouldAuditRoleAssignment(role.id);
      if (shouldAudit) {
        await createAuditLog({
          action: "ASSIGN_PRIVILEGED_ROLE",
          resource: "UserRole",
          resourceId: validated.userId,
          description: `Privileged role "${role.name}" assigned to user`,
          organizationId: orgId,
          metadata: {
            userId: validated.userId,
            roleId: role.id,
            roleSlug: role.slug,
          },
        });
      }
    });
    await Promise.all(auditPromises);

    await createAuditLog({
      action: "ASSIGN_ROLES_TO_USER",
      resource: "UserRole",
      resourceId: validated.userId,
      description: `User ${currentUser.email} assigned roles to user in organization`,
      organizationId: orgId,
      metadata: {
        userId: validated.userId,
        roleIds: validated.roleIds,
      },
    });

    revalidatePath("/dashboard/organization/users");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Assign roles error:", error);
    return { success: false, error: "Failed to assign roles" };
  }
}

/**
 * Get all users in the current organization
 */
export async function getOrganizationUsers(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get organization context
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return { success: false, error: "No organization context" };
    }

    // Check if user has access to this organization
    const hasAccess = await hasOrganizationAccess(currentUser.userId, orgId);
    if (!hasAccess) {
      return { success: false, error: "You don't have access to this organization" };
    }

    const skip = (page - 1) * limit;
    const where: any = {
      organizations: {
        some: {
          organizationId: orgId,
          isActive: true,
        },
      },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          organizations: {
            where: {
              organizationId: orgId,
              isActive: true,
            },
          },
          roles: {
            where: {
              organizationId: orgId,
            },
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          slug: ur.role.slug,
        })),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Get organization users error:", error);
    return { success: false, error: "Failed to fetch organization users" };
  }
}

/**
 * Remove user from organization (soft delete - set isActive to false)
 */
export async function removeUserFromOrganization(userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get organization context
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return { success: false, error: "No organization context" };
    }

    // Check if user has access to this organization
    const hasAccess = await hasOrganizationAccess(currentUser.userId, orgId);
    if (!hasAccess) {
      return { success: false, error: "You don't have access to this organization" };
    }

    // Soft delete: set isActive to false
    await prisma.userOrganization.updateMany({
      where: {
        userId,
        organizationId: orgId,
      },
      data: {
        isActive: false,
      },
    });

    // Remove roles in this organization
    await prisma.userRole.deleteMany({
      where: {
        userId,
        organizationId: orgId,
      },
    });

    await createAuditLog({
      action: "REMOVE_USER_FROM_ORGANIZATION",
      resource: "UserOrganization",
      resourceId: userId,
      description: `User ${currentUser.email} removed user from organization`,
      organizationId: orgId,
      metadata: { userId },
    });

    revalidatePath("/dashboard/organization/users");
    return { success: true };
  } catch (error) {
    console.error("Remove user from organization error:", error);
    return { success: false, error: "Failed to remove user from organization" };
  }
}

