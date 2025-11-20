"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * Server Actions for Menu Management
 */

/**
 * Get all menus
 */
export async function getMenus() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const menus = await prisma.menu.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      menus: menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        path: menu.path,
        icon: menu.icon,
        order: menu.order,
        children: menu.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          path: child.path,
        })),
      })),
    };
  } catch (error) {
    console.error("Get menus error:", error);
    return { success: false, error: "Failed to fetch menus" };
  }
}

