import type { Env } from "../types/env";

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Validate API key from request headers
 * If API_KEY is not set in environment, authentication is skipped
 *
 * @param request - The incoming request
 * @param env - Environment variables
 * @returns AuthResult indicating success or failure
 */
export function validateApiKey(request: Request, env: Env): AuthResult {
  // If no API key is configured, skip authentication
  if (!env.API_KEY) {
    return { success: true };
  }

  // Check for API key in headers
  const apiKey =
    request.headers.get("X-API-Key") ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return {
      success: false,
      error:
        "Missing API key. Provide via X-API-Key header or Authorization: Bearer <key>",
    };
  }

  // Constant-time comparison to prevent timing attacks
  if (!secureCompare(apiKey, env.API_KEY)) {
    return {
      success: false,
      error: "Invalid API key",
    };
  }

  return { success: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
