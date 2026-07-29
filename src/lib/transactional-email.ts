import { sendSmtpMail, type SmtpMailPayload } from "@/lib/smtp-mail";

export type TransactionalMailPayload = SmtpMailPayload;

async function sendViaResend(
  payload: TransactionalMailPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set." };
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    "SwingTradingLog <onboarding@resend.dev>";

  const to = Array.isArray(payload.to) ? payload.to : [payload.to];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      id?: string;
    };

    if (!response.ok) {
      const message =
        body.message ||
        `Resend API error (${response.status})`;
      console.error("[email] Resend failed:", message);
      return { ok: false, error: message };
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Resend send error";
    console.error("[email] Resend failed:", message);
    return { ok: false, error: message };
  }
}

/** Resend (API key) first, then optional SMTP fallback. Server-only env. */
export async function sendTransactionalEmail(
  payload: TransactionalMailPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(payload);
  }

  return sendSmtpMail(payload);
}

export function isTransactionalEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_USER?.trim() &&
        process.env.SMTP_PASSWORD?.trim())
  );
}
