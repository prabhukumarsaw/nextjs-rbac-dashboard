"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken, setAuthCookie, removeAuthCookie, getCurrentUser } from "@/lib/auth/jwt";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkLoginRateLimit } from "@/lib/security/rate-limit";
import { emailSchema, passwordSchema } from "@/lib/security/validation";
import { headers } from "next/headers";
import { z } from "zod";

/**
 * Enhanced login schema with better validation
 */
const loginSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(100, "Email must be less than 100 characters")
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(1, "Password is required")
    .max(100, "Password must be less than 100 characters"),
});

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authenticate user with enhanced security and error handling
 */
export async function login(credentials: LoginCredentials) {
  try {
    // Get client IP for rate limiting and audit
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               headersList.get("x-real-ip") || 
               headersList.get("cf-connecting-ip") ||
               "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Rate limiting check
    const rateLimit = checkLoginRateLimit(ip);
    if (rateLimit.limited) {
      await createAuditLog({
        action: "LOGIN_RATE_LIMIT",
        resource: "User",
        description: `Rate limit exceeded for IP: ${ip}`,
        ipAddress: ip,
        userAgent,
      });
      return {
        success: false,
        error: "Too many login attempts. Please try again in a few minutes.",
      };
    }

    // Validate input
    const validated = loginSchema.parse(credentials);
    const email = emailSchema.parse(validated.email);

    // Find user by email with role information
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Generic error message for security (don't reveal if email exists)
    const genericError = {
      success: false,
      error: "Invalid email or password",
    };

    if (!user) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        resource: "User",
        description: `Failed login attempt for email: ${email}`,
        ipAddress: ip,
        userAgent,
      });
      return genericError;
    }

    // Check if user is active
    if (!user.isActive) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        resource: "User",
        resourceId: user.id,
        description: `Login attempt for deactivated account: ${user.email}`,
        ipAddress: ip,
        userAgent,
      });
      return {
        success: false,
        error: "Your account has been deactivated. Please contact administrator.",
      };
    }

    // Verify password for credential-based users
    if (!user.password) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        resource: "User",
        resourceId: user.id,
        description: `Password login attempted for social account: ${user.email}`,
        ipAddress: ip,
        userAgent,
      });
      return {
        success: false,
        error: "This account uses social login. Please use the social login option.",
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validated.password, user.password);
    if (!isValidPassword) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        resource: "User",
        resourceId: user.id,
        description: `Invalid password attempt for user: ${user.email}`,
        ipAddress: ip,
        userAgent,
      });
      return genericError;
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLogin: new Date(),
        // Optional: Update lastActive for tracking
        // lastActive: new Date(),
      },
    });

    // Get user roles
    const roles = user.roles.map((ur) => ur.role.slug);

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      roles,
    });

    // Set authentication cookie
    await setAuthCookie(token);

    // Create successful login audit log
    await createAuditLog({
      action: "LOGIN",
      resource: "User",
      resourceId: user.id,
      description: `User ${user.email} logged in successfully`,
      ipAddress: ip,
      userAgent,
    });

    // Revalidate relevant paths
    revalidatePath("/");
    revalidatePath("/dashboard");

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  } catch (error) {
    // Enhanced error handling with structured logging
    console.error("Login error:", {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message || "Invalid form data",
      };
    }

    // Generic error response for security
    return {
      success: false,
      error: "Invalid email or password",
    };
  }
}

/**
 * Enhanced logout function with better error handling
 */
export async function logout() {
  try {
    const user = await getCurrentUser();
    
    // Create audit log for logout
    if (user) {
      await createAuditLog({
        action: "LOGOUT",
        resource: "User",
        resourceId: user.userId,
        description: `User ${user.email} logged out`,
      });
    }

    // Remove authentication cookie
    await removeAuthCookie();
    
    // Revalidate all relevant paths
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    
    // Redirect to login page
    redirect("/auth/sign-in");
  } catch (error) {
    // Log error but ensure user is logged out
    console.error("Logout error:", {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
      } : error,
    });
    
    // Always remove cookie and redirect even on error
    await removeAuthCookie();
    redirect("/auth/sign-in");
  }
}

/**
 * Get current user session (optional helper function)
 */
export async function getSession() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}