import { z } from "zod";

/**
 * Environment Variables Validation
 * Ensures all required environment variables are set and valid
 * Throws error on startup if configuration is invalid
 */

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  
  // Application
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().optional(),
  
  // Optional OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  WHATSAPP_CLIENT_ID: z.string().optional(),
  WHATSAPP_CLIENT_SECRET: z.string().optional(),
  
  // Default Admin (only for seeding)
  DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
  DEFAULT_ADMIN_USERNAME: z.string().min(3).optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).optional(),
});

/**
 * Validated environment variables
 * Access this instead of process.env directly
 */
export const env = (() => {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
      NODE_ENV: process.env.NODE_ENV || "development",
      APP_URL: process.env.APP_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      WHATSAPP_CLIENT_ID: process.env.WHATSAPP_CLIENT_ID,
      WHATSAPP_CLIENT_SECRET: process.env.WHATSAPP_CLIENT_SECRET,
      DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
      DEFAULT_ADMIN_USERNAME: process.env.DEFAULT_ADMIN_USERNAME,
      DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join(".")).join(", ");
      throw new Error(
        `❌ Invalid environment variables: ${missingVars}\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `Error details: ${error.message}`
      );
    }
    throw error;
  }
})();

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === "development";

