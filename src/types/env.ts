/**
 * Environment variables interface for the Worker
 * Secrets should be set via `wrangler secret put <SECRET_NAME>`
 */
export interface Env {
  /** Cloudflare Turnstile secret key (required) */
  TURNSTILE_SECRET_KEY: string;

  /** Telegram bot token (required for Telegram action) */
  TELEGRAM_BOT_TOKEN: string;

  /** Telegram chat ID to send notifications to (required for Telegram action) */
  TELEGRAM_CHAT_ID: string;

  /** Optional API key for request authentication */
  API_KEY?: string;

  /** Optional: Allowed origins for CORS (comma-separated, defaults to "*") */
  ALLOWED_ORIGINS?: string;
}

