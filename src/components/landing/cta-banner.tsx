"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCtaBanner() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-muted via-card to-emerald-500/10 px-6 py-14 text-center sm:px-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(52,211,153,0.2),_transparent_50%)]"
        />
        <div className="relative">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Start with the same app as swingtradinglog.com
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Free beta: journal trades, watch gap risk on the dashboard, hit your
            goals, and share closed-trade cards. See the{" "}
            <Link
              href="/roadmap"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              roadmap
            </Link>{" "}
            for what&apos;s next.
          </p>
          <Link href="/login" className="mt-8 inline-block w-full max-w-sm sm:w-auto">
            <Button
              size="lg"
              className="h-11 w-full bg-emerald-500 px-5 text-zinc-950 hover:bg-emerald-400 sm:w-auto"
            >
              <span className="sm:hidden">Get started free</span>
              <span className="hidden sm:inline">
                Get started free — no credit card
              </span>
              <ArrowRight data-icon="inline-end" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
