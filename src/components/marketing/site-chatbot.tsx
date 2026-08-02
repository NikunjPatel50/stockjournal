"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHATBOT_FALLBACK,
  CHATBOT_GREETING,
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
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "greeting",
      role: "bot",
      text: CHATBOT_GREETING,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickQuestions = useMemo(
    () =>
      CHATBOT_QUICK_QUESTIONS.filter(
        (question) =>
          !messages.some(
            (message) => message.role === "user" && message.text === question
          )
      ).slice(0, 4),
    [messages]
  );

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
    if (!trimmed) return;

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
