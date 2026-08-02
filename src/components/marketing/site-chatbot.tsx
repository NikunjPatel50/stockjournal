"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { submitChatbotLeadAction } from "@/app/actions/chatbot-lead";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHATBOT_EMAIL_HELPER,
  CHATBOT_EMAIL_PROMPT,
  CHATBOT_EMAIL_STORAGE_KEY,
  CHATBOT_EMAIL_THANKS,
  CHATBOT_FALLBACK,
  CHATBOT_GREETING,
  CHATBOT_QUESTION_LIMIT,
  CHATBOT_QUICK_QUESTIONS,
  findChatbotEntryByQuestion,
  matchChatbotReply,
  type ChatbotLink,
} from "@/lib/chatbot-content";

type ChatRole = "bot" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  links?: ChatbotLink[];
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStoredEmail() {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(CHATBOT_EMAIL_STORAGE_KEY)?.trim();
  return value || null;
}

function storeEmail(email: string) {
  sessionStorage.setItem(CHATBOT_EMAIL_STORAGE_KEY, email);
}

function buildQuestionPairs(messages: ChatMessage[]) {
  const pairs: { question: string; answer: string }[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "user") continue;

    const next = messages[index + 1];
    pairs.push({
      question: message.text,
      answer: next?.role === "bot" ? next.text : CHATBOT_FALLBACK,
    });
  }

  return pairs;
}

function BotMessage({
  text,
  links,
}: {
  text: string;
  links?: ChatbotLink[];
}) {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
      <p>{text}</p>
      {links?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SiteChatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "greeting",
      role: "bot",
      text: CHATBOT_GREETING,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailPromptShownRef = useRef(false);

  const userQuestionCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );

  const needsEmail =
    userQuestionCount >= CHATBOT_QUESTION_LIMIT && !capturedEmail;

  const quickQuestions = useMemo(
    () =>
      needsEmail
        ? []
        : CHATBOT_QUICK_QUESTIONS.filter(
            (question) =>
              !messages.some(
                (message) => message.role === "user" && message.text === question
              )
          ).slice(0, 4),
    [messages, needsEmail]
  );

  useEffect(() => {
    setCapturedEmail(readStoredEmail());
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open, needsEmail, emailError]);

  useEffect(() => {
    if (!open) return;
    if (needsEmail) {
      emailRef.current?.focus();
      return;
    }
    inputRef.current?.focus();
  }, [open, needsEmail]);

  useEffect(() => {
    if (!needsEmail || emailPromptShownRef.current) return;
    emailPromptShownRef.current = true;
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: "bot",
        text: CHATBOT_EMAIL_PROMPT,
      },
    ]);
  }, [needsEmail]);

  function pushBotReply(question: string) {
    const entry =
      findChatbotEntryByQuestion(question) ?? matchChatbotReply(question);

    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: "bot",
        text: entry?.answer ?? CHATBOT_FALLBACK,
        links: entry?.links,
      },
    ]);
  }

  function handleAsk(question: string) {
    const trimmed = question.trim();
    if (!trimmed || needsEmail) return;

    setMessages((prev) => [
      ...prev,
      { id: createId(), role: "user", text: trimmed },
    ]);
    setInput("");
    pushBotReply(trimmed);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleAsk(input);
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!needsEmail || emailSubmitting) return;

    setEmailError(null);
    setEmailSubmitting(true);

    const result = await submitChatbotLeadAction({
      email: emailInput,
      questions: buildQuestionPairs(messages),
      pagePath: pathname,
    });

    setEmailSubmitting(false);

    if (!result.ok) {
      setEmailError(result.error);
      return;
    }

    const normalizedEmail = emailInput.trim().toLowerCase();
    storeEmail(normalizedEmail);
    setCapturedEmail(normalizedEmail);
    setEmailInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: "bot",
        text: CHATBOT_EMAIL_THANKS,
        links: [{ label: "Start free", href: "/login" }],
      },
    ]);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
      <div className="pointer-events-auto flex w-full max-w-[22rem] flex-col items-end gap-3">
        <div
          id="site-chatbot-panel"
          className={cn(
            "origin-bottom-right overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200",
            open
              ? "max-h-[min(32rem,calc(100dvh-6rem))] w-full scale-100 opacity-100"
              : "pointer-events-none max-h-0 w-full scale-95 opacity-0"
          )}
          aria-hidden={!open}
        >
          <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                SwingTradingLog Help
              </p>
              <p className="text-xs text-muted-foreground">
                Answers from our website FAQ
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[min(22rem,calc(100dvh-12rem))] space-y-3 overflow-y-auto px-4 py-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-md bg-emerald-500 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-950">
                    {message.text}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <BotMessage text={message.text} links={message.links} />
                </div>
              )
            )}

            {quickQuestions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => handleAsk(question)}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-foreground"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {needsEmail ? (
            <form
              onSubmit={handleEmailSubmit}
              className="space-y-2 border-t border-border bg-card/50 px-3 py-3"
            >
              <label htmlFor="chatbot-email" className="sr-only">
                Email address
              </label>
              <input
                id="chatbot-email"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="you@email.com"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none ring-emerald-500/30 placeholder:text-muted-foreground focus-visible:ring-2"
              />
              {emailError ? (
                <p className="text-xs text-red-500" role="alert">
                  {emailError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {CHATBOT_EMAIL_HELPER}
                </p>
              )}
              <Button
                type="submit"
                className="h-10 w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                disabled={!emailInput.trim() || emailSubmitting}
              >
                {emailSubmitting ? "Saving…" : "Continue"}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-border bg-card/50 px-3 py-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about pricing, journal, risk..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none ring-emerald-500/30 placeholder:text-muted-foreground focus-visible:ring-2"
                aria-label="Ask a question"
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                aria-label="Send message"
                disabled={!input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          )}
        </div>

        {!open ? (
          <Button
            type="button"
            size="lg"
            className="h-14 rounded-full bg-emerald-500 px-5 text-zinc-950 shadow-lg hover:bg-emerald-400"
            aria-expanded={open}
            aria-controls="site-chatbot-panel"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="size-5" />
            <span>Ask a question</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
