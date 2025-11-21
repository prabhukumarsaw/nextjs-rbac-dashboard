"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SUPERADMIN_ROLE } from "@/lib/auth/permissions";

/**
 * Server Actions for Organization Management
 * Handles CRUD operations for organizations
 */

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  settings: z.record(z.any()).optional(),
});

const updateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * Create a new organization
 * Only superadmin can create organizations
 */
export async function createOrganization(data: z.infer<typeof createOrganizationSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Only superadmin can create organizations
    const isSuperadmin = await hasPermission(currentUser.userId, "organization.create");
    if (!isSuperadmin) {
      // Check if user has superadmin role
      const userRoles = await prisma.userRole.findMany({
        where: { userId: currentUser.userId },
        include: { role: true },
      });
      
      const hasSuperadminRole = userRoles.some(
        (ur) => ur.role.slug === SUPERADMIN_ROLE && ur.role.organizationId === null
      );

      if (!hasSuperadminRole) {
        return { success: false, error: "Only superadmin can create organizations" };
      }
    }

    const validated = createOrganizationSchema.parse(data);

    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug: validated.slug },
    });
    if (existing) {
      return { success: false, error: "Organization slug already exists" };
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        logo: validated.logo || null,
        settings: validated.settings ? JSON.stringify(validated.settings) : null,
      },
    });

    // Create audit log
    await createAuditLog({
      action: "CREATE_ORGANIZATION",
      resource: "Organization",
      resourceId: organization.id,
      description: `User ${currentUser.email} created organization ${organization.name}`,
      metadata: {
        organizationId: organization.id,
        organizationSlug: organization.slug,
      },
    });

    revalidatePath("/dashboard/organizations");
    return { success: true, organization };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Create organization error:", error);
    return { success: false, error: "Failed to create organization" };
  }
}

/**
 * Update an organization
 */
export async function updateOrganization(data: z.infer<typeof updateOrganizationSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = updateOrganizationSchema.parse(data);

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id: validated.id },
    });
    if (!existing) {
      return { success: false, error: "Organization not found" };
    }

    // Check permission (superadmin or org admin)
    const isSuperadmin = await hasPermission(currentUser.userId, "organization.update");
    if (!isSuperadmin) {
      // Check if user is admin of this organization
      const hasAccess = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: currentUser.userId,
            organizationId: validated.id,
          },
          isActive: true,
        },
      });
      if (!hasAccess) {
        return { success: false, error: "You don't have permission to update this organization" };
      }
    }

    // Check slug uniqueness if changing
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await prisma.organization.findUnique({
        where: { slug: validated.slug },
      });
      if (slugExists) {
        return { success: false, error: "Organization slug already exists" };
      }
    }

    // Update organization
    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.slug) updateData.slug = validated.slug;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.logo !== undefined) updateData.logo = validated.logo || null;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if (validated.settings) updateData.settings = JSON.stringify(validated.settings);

    const organization = await prisma.organization.update({
      where: { id: validated.id },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE_ORGANIZATION",
      resource: "Organization",
      resourceId: organization.id,
      description: `User ${currentUser.email} updated organization ${organization.name}`,
      organizationId: organization.id,
    });

    revalidatePath("/dashboard/organizations");
    return { success: true, organization };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Update organization error:", error);
    return { success: false, error: "Failed to update organization" };
  }
}

/**
 * Get all organizations
 * Superadmin sees all, regular users see only their organizations
 */
export async function getOrganizations() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if superadmin
    const userRoles = await prisma.userRole.findMany({
      where: { userId: currentUser.userId },
      include: { role: true },
    });

    const isSuperadmin = userRoles.some(
      (ur) => ur.role.slug === SUPERADMIN_ROLE && ur.role.organizationId === null
    );

    let organizations;
    if (isSuperadmin) {
      // Superadmin sees all organizations
      organizations = await prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Regular users see only their organizations
      const userOrgs = await prisma.userOrganization.findMany({
        where: {
          userId: currentUser.userId,
          isActive: true,
          organization: { isActive: true },
        },
        include: { organization: true },
        orderBy: { joinedAt: "asc" },
      });
      organizations = userOrgs.map((uo) => uo.organization);
    }

    return { success: true, organizations };
  } catch (error) {
    console.error("Get organizations error:", error);
    return { success: false, error: "Failed to fetch organizations" };
  }
}

/**
 * Add user to organization
 */
export async function addUserToOrganization(userId: string, organizationId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check permission
    const hasAccess = await hasPermission(currentUser.userId, "organization.manage");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to manage organization users" };
    }

    // Check if user already in organization
    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "User is already in this organization" };
    }

    // Add user to organization
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        isActive: true,
      },
    });

    await createAuditLog({
      action: "ADD_USER_TO_ORGANIZATION",
      resource: "UserOrganization",
      description: `User ${currentUser.email} added user to organization`,
      organizationId,
      metadata: { userId },
    });

    revalidatePath("/dashboard/organizations");
    return { success: true };
  } catch (error) {
    console.error("Add user to organization error:", error);
    return { success: false, error: "Failed to add user to organization" };
  }
}

/**
 * Remove user from organization
 */
export async function removeUserFromOrganization(userId: string, organizationId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check permission
    const hasAccess = await hasPermission(currentUser.userId, "organization.manage");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to manage organization users" };
    }

    // Remove user from organization
    await prisma.userOrganization.updateMany({
      where: {
        userId,
        organizationId,
      },
      data: {
        isActive: false,
      },
    });

    await createAuditLog({
      action: "REMOVE_USER_FROM_ORGANIZATION",
      resource: "UserOrganization",
      description: `User ${currentUser.email} removed user from organization`,
      organizationId,
      metadata: { userId },
    });

    revalidatePath("/dashboard/organizations");
    return { success: true };
  } catch (error) {
    console.error("Remove user from organization error:", error);
    return { success: false, error: "Failed to remove user from organization" };
  }
}

