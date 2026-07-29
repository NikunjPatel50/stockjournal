"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DashboardMock } from "@/components/landing/dashboard-mock";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.18),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.08),_transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
            SwingTradingLog · Free beta
          </p>
          <h1 className="mt-3 text-balance text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-4xl sm:leading-[1.1] lg:text-5xl">
            Your swing trading journal — dashboard, goals, and gap risk in one place
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Log multi-day trades in the Journal, review P&amp;L and overnight
            exposure on the Dashboard, track Goals, and share branded cards for
            closed trades. Full access free while we&apos;re in beta — no credit
            card.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-11 w-full bg-emerald-500 px-5 text-zinc-950 hover:bg-emerald-400 sm:w-auto"
              >
                Start journaling free
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
            <a href="#showcase" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full border-border bg-card/80 px-5 text-foreground hover:bg-muted sm:w-auto"
              >
                See the app
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mx-auto mt-14 max-w-4xl"
        >
          <div
            aria-hidden
            className="absolute -inset-4 rounded-[2rem] bg-emerald-500/15 dark:hidden"
          />
          <DashboardMock
            className="relative isolate"
            previewLabel="SwingTradingLog dashboard with KPIs, overnight gap exposure, equity curve, and period filters"
          />
        </motion.div>
      </div>
    </section>
  );
}
