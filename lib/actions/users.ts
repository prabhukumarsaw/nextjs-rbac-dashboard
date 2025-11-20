"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { generateUsernameFromEmail, generatePassword } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Server Actions for User Management
 * Handles CRUD operations for users with permission checks
 */

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Create a new user
 * @param data - User data
 * @returns Created user or error
 */
export async function createUser(data: z.infer<typeof createUserSchema>) {
  try {
    // Check permission
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "user.create");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to create users" };
    }

    // Validate data
    const validated = createUserSchema.parse(data);

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existingEmail) {
      return { success: false, error: "Email already exists" };
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validated.username },
    });
    if (existingUsername) {
      return { success: false, error: "Username already exists" };
    }

    // Generate password if not provided
    const password = validated.password || generatePassword(12);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        username: validated.username,
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
        isActive: validated.isActive,
        provider: "credentials",
      },
    });

    // Assign roles
    if (validated.roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: validated.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      });
    }

    // Create audit log
    await createAuditLog({
      action: "CREATE_USER",
      resource: "User",
      resourceId: user.id,
      description: `User ${currentUser.email} created user ${user.email}`,
      metadata: {
        createdUserId: user.id,
        roles: validated.roleIds,
      },
    });

    revalidatePath("/dashboard/users");

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
    console.error("Create user error:", error);
    return { success: false, error: "Failed to create user" };
  }
}

/**
 * Update an existing user
 * @param data - User data to update
 * @returns Updated user or error
 */
export async function updateUser(data: z.infer<typeof updateUserSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "user.update");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to update users" };
    }

    const validated = updateUserSchema.parse(data);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: validated.id },
    });
    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Check email uniqueness if changing
    if (validated.email && validated.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validated.email },
      });
      if (emailExists) {
        return { success: false, error: "Email already exists" };
      }
    }

    // Check username uniqueness if changing
    if (validated.username && validated.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: validated.username },
      });
      if (usernameExists) {
        return { success: false, error: "Username already exists" };
      }
    }

    // Update user
    const updateData: any = {};
    if (validated.email) updateData.email = validated.email;
    if (validated.username) updateData.username = validated.username;
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const user = await prisma.user.update({
      where: { id: validated.id },
      data: updateData,
    });

    // Update roles if provided
    if (validated.roleIds) {
      // Remove existing roles
      await prisma.userRole.deleteMany({
        where: { userId: validated.id },
      });

      // Add new roles
      if (validated.roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: validated.roleIds.map((roleId) => ({
            userId: validated.id,
            roleId,
          })),
        });
      }
    }

    // Create audit log
    await createAuditLog({
      action: "UPDATE_USER",
      resource: "User",
      resourceId: user.id,
      description: `User ${currentUser.email} updated user ${user.email}`,
      metadata: {
        updatedFields: Object.keys(updateData),
        roles: validated.roleIds,
      },
    });

    revalidatePath("/dashboard/users");

    return { success: true, user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Update user error:", error);
    return { success: false, error: "Failed to update user" };
  }
}

/**
 * Delete a user
 * @param userId - User ID to delete
 * @returns Success status or error
 */
export async function deleteUser(userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "user.delete");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to delete users" };
    }

    // Prevent self-deletion
    if (currentUser.userId === userId) {
      return { success: false, error: "You cannot delete your own account" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    await createAuditLog({
      action: "DELETE_USER",
      resource: "User",
      resourceId: userId,
      description: `User ${currentUser.email} deleted user ${user.email}`,
    });

    revalidatePath("/dashboard/users");

    return { success: true };
  } catch (error) {
    console.error("Delete user error:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

/**
 * Get all users with pagination
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search query
 */
export async function getUsers(page: number = 1, limit: number = 10, search?: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "user.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view users" };
    }

    const skip = (page - 1) * limit;
    const where: any = {};

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
          roles: {
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
    console.error("Get users error:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

/**
 * Get single user by ID
 * @param userId - User ID
 */
export async function getUserById(userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasAccess = await hasPermission(currentUser.userId, "user.read");
    if (!hasAccess) {
      return { success: false, error: "You don't have permission to view users" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: {
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
      },
    };
  } catch (error) {
    console.error("Get user error:", error);
    return { success: false, error: "Failed to fetch user" };
  }
}

