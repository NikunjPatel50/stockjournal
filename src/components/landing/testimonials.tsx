"use client";

import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    quote:
      "SwingTradingLog finally replaced my messy Notion + spreadsheet stack. My win rate jumped 8% once I could see emotional tags next to losing trades.",
    name: "Maya Chen",
    style: "Swing Trader · Options",
    initials: "MC",
  },
  {
    quote:
      "Reporting filters showed I gave back gains on late-week holds. Cutting those setups saved me hours of review — and real money — without paying for another tool.",
    name: "Jordan Blake",
    style: "Swing Trader · Equities",
    initials: "JB",
  },
  {
    quote:
      "I hold positions for days, not minutes. The equity curve and monthly bars make it obvious when my swing book is actually working.",
    name: "Sofia Reyes",
    style: "Swing Trader · Growth",
    initials: "SR",
  },
  {
    quote:
      "Options spreads used to be a nightmare to journal. Condors, debit spreads, and rolls finally live in one clean trade log.",
    name: "Ethan Park",
    style: "Swing Trader · Options",
    initials: "EP",
  },
  {
    quote:
      "Equity curve + benchmark context keeps me honest. If I'm underperforming the market on swings, I know immediately — and why.",
    name: "Ava Thompson",
    style: "Swing Trader · Crypto",
    initials: "AT",
  },
  {
    quote:
      "Screenshot + psychology notes on every fill turned post-session reviews into a 10-minute habit instead of a weekend chore.",
    name: "Noah Patel",
    style: "Swing Trader · Large caps",
    initials: "NP",
  },
];

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-emerald-400">Social proof</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for swing traders who journal seriously
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.article
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-6"
            >
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                “{item.quote}”
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-emerald-500/15 text-xs font-semibold text-emerald-500">
                    {item.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <BadgeCheck className="size-3.5 shrink-0 text-emerald-400" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.style}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
