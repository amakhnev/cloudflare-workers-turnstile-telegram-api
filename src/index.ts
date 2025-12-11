/**
 * Cloudflare Workers Turnstile Telegram API
 *
 * A lightweight REST API for headless notifications to Telegram
 * with Cloudflare Turnstile verification and optional API key authentication.
 */

import { TelegramAction, type ActionPayload } from "./actions";
import { validateApiKey, verifyTurnstile } from "./middleware";
import type { Env } from "./types/env";
import { errorResponse, successResponse, withCors } from "./utils/response";

/**
 * Expected request body structure
 */
interface NotificationRequest {
  /** Turnstile token from the client widget */
  turnstile_token: string;

  /** Message body to send */
  message: string;

  /** Optional subject/title */
  subject?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Get allowed CORS origin
 */
function getAllowedOrigin(request: Request, env: Env): string {
  const requestOrigin = request.headers.get("Origin") || "*";
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(",").map((o) =>
    o.trim(),
  ) || ["*"];

  if (allowedOrigins.includes("*")) {
    return "*";
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] || "*";
}

/**
 * Handle CORS preflight requests
 */
function handleOptions(request: Request, env: Env): Response {
  const origin = getAllowedOrigin(request, env);

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Handle health check endpoint
 */
function handleHealthCheck(env: Env): Response {
  const status = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    config: {
      turnstile: Boolean(env.TURNSTILE_SECRET_KEY),
      telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
      apiKeyRequired: Boolean(env.API_KEY),
    },
  };

  return successResponse("Service is healthy", status);
}

/**
 * Handle notification endpoint
 */
async function handleNotification(
  request: Request,
  env: Env,
): Promise<Response> {
  // 1. Validate API key (if configured)
  const authResult = validateApiKey(request, env);
  if (!authResult.success) {
    return errorResponse(authResult.error || "Authentication failed", 401);
  }

  // Parse request body
  let body: NotificationRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Validate required fields
  if (!body.turnstile_token) {
    return errorResponse("Missing required field: turnstile_token", 400);
  }

  if (!body.message) {
    return errorResponse("Missing required field: message", 400);
  }

  // 2. Verify Turnstile token
  const clientIp = request.headers.get("CF-Connecting-IP") || undefined;
  const turnstileResult = await verifyTurnstile(
    body.turnstile_token,
    env,
    clientIp,
  );

  if (!turnstileResult.success) {
    return errorResponse(
      turnstileResult.error || "Turnstile verification failed",
      403,
    );
  }

  // 3. Execute action (send notification)
  const action = new TelegramAction(
    env.TELEGRAM_BOT_TOKEN,
    env.TELEGRAM_CHAT_ID,
  );

  if (!action.validate()) {
    return errorResponse("Telegram action not properly configured", 500);
  }

  const payload: ActionPayload = {
    message: body.message,
    subject: body.subject,
    metadata: body.metadata,
  };

  const result = await action.execute(payload);

  if (!result.success) {
    return errorResponse(result.message, 500);
  }

  return successResponse(result.message);
}

/**
 * Main request handler
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return handleOptions(request, env);
  }

  let response: Response;

  // Route requests
  switch (path) {
    case "/":
    case "/health":
      response = handleHealthCheck(env);
      break;

    case "/notify":
    case "/api/notify":
      if (method !== "POST") {
        response = errorResponse("Method not allowed. Use POST.", 405);
      } else {
        response = await handleNotification(request, env);
      }
      break;

    default:
      response = errorResponse("Not found", 404);
  }

  // Add CORS headers
  const origin = getAllowedOrigin(request, env);
  return withCors(response, origin);
}

/**
 * Worker entry point
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("Unhandled error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
} satisfies ExportedHandler<Env>;
