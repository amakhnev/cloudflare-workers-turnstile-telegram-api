import type { Env } from '../types/env';

/**
 * Cloudflare Turnstile verification response
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export interface TurnstileResult {
  success: boolean;
  error?: string;
  details?: TurnstileResponse;
}

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Error code descriptions for better debugging
 */
const ERROR_CODES: Record<string, string> = {
  'missing-input-secret': 'The secret parameter was not passed',
  'invalid-input-secret': 'The secret parameter was invalid or did not exist',
  'missing-input-response': 'The response parameter was not passed',
  'invalid-input-response': 'The response parameter is invalid or has expired',
  'invalid-widget-id': 'The widget ID extracted from the parsed site secret key was invalid',
  'invalid-parsed-secret': 'The secret extracted from the parsed site secret key was invalid',
  'bad-request': 'The request was rejected because it was malformed',
  'timeout-or-duplicate': 'The response parameter has already been validated before',
  'internal-error': 'An internal error happened while validating the response',
};

/**
 * Get human-readable error message from error codes
 */
function getErrorMessage(codes?: string[]): string {
  if (!codes || codes.length === 0) {
    return 'Unknown verification error';
  }

  return codes.map((code) => ERROR_CODES[code] || code).join('; ');
}

/**
 * Verify a Turnstile token
 *
 * @param token - The Turnstile response token from the client
 * @param env - Environment variables containing TURNSTILE_SECRET_KEY
 * @param remoteIp - Optional: The visitor's IP address
 * @returns TurnstileResult indicating success or failure
 */
export async function verifyTurnstile(
  token: string,
  env: Env,
  remoteIp?: string
): Promise<TurnstileResult> {
  if (!env.TURNSTILE_SECRET_KEY) {
    return {
      success: false,
      error: 'Turnstile secret key not configured',
    };
  }

  if (!token) {
    return {
      success: false,
      error: 'Missing Turnstile token',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);

    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data: TurnstileResponse = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: getErrorMessage(data['error-codes']),
        details: data,
      };
    }

    return {
      success: true,
      details: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify Turnstile token',
    };
  }
}

