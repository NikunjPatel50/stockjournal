"use server";

import { FEEDBACK_INBOX, escapeHtml } from "@/lib/feedback";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export type ChatbotLeadQuestion = {
  question: string;
  answer: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitChatbotLeadAction(input: {
  email: string;
  questions: ChatbotLeadQuestion[];
  pagePath?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const questions = input.questions.filter(
    (item) => item.question.trim() && item.answer.trim()
  );
  const pagePath = input.pagePath?.trim() || null;

  if (!email || !isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (questions.length < 3) {
    return {
      ok: false,
      error: "Ask at least three questions before sharing your email.",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("chatbot_leads").insert({
      email,
      questions,
      page_path: pagePath,
    });

    if (error) {
      console.error("[chatbot-lead] database insert failed:", error.message);
      return {
        ok: false,
        error: "We couldn't save your email. Please try again in a moment.",
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    console.error("[chatbot-lead] insert error:", message);
    return {
      ok: false,
      error: "We couldn't save your email. Please try again in a moment.",
    };
  }

  const transcript = questions
    .map(
      (item, index) =>
        `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`
    )
    .join("\n\n");

  const html = `
    <h2>SwingTradingLog chatbot lead</h2>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${pagePath ? `<p><strong>Page:</strong> ${escapeHtml(pagePath)}</p>` : ""}
    <hr />
    <pre style="font-family: ui-monospace, monospace; white-space: pre-wrap;">${escapeHtml(transcript)}</pre>
  `.trim();

  const text = [
    "SwingTradingLog chatbot lead",
    `Email: ${email}`,
    pagePath ? `Page: ${pagePath}` : null,
    "",
    transcript,
  ]
    .filter((line) => line !== null)
    .join("\n");

  void sendTransactionalEmail({
    to: FEEDBACK_INBOX,
    subject: `[SwingTradingLog] Chatbot lead — ${email}`,
    html,
    text,
    replyTo: email,
  });

  return { ok: true };
}
