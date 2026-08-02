"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  LayoutDashboard,
  Moon,
  Settings,
  Share2,
  Target,
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard analytics",
    description:
      "Net P&L, profit factor, win rate, average R:R, max drawdown, equity curve, weekly bars, monthly performance, and P&L breakdown — filterable by period.",
  },
  {
    icon: Moon,
    title: "Overnight & weekend exposure",
    description:
      "See notional at gap risk on open (active) trades, with weekend and holiday flags. Uses entry price until live quotes ship.",
  },
  {
    icon: BookOpen,
    title: "Trading journal",
    description:
      "Add and edit equities, options, forex, and crypto. Strategies, tags, stops, targets, notes, chart screenshots, and customizable columns.",
  },
  {
    icon: Share2,
    title: "Shareable trade cards",
    description:
      "Turn closed trades into branded PNG cards or public links for social posts. Optional — turn sharing off in Display settings anytime.",
  },
  {
    icon: Target,
    title: "Goals & discipline",
    description:
      "Set profit and process targets, track progress, and keep discipline checklists visible while you hold multi-day trades.",
  },
  {
    icon: Settings,
    title: "Risk & data controls",
    description:
      "Configure default risk, commission, and R:R. Export trades to CSV or back up / restore your workspace from Settings.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-emerald-400">What&apos;s in the app</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything you see after you sign in
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Dashboard, Journal, Goals, Settings, and Feedback — the same screens
            as{" "}
            <span className="font-medium text-foreground">swingtradinglog.com</span>
            , free during beta. What&apos;s next is on the{" "}
            <Link
              href="/roadmap"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              roadmap
            </Link>
            .
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group rounded-2xl border border-border bg-card/80 p-6 transition-colors hover:border-emerald-500/40"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-emerald-400 transition-colors group-hover:border-emerald-500/30">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
