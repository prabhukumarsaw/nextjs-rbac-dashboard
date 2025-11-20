"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken, setAuthCookie, removeAuthCookie, getCurrentUser } from "@/lib/auth/jwt";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkLoginRateLimit, getClientIP } from "@/lib/security/rate-limit";
import { emailSchema, passwordSchema } from "@/lib/security/validation";
import { headers } from "next/headers";
import { z } from "zod";

/**
 * Server Actions for Authentication
 * Handles login, logout, and user session management
 * Includes rate limiting and input validation for security
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authenticate user with email and password
 * @param credentials - Login credentials
 * @returns Success status and user data or error
 */
export async function login(credentials: LoginCredentials) {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
               headersList.get("x-real-ip") || 
               "unknown";

    // Rate limiting check
    const rateLimit = checkLoginRateLimit(ip);
    if (rateLimit.limited) {
      await createAuditLog({
        action: "LOGIN_RATE_LIMIT",
        resource: "User",
        description: `Rate limit exceeded for IP: ${ip}`,
        ipAddress: ip,
      });
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
      };
    }

    // Validate input (relaxed password validation for login)
    const validatedEmail = emailSchema.parse(credentials.email);
    // For login, we just need to check password exists, not strength
    const validatedPassword = z.string().min(1).parse(credentials.password);
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: "Your account has been deactivated. Please contact administrator.",
      };
    }

    // Verify password (skip for social login users without password)
    if (user.password) {
      const isValidPassword = await bcrypt.compare(validatedPassword, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }
    } else {
      return {
        success: false,
        error: "Please use social login for this account",
      };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
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

    // Set cookie
    await setAuthCookie(token);

    // Create audit log with IP and user agent
    const userAgent = headersList.get("user-agent") || "unknown";
    await createAuditLog({
      action: "LOGIN",
      resource: "User",
      resourceId: user.id,
      description: `User ${user.email} logged in`,
      ipAddress: ip,
      userAgent,
    });

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
    // Don't leak sensitive error information
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message || "Invalid input",
      };
    }
    
    // Log error but don't expose details to user
    // Use structured logging for better observability
    if (error instanceof Error) {
      console.error(JSON.stringify({
        level: "error",
        message: "Login error",
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
        },
      }));
    } else {
      console.error("Login error:", error);
    }
    
    return {
      success: false,
      error: "Invalid email or password",
    };
  }
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      await createAuditLog({
        action: "LOGOUT",
        resource: "User",
        resourceId: user.userId,
        description: `User ${user.email} logged out`,
      });
    }

    await removeAuthCookie();
    revalidatePath("/");
    redirect("/login");
  } catch (error) {
    // Log error but continue with logout
    if (error instanceof Error) {
      console.error(JSON.stringify({
        level: "error",
        message: "Logout error",
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
        },
      }));
    } else {
      console.error("Logout error:", error);
    }
    
    await removeAuthCookie();
    redirect("/login");
  }
}


