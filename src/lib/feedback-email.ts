import { escapeHtml, FEEDBACK_INBOX } from "@/lib/feedback";
import { sendTransactionalEmail } from "@/lib/transactional-email";

type FeedbackEmailInput = {
  name: string;
  email: string;
  category: string;
  message: string;
};

export function buildFeedbackEmailContent(
  input: FeedbackEmailInput,
  userId: string | null
) {
  const subject = `[SwingTradingLog] ${input.category} feedback`;
  const html = `
    <h2>SwingTradingLog feedback</h2>
    <p><strong>Category:</strong> ${escapeHtml(input.category)}</p>
    <p><strong>Name:</strong> ${escapeHtml(input.name || "—")}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    ${userId ? `<p><strong>User ID:</strong> ${escapeHtml(userId)}</p>` : ""}
    <hr />
    <pre style="font-family: ui-monospace, monospace; white-space: pre-wrap;">${escapeHtml(input.message)}</pre>
  `.trim();

  const text = [
    "SwingTradingLog feedback",
    `Category: ${input.category}`,
    `Name: ${input.name || "—"}`,
    `Email: ${input.email}`,
    userId ? `User ID: ${userId}` : null,
    "",
    input.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html, text };
}

/** Best-effort inbox notification; does not block the thank-you UX. */
export async function notifyFeedbackInbox(
  input: FeedbackEmailInput,
  userId: string | null
) {
  const { subject, html, text } = buildFeedbackEmailContent(input, userId);

  const result = await sendTransactionalEmail({
    to: FEEDBACK_INBOX,
    subject,
    html,
    text,
    replyTo: input.email,
  });

  if (!result.ok) {
    console.warn("[feedback] email notify failed:", result.error);
  }

  return result;
}
