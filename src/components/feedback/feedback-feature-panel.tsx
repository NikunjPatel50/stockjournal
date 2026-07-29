"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitFeatureRequestAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FEEDBACK_MAX_CHARS } from "@/lib/feedback";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type FeedbackFeaturePanelProps = {
  defaultEmail: string;
  defaultName?: string;
  className?: string;
};

export function FeedbackFeaturePanel({
  defaultEmail,
  defaultName = "",
  className,
}: FeedbackFeaturePanelProps) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const atLimit = message.length >= FEEDBACK_MAX_CHARS;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await submitFeatureRequestAction({
        message,
        email: defaultEmail,
        name: defaultName,
      });

      if (result.ok) {
        setMessage("");
        setSubmitted(true);
        return;
      }

      toast.error(result.error ?? "Something went wrong. Please try again.");
    });
  }

  if (submitted) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/30 px-6 py-12 text-center sm:py-14",
          className
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2
            className="size-8 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Thank you
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your idea is in our inbox. We genuinely read every submission — it
          helps shape what we build next for swing traders like you.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-8 h-10"
          onClick={() => setSubmitted(false)}
        >
          Share another idea
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col", className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="feature-request" className="text-sm font-medium">
          What should we build or improve?
        </Label>
        <Textarea
          id="feature-request"
          name="message"
          required
          value={message}
          maxLength={FEEDBACK_MAX_CHARS}
          onChange={(e) =>
            setMessage(e.target.value.slice(0, FEEDBACK_MAX_CHARS))
          }
          placeholder="e.g. Broker import, options journal fields, mobile alerts for overnight exposure…"
          className={cn(
            "field-sizing-fixed min-h-[10rem] w-full resize-y rounded-lg border-border bg-background px-3 py-3 text-base leading-relaxed shadow-none",
            "sm:min-h-[11rem] sm:text-sm",
            "md:min-h-[14rem]"
          )}
          disabled={pending}
        />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-xs text-muted-foreground">
            Be as specific as you like. We read every submission.
          </p>
          <p
            className={cn(
              "text-xs text-muted-foreground",
              NUMERIC_CLASS,
              atLimit && "text-amber-600 dark:text-amber-500"
            )}
            aria-live="polite"
          >
            {message.length.toLocaleString()} /{" "}
            {FEEDBACK_MAX_CHARS.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-stretch border-t border-border pt-4 sm:justify-end">
        <Button
          type="submit"
          className="h-11 w-full bg-emerald-600 px-5 text-white hover:bg-emerald-500 sm:h-10 sm:w-auto"
          disabled={pending || !defaultEmail}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Send feedback"
          )}
        </Button>
      </div>
    </form>
  );
}
