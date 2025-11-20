import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";

/**
 * JWT Token Configuration
 * Handles token generation, verification, and cookie management
 * Uses jose library for Edge runtime compatibility (works in middleware and server actions)
 */

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

// Convert secret to Uint8Array for jose
const getSecretKey = () => {
  const encoder = new TextEncoder();
  return encoder.encode(JWT_SECRET);
};

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  roles: string[];
}

/**
 * Generate JWT token for user
 * @param payload - User data to encode in token
 * @returns JWT token string
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey);
}

/**
 * Verify and decode JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 * @param token - JWT token to store
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  
  cookieStore.set("auth-token", token, {
    httpOnly: true, // Prevents XSS attacks
    secure: isProduction, // HTTPS only in production
    sameSite: "lax", // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    // Add domain restriction in production if needed
    // domain: isProduction ? ".yourdomain.com" : undefined,
  });
}

/**
 * Get authentication token from cookie
 * @returns JWT token or null
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth-token")?.value || null;
}

/**
 * Remove authentication cookie (logout)
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}

/**
 * Get current user from JWT token
 * @returns User payload or null
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return await verifyToken(token);
}

