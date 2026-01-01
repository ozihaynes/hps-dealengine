/**
 * Email templates for intake flow
 *
 * Professional HTML email templates with plain text fallbacks.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Format a date string for display in emails
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Base HTML template wrapper
 */
function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${content}
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    HPS DealEngine - Secure Property Intake<br>
    This is an automated message. Please do not reply directly.
  </p>
</body>
</html>`;
}

/**
 * Escape HTML entities for safe display
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Email template for initial intake link
 */
export function intakeLinkEmail(
  recipientName: string | null,
  intakeUrl: string,
  expiresAt: string,
  dealAddress: string,
): EmailContent {
  const name = escapeHtml(recipientName || "there");
  const address = escapeHtml(dealAddress);
  const expiry = formatDate(expiresAt);

  return {
    subject: `Action Required: Property Information for ${dealAddress}`,
    html: baseTemplate(`
      <h2 style="color: #1e3a5f; margin-bottom: 24px;">Property Information Request</h2>
      <p>Hi ${name},</p>
      <p>We need some information about the property at:</p>
      <p style="background: #f5f5f5; padding: 12px 16px; border-radius: 6px; font-weight: 600;">
        ${address}
      </p>
      <p>Please click the button below to fill out a short form. It should only take a few minutes.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${intakeUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          Complete Property Form
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link expires on <strong>${expiry}</strong>
      </p>
      <p style="color: #888; font-size: 13px; margin-top: 24px;">
        If you didn't expect this email or have questions, please contact us.
      </p>
    `),
    text: `Hi ${recipientName || "there"},

We need some information about the property at: ${dealAddress}

Please visit this link to complete the form:
${intakeUrl}

This link expires on ${expiry}.

If you didn't expect this email, you can safely ignore it.

- HPS DealEngine`,
  };
}

/**
 * Email template for revision request
 */
export function revisionRequestEmail(
  recipientName: string | null,
  intakeUrl: string,
  expiresAt: string,
  dealAddress: string,
  staffNotes: string,
): EmailContent {
  const name = escapeHtml(recipientName || "there");
  const address = escapeHtml(dealAddress);
  const notes = escapeHtml(staffNotes);
  const expiry = formatDate(expiresAt);

  return {
    subject: `Revision Requested: ${dealAddress}`,
    html: baseTemplate(`
      <h2 style="color: #7c3aed; margin-bottom: 24px;">Revision Requested</h2>
      <p>Hi ${name},</p>
      <p>We need some additional information or corrections for the property at:</p>
      <p style="background: #f5f5f5; padding: 12px 16px; border-radius: 6px; font-weight: 600;">
        ${address}
      </p>
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 600; color: #92400e;">Notes from our team:</p>
        <p style="margin: 8px 0 0 0; color: #78350f;">${notes}</p>
      </div>
      <p>Please click below to update your submission:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${intakeUrl}" style="background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          Update Property Form
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This new link expires on <strong>${expiry}</strong>
      </p>
    `),
    text: `Hi ${recipientName || "there"},

We need some additional information or corrections for the property at: ${dealAddress}

Notes from our team:
${staffNotes}

Please visit this link to update your submission:
${intakeUrl}

This link expires on ${expiry}.

- HPS DealEngine`,
  };
}

/**
 * Email template for submission confirmation
 */
export function submissionConfirmationEmail(
  recipientName: string | null,
  dealAddress: string,
): EmailContent {
  const name = escapeHtml(recipientName || "there");
  const address = escapeHtml(dealAddress);

  return {
    subject: `Received: Property Information for ${dealAddress}`,
    html: baseTemplate(`
      <h2 style="color: #059669; margin-bottom: 24px;">Submission Received</h2>
      <p>Hi ${name},</p>
      <p>Thank you! We've received your property information for:</p>
      <p style="background: #f5f5f5; padding: 12px 16px; border-radius: 6px; font-weight: 600;">
        ${address}
      </p>
      <p>Our team will review your submission and reach out if we need anything else.</p>
      <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #065f46;">
          <strong>What happens next?</strong><br>
          We'll analyze the information you provided and get back to you within 1-2 business days.
        </p>
      </div>
      <p style="color: #666; font-size: 14px;">
        If you have questions in the meantime, feel free to reach out to your contact.
      </p>
    `),
    text: `Hi ${recipientName || "there"},

Thank you! We've received your property information for: ${dealAddress}

Our team will review your submission and reach out if we need anything else.

What happens next?
We'll analyze the information you provided and get back to you within 1-2 business days.

- HPS DealEngine`,
  };
}
