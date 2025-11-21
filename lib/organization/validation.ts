import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { getCurrentOrganizationId } from "./context";
import { isRestrictedRole, isRestrictedPermission, isPrivilegedRole } from "./constants";
import { SUPERADMIN_ROLE } from "@/lib/auth/permissions";

/**
 * Organization Validation Utilities
 * Validates that organizations can only perform allowed operations
 */

/**
 * Check if current user is superadmin
 */
export async function isSuperadmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.userId },
    include: { role: true },
  });

  return userRoles.some(
    (ur) => ur.role.slug === SUPERADMIN_ROLE && ur.role.organizationId === null
  );
}

/**
 * Validate that user can assign roles (not restricted)
 */
export async function validateRoleAssignment(
  roleIds: string[]
): Promise<{ valid: boolean; error?: string }> {
  const isSuper = await isSuperadmin();
  
  // Superadmin can assign any role
  if (isSuper) {
    return { valid: true };
  }

  // Get organization context
  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    return { valid: false, error: "No organization context" };
  }

  // Check each role
  const roles = await prisma.role.findMany({
    where: {
      id: { in: roleIds },
    },
  });

  for (const role of roles) {
    // Cannot assign global roles (superadmin)
    if (role.organizationId === null) {
      return {
        valid: false,
        error: `Cannot assign global role "${role.name}". Only superadmin can assign global roles.`,
      };
    }

    // Cannot assign roles from other organizations
    if (role.organizationId !== orgId) {
      return {
        valid: false,
        error: `Cannot assign role "${role.name}" from another organization.`,
      };
    }

    // Cannot assign restricted roles
    if (isRestrictedRole(role.slug)) {
      return {
        valid: false,
        error: `Cannot assign restricted role "${role.name}". Only superadmin can assign this role.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate that user can assign permissions (not restricted)
 */
export async function validatePermissionAssignment(
  permissionIds: string[]
): Promise<{ valid: boolean; error?: string }> {
  const isSuper = await isSuperadmin();
  
  // Superadmin can assign any permission
  if (isSuper) {
    return { valid: true };
  }

  // Get organization context
  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    return { valid: false, error: "No organization context" };
  }

  // Check each permission
  const permissions = await prisma.permission.findMany({
    where: {
      id: { in: permissionIds },
    },
  });

  for (const permission of permissions) {
    // Cannot assign global permissions (system-level)
    if (permission.organizationId === null) {
      return {
        valid: false,
        error: `Cannot assign global permission "${permission.name}". Only superadmin can assign global permissions.`,
      };
    }

    // Cannot assign permissions from other organizations
    if (permission.organizationId !== orgId) {
      return {
        valid: false,
        error: `Cannot assign permission "${permission.name}" from another organization.`,
      };
    }

    // Cannot assign restricted permissions
    if (isRestrictedPermission(permission.slug)) {
      return {
        valid: false,
        error: `Cannot assign restricted permission "${permission.slug}". Only superadmin can assign this permission.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate that user can create resources (only superadmin can create roles/permissions/menus)
 */
export async function validateResourceCreation(
  resourceType: "role" | "permission" | "menu"
): Promise<{ valid: boolean; error?: string }> {
  const isSuper = await isSuperadmin();

  if (!isSuper) {
    return {
      valid: false,
      error: `Only superadmin can create ${resourceType}s. Organizations can only assign existing ${resourceType}s.`,
    };
  }

  return { valid: true };
}

/**
 * Validate that user can delete resources (only superadmin can delete roles/permissions/menus)
 */
export async function validateResourceDeletion(
  resourceType: "role" | "permission" | "menu"
): Promise<{ valid: boolean; error?: string }> {
  const isSuper = await isSuperadmin();

  if (!isSuper) {
    return {
      valid: false,
      error: `Only superadmin can delete ${resourceType}s.`,
    };
  }

  return { valid: true };
}

/**
 * Check if role assignment should be audited (privileged role)
 */
export async function shouldAuditRoleAssignment(roleId: string): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!role) return false;
  return isPrivilegedRole(role.slug);
}

