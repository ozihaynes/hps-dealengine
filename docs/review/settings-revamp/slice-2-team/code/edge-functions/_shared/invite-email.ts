/**
 * Team invitation email template
 *
 * Beautiful dark glassmorphic design matching the HPS DealEngine app aesthetic.
 * Uses Resend API via shared email.ts.
 */

import { sendEmail } from "./email.ts";

/**
 * Invite email parameters
 */
export interface InviteEmailParams {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}

/**
 * Role display names for email
 */
const ROLE_DISPLAY: Record<string, string> = {
  analyst: "Underwriter",
  manager: "Manager",
  vp: "VP",
};

/**
 * Sends a beautifully designed invitation email
 * Dark glassmorphic design matching app aesthetic
 */
export async function sendInviteEmail(
  params: InviteEmailParams
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { to, inviterName, orgName, role, acceptUrl, expiresAt } = params;

  // Format expiry date for display
  const expiresDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleDisplay =
    ROLE_DISPLAY[role] || role.charAt(0).toUpperCase() + role.slice(1);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>You're Invited to ${escapeHtml(orgName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">

          <!-- Header -->
          <tr>
            <td style="padding: 48px 40px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
                HPS DealEngine
              </h1>
              <p style="color: rgba(255, 255, 255, 0.5); font-size: 14px; margin: 8px 0 0; font-weight: 400;">
                Underwriting Intelligence Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px; font-weight: 600;">
                You've been invited!
              </h2>

              <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                <strong style="color: #ffffff;">${escapeHtml(inviterName)}</strong> has invited you to join
                <strong style="color: #ffffff;">${escapeHtml(orgName)}</strong> as a
                <span style="color: #22c55e; font-weight: 600;">${escapeHtml(roleDisplay)}</span>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding: 8px 0 40px;">
                    <a href="${escapeHtml(acceptUrl)}"
                       style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; text-align: center;">
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0;">
                  This invitation expires on <strong style="color: rgba(255, 255, 255, 0.8);">${escapeHtml(expiresDate)}</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 13px; margin: 0; text-align: center; line-height: 1.6;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>

        <p style="color: rgba(255, 255, 255, 0.3); font-size: 12px; margin: 24px 0 0; text-align: center;">
          &copy; ${new Date().getFullYear()} HPS DealEngine
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
You've been invited to ${orgName}!

${inviterName} has invited you to join ${orgName} as a ${roleDisplay}.

Accept your invitation: ${acceptUrl}

This invitation expires on ${expiresDate}.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  try {
    const result = await sendEmail({
      to,
      subject: `You're invited to join ${orgName} on HPS DealEngine`,
      html,
      text,
    });
    return result;
  } catch (error) {
    console.error("[invite-email] Failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Escape HTML entities to prevent XSS in email templates
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
