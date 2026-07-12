/**
 * Mock mailer for TransitOps
 *
 * This module provides a MOCK email sender used for feature development and
 * testing without a real SMTP server or external dependencies. Emails are
 * logged to the console and retained in an in-memory buffer for debugging.
 *
 * Requirement 13 (bonus): Email reminders for expiring driver licenses.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface SentEmail extends EmailMessage {
  sentAt: Date;
}

// In-memory record of "sent" emails (useful for debugging / inspection).
const sentEmails: SentEmail[] = [];

/**
 * Mock email sender. Logs the email to the console, stores it in memory, and
 * resolves with { ok: true }. Does not perform any real network I/O.
 *
 * @param message - The email to "send" (recipient, subject, body)
 * @returns Promise resolving to { ok: true }
 */
export async function sendEmail({
  to,
  subject,
  body,
}: EmailMessage): Promise<{ ok: true }> {
  const email: SentEmail = { to, subject, body, sentAt: new Date() };
  sentEmails.push(email);

  // eslint-disable-next-line no-console
  console.log(
    `[MockMailer] Email sent\n  To: ${to}\n  Subject: ${subject}\n  Body:\n${body}`
  );

  return { ok: true };
}

/**
 * Returns the list of emails "sent" through the mock mailer.
 * Intended for debugging and inspection.
 */
export function getSentEmails(): SentEmail[] {
  return sentEmails;
}
