export const FEEDBACK_INBOX = "nicksofficialindia@gmail.com";

/** Max characters for feature / product feedback messages. */
export const FEEDBACK_MAX_CHARS = 10_000;

export const FEEDBACK_CATEGORIES = [
  "General",
  "Bug report",
  "Feature request",
  "Other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFeedbackMailto(input: {
  name: string;
  email: string;
  category: string;
  message: string;
}) {
  const subject = encodeURIComponent(
    `[SwingTradingLog] ${input.category} feedback`
  );
  const body = encodeURIComponent(
    `Name: ${input.name || "(not provided)"}\nEmail: ${input.email}\nCategory: ${input.category}\n\n${input.message}`
  );
  return `mailto:${FEEDBACK_INBOX}?subject=${subject}&body=${body}`;
}
