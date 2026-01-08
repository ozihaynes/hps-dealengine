/**
 * Resend email integration with graceful fallback
 *
 * Uses Resend API for transactional email delivery.
 * Falls back to console.log when RESEND_API_KEY is not set (local dev).
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";
// Using Resend default sender until custom domain is verified
const DEFAULT_FROM = "HPS DealEngine <onboarding@resend.dev>";

/**
 * Send an email via Resend API
 *
 * @param params - Email parameters (to, subject, html, text, replyTo)
 * @returns SendEmailResult with success status and messageId or error
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");

  // Fallback to console.log if no API key (local dev mode)
  if (!apiKey) {
    console.log("[EMAIL STUB - No RESEND_API_KEY]", {
      to: params.to,
      subject: params.subject,
      htmlPreview: params.html.substring(0, 200) + "...",
    });
    return { success: true, messageId: `stub-${Date.now()}` };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: DEFAULT_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[EMAIL ERROR]", response.status, data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    console.log("[EMAIL SENT]", { to: params.to, messageId: data.id });
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("[EMAIL EXCEPTION]", error);
    return { success: false, error: String(error) };
  }
}
