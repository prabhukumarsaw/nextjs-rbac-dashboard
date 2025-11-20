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
 * Registration Server Actions
 * Handles user registration with default "citizen" role
 */

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Register a new user
 * Automatically assigns "citizen" role
 */
export async function register(data: z.infer<typeof registerSchema>) {
  try {
    // Validate input
    const validated = registerSchema.parse(data);
    const email = emailSchema.parse(validated.email);
    const username = usernameSchema.parse(validated.username);

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return { success: false, error: "Email already exists" };
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return { success: false, error: "Username already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Get citizen role
    const citizenRole = await prisma.role.findUnique({
      where: { slug: "citizen" },
    });

    if (!citizenRole) {
      return {
        success: false,
        error: "Citizen role not found. Please contact administrator.",
      };
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
        isActive: true,
        provider: "credentials",
      },
    });

    // Assign citizen role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: citizenRole.id,
      },
    });

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      roles: ["citizen"],
    });

    // Set cookie
    await setAuthCookie(token);

    // Get IP and user agent for audit log
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
               headersList.get("x-real-ip") || 
               "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Create audit log
    await createAuditLog({
      action: "REGISTER",
      resource: "User",
      resourceId: user.id,
      description: `User ${user.email} registered`,
      ipAddress: ip,
      userAgent,
    });

    revalidatePath("/");

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: ["citizen"],
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Validation error",
      };
    }
    
    console.error("Registration error:", error);
    return {
      success: false,
      error: "Registration failed. Please try again.",
    };
  }
}

