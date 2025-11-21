import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { SUPERADMIN_ROLE } from "@/lib/auth/permissions";

/**
 * Organization Context Management
 * Handles multi-tenant organization isolation and context
 */

const ORGANIZATION_COOKIE_NAME = "current-organization-id";

/**
 * Get current organization ID from cookie or user's default organization
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const orgId = cookieStore.get(ORGANIZATION_COOKIE_NAME)?.value;
    
    if (orgId) {
      // Verify organization exists and is active
      const org = await prisma.organization.findUnique({
        where: { id: orgId, isActive: true },
      });
      if (org) return orgId;
    }

    // If no cookie or invalid, get user's first active organization
    const user = await getCurrentUser();
    if (!user) return null;

    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: user.userId,
        isActive: true,
        organization: { isActive: true },
      },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    if (userOrg) {
      // Set cookie for future requests
      await setCurrentOrganizationId(userOrg.organizationId);
      return userOrg.organizationId;
    }

    return null;
  } catch (error) {
    console.error("Error getting current organization:", error);
    return null;
  }
}

/**
 * Set current organization ID in cookie
 */
export async function setCurrentOrganizationId(organizationId: string) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  
  cookieStore.set(ORGANIZATION_COOKIE_NAME, organizationId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

/**
 * Clear current organization cookie
 */
export async function clearCurrentOrganizationId() {
  const cookieStore = await cookies();
  cookieStore.delete(ORGANIZATION_COOKIE_NAME);
}

/**
 * Get current organization details
 */
export async function getCurrentOrganization() {
  const orgId = await getCurrentOrganizationId();
  if (!orgId) return null;

  return await prisma.organization.findUnique({
    where: { id: orgId },
  });
}

/**
 * Get all organizations for current user
 */
export async function getUserOrganizations() {
  const user = await getCurrentUser();
  if (!user) return [];

  const userOrgs = await prisma.userOrganization.findMany({
    where: {
      userId: user.userId,
      isActive: true,
      organization: { isActive: true },
    },
    include: {
      organization: true,
    },
    orderBy: { joinedAt: "asc" },
  });

  return userOrgs.map((uo) => uo.organization);
}

/**
 * Check if user has access to organization
 */
export async function hasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Superadmin has access to all organizations
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
    },
  });

  const isSuperadmin = userRoles.some(
    (ur) => ur.role.slug === SUPERADMIN_ROLE && ur.role.organizationId === null
  );

  if (isSuperadmin) return true;

  // Check if user belongs to organization
  const userOrg = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
      isActive: true,
    },
  });

  return !!userOrg;
}

/**
 * Get organization context for queries
 * Returns organization filter that can be used in Prisma queries
 * Superadmin can access all organizations (returns undefined to not filter)
 */
export async function getOrganizationContext(): Promise<{ organizationId: string | null } | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  // Check if user is superadmin (global role)
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.userId },
    include: { role: true },
  });

  const isSuperadmin = userRoles.some(
    (ur) => ur.role.slug === SUPERADMIN_ROLE && ur.role.organizationId === null
  );

  // Superadmin can access all organizations (no filter)
  if (isSuperadmin) return undefined;

  // Regular users are scoped to their organization
  const orgId = await getCurrentOrganizationId();
  return { organizationId: orgId || null };
}

/**
 * Build organization filter for Prisma queries
 * Includes both organization-specific and global (null) resources
 */
export async function buildOrganizationFilter(includeGlobal: boolean = true) {
  const context = await getOrganizationContext();
  
  // Superadmin or no context = access all
  if (!context) {
    return includeGlobal ? undefined : { organizationId: { not: null } };
  }

  // Regular user: access their org + global resources
  if (includeGlobal) {
    return {
      OR: [
        { organizationId: context.organizationId },
        { organizationId: null }, // Global resources
      ],
    };
  }

  return { organizationId: context.organizationId };
}

