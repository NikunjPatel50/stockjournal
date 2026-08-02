"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BRAND_NAME } from "@/components/brand-logo";
import type { LocalizedPrice } from "@/lib/geo-pricing";

/** Only features shipped in the app today. */
const FEATURES = [
  "Dashboard with period filters (Today → Custom)",
  "KPI ribbon (P&L, profit factor, win rate, R:R, drawdown)",
  "Overnight / weekend gap exposure",
  "Equity curve & weekly P&L charts",
  "Monthly performance & P&L breakdown",
  "Recent trades on the dashboard",
  "Journal (add, edit, filter by asset / outcome)",
  "Strategies, tags, notes & chart screenshots",
  "Customizable journal columns",
  "Shareable branded trade cards (closed trades)",
  "Goals & discipline tracking",
  "Risk, display & profile settings",
  "CSV export & JSON workspace backup",
  "In-app feedback",
] as const;

export function LandingPricing({
  freePrice,
}: {
  freePrice: LocalizedPrice;
}) {
  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-emerald-400">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Full SwingTradingLog, free forever
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Same product as the live site: {freePrice.formatted}. Free forever,
            no credit card.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="relative mx-auto mt-12 max-w-lg rounded-2xl border border-emerald-500/50 bg-muted p-6 shadow-[0_0_48px_rgba(52,211,153,0.12)] sm:p-8"
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-zinc-950">
            Free forever
          </span>
          <h3 className="text-lg font-semibold text-foreground">
            {BRAND_NAME}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard, Journal, Goals, Settings, and Feedback — all included.
          </p>
          <div className="mt-6 flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {freePrice.formatted}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              free forever
            </span>
          </div>

          <Link href="/login" className="mt-8 block">
            <Button className="h-10 w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
              Get started free
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mx-auto mt-14 max-w-3xl"
        >
          <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              What&apos;s included
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every feature available in the app today.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Table className="min-w-[280px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-4 text-foreground sm:px-6">
                    Feature
                  </TableHead>
                  <TableHead className="h-12 w-28 px-3 text-center text-foreground sm:w-36">
                    Included
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FEATURES.map((feature) => (
                  <TableRow key={feature}>
                    <TableCell className="px-4 py-3.5 font-medium text-foreground sm:px-6">
                      {feature}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="size-4 shrink-0" aria-hidden />
                        <span className="sr-only sm:not-sr-only">Included</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
