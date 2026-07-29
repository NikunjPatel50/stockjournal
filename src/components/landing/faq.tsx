import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What do I get when I sign up?",
    answer:
      "The same app as swingtradinglog.com: Dashboard (KPIs, charts, overnight exposure), Journal, Goals, Settings, and Feedback. Full access is free during beta — no credit card.",
  },
  {
    question: "Which assets can I journal?",
    answer:
      "Equities, options, forex, and crypto. Each trade supports direction, strategy, tags, stops, targets, fees, notes, psychology tags, and an optional chart screenshot.",
  },
  {
    question: "Can I import or export my trades?",
    answer:
      "Yes. Export trades to CSV and download or restore a JSON workspace backup from Settings → Data. Smarter broker CSV import is still on the roadmap.",
  },
  {
    question: "How does overnight and weekend exposure work?",
    answer:
      "The Dashboard totals notional on open (active) positions and flags overnight, weekend, and holiday gap risk. Exposure uses entry price until live quotes are available.",
  },
  {
    question: "Can I share trades publicly?",
    answer:
      "For closed trades only. Create a branded PNG or copy a public share link from the Journal. You can disable sharing in Settings → Display.",
  },
  {
    question: "Is there a separate analytics product?",
    answer:
      "No. Performance analytics live on the Dashboard — period filters, KPI ribbon, equity curve, weekly P&L, monthly performance, and P&L breakdown.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "SwingTradingLog works in a mobile browser today. Native iOS and Android apps are planned after beta (see Roadmap). Desktop sign-in gives you the full experience now.",
  },
  {
    question: "Where are Privacy and Terms?",
    answer:
      "In the site footer: Privacy Policy and Terms of Service. They cover accounts, optional trade sharing, and feedback submissions.",
  },
];

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
          {faqs.map((faq) => (
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
