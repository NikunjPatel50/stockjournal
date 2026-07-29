/**
 * Sends a sample feedback notification to FEEDBACK_INBOX.
 * Loads .env.local and uses Resend (preferred) or SMTP.
 *
 * Setup (no Gmail App Password): https://resend.com → API Keys
 * Add to .env.local:
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM=SwingTradingLog <onboarding@resend.dev>
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const FEEDBACK_INBOX = "nicksofficialindia@gmail.com";

const subject = "[SwingTradingLog] General feedback (email test)";
const text =
  "SwingTradingLog feedback test\n\n" +
  "Category: General\n" +
  "This message was sent by scripts/test-feedback-smtp.mjs to verify delivery.";

const html = `
  <h2>SwingTradingLog feedback (test)</h2>
  <p><strong>Category:</strong> General</p>
  <p><strong>Name:</strong> Email test script</p>
  <p><strong>Email:</strong> test@swingtradinglog.com</p>
  <hr />
  <p>If you received this, feedback inbox email is working.</p>
`.trim();

async function sendViaResend() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  const from =
    process.env.RESEND_FROM?.trim() ||
    "SwingTradingLog <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [FEEDBACK_INBOX],
      subject,
      html,
      text,
      reply_to: "test@swingtradinglog.com",
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.message || `Resend API error (${response.status})`
    );
  }
  return body;
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  if (!host || !user || !pass) return null;

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

async function sendViaSmtp() {
  const config = smtpConfig();
  if (!config) return null;

  const transporter = nodemailer.createTransport(config.transport);
  return transporter.sendMail({
    from: config.from,
    to: FEEDBACK_INBOX,
    subject,
    text,
    html,
    replyTo: "test@swingtradinglog.com",
  });
}

try {
  if (process.env.RESEND_API_KEY?.trim()) {
    const result = await sendViaResend();
    console.log("OK — sent via Resend to", FEEDBACK_INBOX);
    if (result?.id) console.log("Message ID:", result.id);
    process.exit(0);
  }

  const smtpResult = await sendViaSmtp();
  if (smtpResult) {
    console.log("OK — sent via SMTP to", FEEDBACK_INBOX);
    console.log("Message ID:", smtpResult.messageId);
    process.exit(0);
  }

  console.error(
    "No email provider configured. Easiest option (no Gmail App Password):\n" +
      "  1. Sign up at https://resend.com with nicksofficialindia@gmail.com\n" +
      "  2. Create an API key\n" +
      "  3. Add to .env.local:\n" +
      "       RESEND_API_KEY=re_xxxxxxxx\n" +
      "       RESEND_FROM=SwingTradingLog <onboarding@resend.dev>\n" +
      "  4. Run: npm run test:feedback-email\n"
  );
  process.exit(1);
} catch (err) {
  console.error("Send failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
