import type { Action, ActionPayload, ActionResult } from './types';

/**
 * Telegram Bot API response interface
 */
interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: unknown;
}

/**
 * Telegram notification action
 * Sends messages via Telegram Bot API
 */
export class TelegramAction implements Action {
  private readonly apiUrl: string;

  constructor(
    private readonly botToken: string,
    private readonly chatId: string
  ) {
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Validate that the action is properly configured
   */
  validate(): boolean {
    return Boolean(this.botToken && this.chatId);
  }

  /**
   * Format the message for Telegram.
   * Extracts all fields from the payload, escapes and trims their string values.
   */
  private formatMessage(payload: ActionPayload): string {
    const fields: string[] = [];

    // Handle subject
    if (payload.subject && typeof payload.subject === 'string' && payload.subject.trim()) {
      fields.push(`<b>${this.escapeHtml(payload.subject.trim())}</b>`);
    }

    // Handle message
    if (payload.message && typeof payload.message === 'string' && payload.message.trim()) {
      fields.push(this.escapeHtml(payload.message.trim()));
    }

    // Handle metadata (flatten and format as key: value per line)
    if (payload.metadata && typeof payload.metadata === 'object') {
      for (const [key, value] of Object.entries(payload.metadata)) {
        // Stringify value, escape HTML, and trim
        let str = '';
        if (typeof value === 'string') {
          str = this.escapeHtml(value.trim());
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          str = this.escapeHtml(String(value));
        } else if (value != null) {
          str = this.escapeHtml(JSON.stringify(value));
        }
        if (str) {
          fields.push(`<b>${this.escapeHtml(key)}:</b> ${str}`);
        }
      }
    }

    return fields.join('\n');
  }

  /**
   * Escape HTML special characters for Telegram HTML parse mode
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Send a message to Telegram
   */
  async execute(payload: ActionPayload): Promise<ActionResult> {
    if (!this.validate()) {
      return {
        success: false,
        message: 'Telegram action is not properly configured',
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: this.formatMessage(payload),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data: TelegramResponse = await response.json();

      if (!response.ok || !data.ok) {
        return {
          success: false,
          message: data.description || 'Failed to send Telegram message',
          data,
        };
      }

      return {
        success: true,
        message: 'Notification sent successfully',
        data: data.result,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

