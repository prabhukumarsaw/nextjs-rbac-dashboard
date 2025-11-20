import { logError } from "./logger";
import { z } from "zod";

/**
 * Error Handler Utility
 * Provides consistent error handling across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: z.ZodError["errors"]) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

/**
 * Handle errors in server actions
 * Logs error and returns user-friendly response
 */
export function handleServerActionError(error: unknown): { success: false; error: string } {
  // Log the error for monitoring
  if (error instanceof Error) {
    logError("Server action error", error, {
      name: error.name,
      message: error.message,
    });
  } else {
    logError("Unknown server action error", undefined, { error });
  }

  // Return user-friendly error message
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: error.errors[0]?.message || "Validation error",
    };
  }

  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Don't expose internal error details
  return {
    success: false,
    error: "An unexpected error occurred. Please try again later.",
  };
}

