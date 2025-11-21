"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentOrganizationId, buildOrganizationFilter } from "./context";
import { isSuperadmin } from "./validation";

/**
 * Organization-Aware Statistics
 * Returns stats based on organization context
 * Superadmin sees aggregated stats when no org selected, org-specific when org selected
 */

export interface DashboardStats {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalMenus: number;
  activeUsers: number;
  inactiveUsers: number;
  totalBlogs: number;
  publishedBlogs: number;
  organizationId: string | null;
  organizationName: string | null;
  isAllOrganizations: boolean;
}

/**
 * Get dashboard statistics
 * Returns organization-specific stats or aggregated stats for superadmin
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const isSuper = await isSuperadmin();
    const orgId = await getCurrentOrganizationId();
    const orgFilter = await buildOrganizationFilter(false);

    let organizationName: string | null = null;
    let isAllOrganizations = false;

    if (isSuper && orgId === null) {
      // Superadmin viewing all organizations - aggregate stats
      isAllOrganizations = true;
      
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalRoles,
        totalPermissions,
        totalMenus,
        totalBlogs,
        publishedBlogs,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.role.count({ where: { isActive: true } }),
        prisma.permission.count({ where: { isActive: true } }),
        prisma.menu.count({ where: { isActive: true } }),
        prisma.blog.count({ where: { isActive: true } }),
        prisma.blog.count({ where: { isActive: true, isPublished: true } }),
      ]);

      return {
        totalUsers,
        totalRoles,
        totalPermissions,
        totalMenus,
        activeUsers,
        inactiveUsers,
        totalBlogs,
        publishedBlogs,
        organizationId: null,
        organizationName: "All Organizations",
        isAllOrganizations: true,
      };
    } else {
      // Organization-specific stats
      if (!orgId) {
        // No organization context - return zeros
        return {
          totalUsers: 0,
          totalRoles: 0,
          totalPermissions: 0,
          totalMenus: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          totalBlogs: 0,
          publishedBlogs: 0,
          organizationId: null,
          organizationName: null,
          isAllOrganizations: false,
        };
      }

      // Get organization name
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      organizationName = org?.name || null;

      // Get organization-specific stats
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalRoles,
        totalPermissions,
        totalMenus,
        totalBlogs,
        publishedBlogs,
      ] = await Promise.all([
        // Users in this organization
        prisma.userOrganization.count({
          where: {
            organizationId: orgId,
            isActive: true,
          },
        }),
        // Active users in this organization
        prisma.userOrganization.count({
          where: {
            organizationId: orgId,
            isActive: true,
            user: { isActive: true },
          },
        }),
        // Inactive users in this organization
        prisma.userOrganization.count({
          where: {
            organizationId: orgId,
            isActive: true,
            user: { isActive: false },
          },
        }),
        // Roles in this organization + global roles
        prisma.role.count({
          where: {
            OR: [
              { organizationId: orgId },
              { organizationId: null }, // Global roles
            ],
            isActive: true,
          },
        }),
        // Permissions in this organization + global permissions
        prisma.permission.count({
          where: {
            OR: [
              { organizationId: orgId },
              { organizationId: null }, // Global permissions
            ],
            isActive: true,
          },
        }),
        // Menus in this organization + global menus
        prisma.menu.count({
          where: {
            OR: [
              { organizationId: orgId },
              { organizationId: null }, // Global menus
            ],
            isActive: true,
          },
        }),
        // Blogs in this organization
        prisma.blog.count({
          where: {
            organizationId: orgId,
            isActive: true,
          },
        }),
        // Published blogs in this organization
        prisma.blog.count({
          where: {
            organizationId: orgId,
            isActive: true,
            isPublished: true,
          },
        }),
      ]);

      return {
        totalUsers,
        totalRoles,
        totalPermissions,
        totalMenus,
        activeUsers,
        inactiveUsers,
        totalBlogs,
        publishedBlogs,
        organizationId: orgId,
        organizationName,
        isAllOrganizations: false,
      };
    }
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    // Return zero stats on error
    return {
      totalUsers: 0,
      totalRoles: 0,
      totalPermissions: 0,
      totalMenus: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      totalBlogs: 0,
      publishedBlogs: 0,
      organizationId: null,
      organizationName: null,
      isAllOrganizations: false,
    };
  }
}

/**
 * Get organization list with stats (for superadmin)
 */
export async function getOrganizationsWithStats() {
  try {
    const isSuper = await isSuperadmin();
    if (!isSuper) {
      return { success: false, error: "Only superadmin can view organization stats" };
    }

    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: {
              where: { isActive: true },
            },
            roles: {
              where: { isActive: true },
            },
            permissions: {
              where: { isActive: true },
            },
            blogs: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        stats: {
          users: org._count.users,
          roles: org._count.roles,
          permissions: org._count.permissions,
          blogs: org._count.blogs,
        },
      })),
    };
  } catch (error) {
    console.error("Get organizations with stats error:", error);
    return { success: false, error: "Failed to fetch organizations" };
  }
}

