/**
 * Organization Management Constants
 * Defines restricted roles and permissions that organizations cannot assign
 */

/**
 * Restricted role slugs that organizations cannot assign
 * Only superadmin can assign these roles
 */
export const RESTRICTED_ROLES = [
  "superadmin",
  "system-admin",
  "platform-admin",
] as const;

/**
 * Restricted permission slugs that organizations cannot assign
 * Only superadmin can assign these permissions
 */
export const RESTRICTED_PERMISSIONS = [
  "organization.create",
  "organization.delete",
  "role.create",
  "role.delete",
  "permission.create",
  "permission.delete",
  "menu.create",
  "menu.delete",
  "system.manage",
  "platform.manage",
] as const;

/**
 * Heavy/privileged roles that require special approval
 * Organizations can assign these but should be logged/audited
 */
export const PRIVILEGED_ROLES = [
  "admin",
  "administrator",
  "manager",
  "director",
] as const;

/**
 * Check if a role slug is restricted
 */
export function isRestrictedRole(roleSlug: string): boolean {
  return RESTRICTED_ROLES.includes(roleSlug.toLowerCase() as any);
}

/**
 * Check if a permission slug is restricted
 */
export function isRestrictedPermission(permissionSlug: string): boolean {
  return RESTRICTED_PERMISSIONS.some((restricted) =>
    permissionSlug.toLowerCase().startsWith(restricted.toLowerCase())
  );
}

/**
 * Check if a role is privileged (requires audit)
 */
export function isPrivilegedRole(roleSlug: string): boolean {
  return PRIVILEGED_ROLES.includes(roleSlug.toLowerCase() as any);
}

