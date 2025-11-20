import { cookies } from "next/headers";
import { randomBytes } from "crypto";

/**
 * CSRF Protection Utility
 * Generates and validates CSRF tokens for form submissions
 */

const CSRF_TOKEN_NAME = "csrf-token";
const CSRF_TOKEN_EXPIRY = 60 * 60; // 1 hour

/**
 * Generate a new CSRF token
 */
export async function generateCSRFToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CSRF_TOKEN_EXPIRY,
    path: "/",
  });

  return token;
}

/**
 * Get current CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value || null;
}

/**
 * Validate CSRF token
 * @param token - Token to validate
 * @returns true if valid, false otherwise
 */
export async function validateCSRFToken(token: string): Promise<boolean> {
  const storedToken = await getCSRFToken();
  
  if (!storedToken || !token) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(storedToken, token);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks when comparing tokens
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

