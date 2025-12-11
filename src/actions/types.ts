/**
 * Action abstraction layer
 * This interface allows easy replacement of notification actions
 */

export interface ActionPayload {
  /** The message/body content to be sent */
  message: string;

  /** Optional subject/title for the notification */
  subject?: string;

  /** Optional metadata for the action */
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  /** Whether the action was successful */
  success: boolean;

  /** Human-readable message about the result */
  message: string;

  /** Optional additional data from the action */
  data?: unknown;
}

/**
 * Action interface - implement this to create new notification actions
 *
 * @example
 * ```typescript
 * class SlackAction implements Action {
 *   constructor(private webhookUrl: string) {}
 *
 *   async execute(payload: ActionPayload): Promise<ActionResult> {
 *     // Send to Slack webhook
 *   }
 * }
 * ```
 */
export interface Action {
  /** Execute the action with the given payload */
  execute(payload: ActionPayload): Promise<ActionResult>;

  /** Optional: Validate that the action is properly configured */
  validate?(): boolean;
}
