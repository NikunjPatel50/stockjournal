import nodemailer from "nodemailer";

export type SmtpMailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

function smtpConfigFromEnv() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure =
    process.env.SMTP_SECURE === "false"
      ? false
      : port === 465 || process.env.SMTP_SECURE === "true";

  const fromEmail = process.env.SMTP_FROM?.trim() || user;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "SwingTradingLog";

  return {
    transport: { host, port, secure, auth: { user, pass } },
    from: { name: fromName, address: fromEmail },
  };
}

export function isSmtpConfigured() {
  return smtpConfigFromEnv() !== null;
}

/** Sends mail via SMTP (e.g. Gmail App Password). Server-only env vars. */
export async function sendSmtpMail(
  payload: SmtpMailPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = smtpConfigFromEnv();
  if (!config) {
    return {
      ok: false,
      error:
        "SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD).",
    };
  }

  try {
    const transporter = nodemailer.createTransport(config.transport);
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown SMTP send error";
    console.error("[smtp] send failed:", message);
    return { ok: false, error: message };
  }
}
