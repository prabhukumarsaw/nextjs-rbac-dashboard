import { headers } from "next/headers";

/**
 * Request ID Utility
 * Generates unique request IDs for distributed tracing
 */

/**
 * Get or generate request ID from headers
 * Useful for tracking requests across services
 */
export async function getRequestId(): Promise<string> {
  const headersList = await headers();
  const existingId = headersList.get("x-request-id");
  
  if (existingId) {
    return existingId;
  }

  // Generate new request ID if not present
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Add request ID to response headers
 */
export function addRequestIdHeader(response: Response, requestId: string): Response {
  response.headers.set("x-request-id", requestId);
  return response;
}

