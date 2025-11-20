"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken, setAuthCookie } from "@/lib/auth/jwt";
import { createAuditLog } from "@/lib/audit-log";
import { emailSchema, usernameSchema } from "@/lib/security/validation";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Enhanced registration schema with better validation
 */
const registerSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(100, "Email must be less than 100 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .regex(/(?=.*\d)/, "Password must contain at least one number"),
  firstName: z.string()
    .max(50, "First name must be less than 50 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
  lastName: z.string()
    .max(50, "Last name must be less than 50 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
});

/**
 * Register a new user with enhanced validation and error handling
 */
export async function register(data: z.infer<typeof registerSchema>) {
  try {
    // Validate input data
    const validated = registerSchema.parse(data);
    
    // Additional security validation
    const email = emailSchema.parse(validated.email.toLowerCase().trim());
    const username = usernameSchema.parse(validated.username.trim());

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    
    if (existingEmail) {
      return { 
        success: false, 
        error: "Email already exists. Please use a different email or sign in." 
      };
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });
    
    if (existingUsername) {
      return { 
        success: false, 
        error: "Username already exists. Please choose a different username." 
      };
    }

    // Hash password with salt rounds
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Get citizen role in transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get citizen role
      const citizenRole = await tx.role.findUnique({
        where: { slug: "citizen" },
        select: { id: true }
      });

      if (!citizenRole) {
        throw new Error("Citizen role not found. Please contact administrator.");
      }

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          firstName: validated.firstName,
          lastName: validated.lastName,
          isActive: true,
          provider: "credentials",
         // Add email verification field
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
        }
      });

      // Assign citizen role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: citizenRole.id,
        }
      });

      return user;
    });

    // Generate JWT token
    const token = await generateToken({
      userId: result.id,
      email: result.email,
      username: result.username,
      roles: ["citizen"],
    });

    // Set authentication cookie
    await setAuthCookie(token);

    // Get request details for audit log
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               headersList.get("x-real-ip") || 
               headersList.get("cf-connecting-ip") ||
               "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Create audit log entry
    await createAuditLog({
      action: "REGISTER",
      resource: "User",
      resourceId: result.id,
      description: `User ${result.email} registered successfully`,
      ipAddress: ip,
      userAgent,
    });

    // Revalidate relevant paths
    revalidatePath("/");
    revalidatePath("/dashboard");

    return {
      success: true,
      user: {
        id: result.id,
        email: result.email,
        username: result.username,
        firstName: result.firstName,
        lastName: result.lastName,
        roles: ["citizen"],
      },
    };
  } catch (error) {
    console.error("Registration error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message || "Invalid form data",
      };
    }

    // Handle known Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Citizen role not found")) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      // Handle unique constraint violations
      if (error.message.includes("Unique constraint")) {
        if (error.message.includes("email")) {
          return {
            success: false,
            error: "Email already exists. Please use a different email.",
          };
        }
        if (error.message.includes("username")) {
          return {
            success: false,
            error: "Username already exists. Please choose a different username.",
          };
        }
      }
    }

    // Generic error response
    return {
      success: false,
      error: "Registration failed. Please try again later.",
    };
  }
}