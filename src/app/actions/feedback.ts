"use server";

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_CHARS,
  type FeedbackCategory,
} from "@/lib/feedback";
import { notifyFeedbackInbox } from "@/lib/feedback-email";
import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

type FeedbackInput = {
  name: string;
  email: string;
  category: FeedbackCategory;
  message: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function persistFeedback(
  input: FeedbackInput,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("feedback_submissions").insert({
    user_id: userId,
    email: input.email,
    name: input.name,
    category: input.category,
    message: input.message,
  });

  if (error) {
    console.error("[feedback] database insert failed:", error.message);
    return {
      ok: false,
      error: "We couldn't save your feedback. Please try again in a moment.",
    };
  }

  return { ok: true };
}

export async function submitFeedbackAction(input: FeedbackInput) {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  const category = input.category;

  if (!FEEDBACK_CATEGORIES.includes(category)) {
    return { ok: false as const, error: "Invalid category." };
  }

  if (!email || !isValidEmail(email)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  if (message.length < 10) {
    return {
      ok: false as const,
      error: "Please add a bit more detail (at least 10 characters).",
    };
  }

  if (message.length > FEEDBACK_MAX_CHARS) {
    return { ok: false as const, error: "Message is too long." };
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return { ok: false as const, error: "Sign in to send feedback." };
  }

  const payload = { name, email, category, message };
  const saved = await persistFeedback(payload, user.id);
  if (!saved.ok) {
    return { ok: false as const, error: saved.error };
  }

  const mailed = await notifyFeedbackInbox(payload, user.id);
  if (!mailed.ok) {
    console.error("[feedback] inbox email failed:", mailed.error);
  }

  return { ok: true as const };
}

export async function submitFeatureRequestAction(input: {
  message: string;
  email: string;
  name?: string;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return {
      ok: false as const,
      error: "Sign in to send feedback.",
    };
  }

  const email = (input.email || user.email || "").trim();
  const name = (input.name ?? "").trim();
  const message = input.message.trim();

  if (!email || !isValidEmail(email)) {
    return {
      ok: false as const,
      error: "We need your account email to send feedback.",
    };
  }

  if (message.length < 5) {
    return {
      ok: false as const,
      error: "Please share a little more detail.",
    };
  }

  if (message.length > FEEDBACK_MAX_CHARS) {
    return { ok: false as const, error: "Message is too long." };
  }

  const payload = {
    name,
    email,
    category: "Feature request" as FeedbackCategory,
    message,
  };

  const saved = await persistFeedback(payload, user.id);
  if (!saved.ok) {
    return { ok: false as const, error: saved.error };
  }

  const mailed = await notifyFeedbackInbox(payload, user.id);
  if (!mailed.ok) {
    console.error("[feedback] inbox email failed:", mailed.error);
  }

  return { ok: true as const };
}
