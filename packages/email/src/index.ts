/**
 * Transactional email.
 *
 * Two ways out, and the operator picks:
 *
 *   SMTP configured   -> the message is sent through the operator's own
 *                        provider, from their own domain.
 *   no SMTP           -> the message is written to the mail_outbox table and
 *                        logged. Nothing leaves the machine. This is how the
 *                        local development and the test run work.
 *
 * There is no third-party service baked in. The templates are ours.
 */

import nodemailer from "nodemailer";
import postgres from "postgres";

export type MailKind =
  | "verification"
  | "password_reset"
  | "workspace_created"
  | "invitation"
  | "bulk_complete"
  | "webhook_failed";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: MailKind;
}

/* -------------------------------------------------------------------------
 * Templates. Written fresh; none of them are taken from anywhere.
 * ------------------------------------------------------------------------- */

const BRAND = "Steadlink";

function shell(heading: string, body: string, action?: { label: string; url: string }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6fa;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#272d36">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
        <tr><td>
          <p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5b6470">${BRAND}</p>
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700">${heading}</h1>
          <div style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5b6470">${body}</div>
          ${
            action
              ? `<p style="margin:0 0 24px"><a href="${action.url}" style="display:inline-block;background:#0c5b4a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px">${action.label}</a></p>
                 <p style="margin:0 0 24px;font-size:13px;color:#8a9099">If the button does not work, copy this into your browser:<br><span style="font-family:ui-monospace,Menlo,monospace">${action.url}</span></p>`
              : ""
          }
          <p style="margin:0;font-size:13px;line-height:1.6;color:#8a9099">You are getting this because someone set up an ${BRAND} workspace with this address. If that was not you, ignore this message.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function verificationEmail(to: string, token: string): Mail {
  const url = `${process.env.APP_URL ?? "http://localhost:3210"}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to,
    kind: "verification",
    subject: `Confirm your ${BRAND} email address`,
    html: shell(
      "Confirm your email address",
      "One more step and your account is ready. Confirm this address so we know we can reach you about your links.",
      { label: "Confirm my address", url },
    ),
    text: `Confirm your email address: ${url}`,
  };
}

export function passwordResetEmail(to: string, token: string): Mail {
  const url = `${process.env.APP_URL ?? "http://localhost:3210"}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    kind: "password_reset",
    subject: `Reset your ${BRAND} password`,
    html: shell(
      "Reset your password",
      "Someone asked to reset the password for this account. The link works once and expires in 30 minutes. If it was not you, nothing has changed.",
      { label: "Choose a new password", url },
    ),
    text: `Reset your password: ${url}`,
  };
}

export function invitationEmail(to: string, orgName: string, token: string): Mail {
  const url = `${process.env.APP_URL ?? "http://localhost:3210"}/accept-invitation?token=${encodeURIComponent(token)}`;
  return {
    to,
    kind: "invitation",
    subject: `You have been added to ${orgName} on ${BRAND}`,
    html: shell(
      `Join ${orgName}`,
      "You have been added to a workspace. You will be able to see its links, codes and pages straight away.",
      { label: "Open the workspace", url },
    ),
    text: `You have been added to ${orgName}: ${url}`,
  };
}

export function bulkCompleteEmail(
  to: string,
  filename: string,
  created: number,
  failed: number,
): Mail {
  return {
    to,
    kind: "bulk_complete",
    subject: `Your upload of ${filename} is ready`,
    html: shell(
      "Your upload is ready",
      `We shortened ${created} ${created === 1 ? "link" : "links"} from ${filename}.${
        failed > 0
          ? ` ${failed} ${failed === 1 ? "row was" : "rows were"} rejected, and you can see why in the bulk upload log.`
          : ""
      }`,
    ),
    text: `We shortened ${created} links from ${filename}. ${failed} rows were rejected.`,
  };
}

export function webhookFailedEmail(to: string, name: string, status: number): Mail {
  return {
    to,
    kind: "webhook_failed",
    subject: `${name} is not delivering`,
    html: shell(
      "A webhook stopped delivering",
      `The webhook ${name} last answered with ${status}. We will keep retrying on a slower schedule. Check the URL and the signing secret, then send a test event.`,
    ),
    text: `The webhook ${name} last answered with ${status}.`,
  };
}

/* -------------------------------------------------------------------------
 * Sending
 * ------------------------------------------------------------------------- */

let transport: import("nodemailer").Transporter | null = null;

function smtpTransport(): import("nodemailer").Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transport;
}

/**
 * Send a message, or park it in the outbox when there is no SMTP configured.
 *
 * The outbox is not a fallback that is easy to forget: it is how a
 * self-hosted install without a mail provider behaves, and the local
 * development reads the same table.
 */
export async function send(mail: Mail): Promise<{ delivered: boolean; reason?: string }> {
  const smtp = smtpTransport();

  if (!smtp) {
    await record(mail, "sent");
    console.log(`[mail] no SMTP configured, parked in the outbox: ${mail.subject} -> ${mail.to}`);
    return { delivered: false, reason: "no SMTP configured" };
  }

  try {
    await smtp.sendMail({
      from: process.env.SMTP_FROM ?? `Steadlink <no-reply@${process.env.SMTP_HOST}>`,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    await record(mail, "sent");
    return { delivered: true };
  } catch (error) {
    await record(mail, "failed", (error as Error).message);
    return { delivered: false, reason: (error as Error).message };
  }
}

async function record(mail: Mail, status: "sent" | "failed", error?: string) {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await client`
      insert into mail_outbox (to, subject, html, text, kind, status, error, sent_at)
      values (
        ${mail.to}, ${mail.subject}, ${mail.html}, ${mail.text}, ${mail.kind},
        ${status}, ${error ?? null}, ${status === "sent" ? new Date() : null}
      )
    `;
  } catch {
    // The outbox is a convenience. A failure to record must not stop the
    // message from being sent.
  } finally {
    await client.end();
  }
}

export async function sendVerificationEmail(to: string, token: string) {
  return send(verificationEmail(to, token));
}

export async function sendPasswordReset(to: string, token: string) {
  return send(passwordResetEmail(to, token));
}

export async function sendInvitation(to: string, orgName: string, token: string) {
  return send(invitationEmail(to, orgName, token));
}

export async function sendBulkComplete(
  to: string,
  filename: string,
  created: number,
  failed: number,
) {
  return send(bulkCompleteEmail(to, filename, created, failed));
}

export async function sendWebhookFailed(to: string, name: string, status: number) {
  return send(webhookFailedEmail(to, name, status));
}
