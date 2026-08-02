import Link from "next/link";
import { cn } from "@/lib/utils";
import { LANDING_FAQS } from "@/lib/faq-content";
import { ChevronDown } from "lucide-react";

export function LandingFaq() {
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-400">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Common questions about SwingTradingLog
          </h2>
        </div>

        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {LANDING_FAQS.map((faq) => (
            <details key={faq.question} className="group px-4 sm:px-5">
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left text-sm font-medium text-foreground",
                  "[&::-webkit-details-marker]:hidden"
                )}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="pb-4 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
                {faq.question === "How does overnight and weekend exposure work?" ? (
                  <p className="mt-2">
                    Learn more in our{" "}
                    <Link
                      href="/risk-calculator"
                      className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                    >
                      risk calculator
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/trading-guides"
                      className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                    >
                      trading guides
                    </Link>
                    .
                  </p>
                ) : null}
                {faq.question === "Where are Privacy and Terms?" ? (
                  <p className="mt-2">
                    <Link
                      href="/privacy"
                      className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                    >
                      Privacy Policy
                    </Link>
                    {" · "}
                    <Link
                      href="/terms"
                      className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                    >
                      Terms of Service
                    </Link>
                  </p>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
