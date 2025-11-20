"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { createAuditLog } from "@/lib/audit-log";
import { emailSchema, usernameSchema } from "@/lib/security/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Profile Management Server Actions
 * Handles user profile updates and password changes
 */

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

/**
 * Update user profile
 */
export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = updateProfileSchema.parse(data);

    // Get current user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const updateData: any = {};

    // Check email uniqueness if changing
    if (validated.email && validated.email !== user.email) {
      const email = emailSchema.parse(validated.email);
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return { success: false, error: "Email already exists" };
      }
      updateData.email = email;
    }

    // Check username uniqueness if changing
    if (validated.username && validated.username !== user.username) {
      const username = usernameSchema.parse(validated.username);
      const usernameExists = await prisma.user.findUnique({
        where: { username },
      });
      if (usernameExists) {
        return { success: false, error: "Username already exists" };
      }
      updateData.username = username;
    }

    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.userId },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE_PROFILE",
      resource: "User",
      resourceId: updatedUser.id,
      description: `User ${updatedUser.email} updated their profile`,
    });

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Update profile error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Change user password
 */
export async function changePassword(data: z.infer<typeof changePasswordSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = changePasswordSchema.parse(data);

    // Check password confirmation
    if (validated.newPassword !== validated.confirmPassword) {
      return { success: false, error: "New passwords do not match" };
    }

    // Get current user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user || !user.password) {
      return { success: false, error: "User not found or password cannot be changed" };
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(validated.currentPassword, user.password);
    if (!isValidPassword) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: currentUser.userId },
      data: { password: hashedPassword },
    });

    await createAuditLog({
      action: "CHANGE_PASSWORD",
      resource: "User",
      resourceId: user.id,
      description: `User ${user.email} changed their password`,
    });

    revalidatePath("/dashboard/profile");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Change password error:", error);
    return { success: false, error: "Failed to change password" };
  }
}

/**
 * Get current user profile
 */
export async function getProfile() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
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
        avatar: user.avatar,
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
    console.error("Get profile error:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

