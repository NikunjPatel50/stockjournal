import Link from "next/link";

const FEATURE_BLOCKS = [
  {
    id: "track-trades",
    title: "Track every swing trade",
    body: (
      <>
        Log equities, options, forex, and crypto in one{" "}
        <strong className="font-medium text-foreground">swing trading journal</strong>
        . Record entry and exit, stops, targets, strategy tags, psychology notes,
        and chart screenshots. Active positions stay separate from closed trades so
        your trade log app reflects open risk, not just history.
      </>
    ),
  },
  {
    id: "gap-risk",
    title: "Overnight & weekend gap risk",
    body: (
      <>
        Multi-day holds mean gap risk while you sleep. SwingTradingLog totals
        notional on open positions and flags overnight, weekend, and holiday
        exposure on the dashboard. Use it as an{" "}
        <strong className="font-medium text-foreground">
          overnight gap risk tracker
        </strong>{" "}
        before you size into Friday holds or earnings week.
      </>
    ),
  },
  {
    id: "analytics",
    title: "Goals & performance analytics",
    body: (
      <>
        Review net P&amp;L, profit factor, win rate, average R:R, drawdown, and
        period filters without exporting to a spreadsheet. The Analytics hub adds
        sector attribution, R-multiple spectrum, and session breakdowns. A built-in{" "}
        <strong className="font-medium text-foreground">P&amp;L tracker</strong>{" "}
        keeps weekly review under twenty minutes.
      </>
    ),
  },
  {
    id: "share-cards",
    title: "Shareable trade cards",
    body: (
      <>
        Turn closed trades into branded PNG cards or public share links for social
        posts. Sharing is optional and can be disabled in Settings. Your journal
        stays private; only trades you choose to share leave the app.
      </>
    ),
  },
] as const;

export function HomeSeoContent() {
  return (
    <div className="border-t border-border/80 bg-muted/20">
      <section
        aria-labelledby="why-swingtradinglog"
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <h2
          id="why-swingtradinglog"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Why traders use SwingTradingLog
        </h2>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Most traders know they should journal. Fewer keep one after a losing
            week. SwingTradingLog is a free{" "}
            <strong className="font-medium text-foreground">trading app</strong>{" "}
            and{" "}
            <strong className="font-medium text-foreground">stock trading journal</strong>{" "}
            built for multi-day holds: log a trade in under two minutes, attach
            trading chart screenshots, see overnight exposure next to P&amp;L, and
            review the week with dashboard analytics instead of a brittle spreadsheet.
          </p>
          <p>
            Whether you run a{" "}
            <strong className="font-medium text-foreground">swing trading strategy</strong>{" "}
            on NSE large caps, US growth names, forex pairs, or mixed option
            trading and equity books, the same workflow applies. Mark trades Active
            while you hold, close them when you exit, and filter by strategy, tag,
            or outcome. Indian traders get INR display, session-aware daily P&amp;L,
            and listing market logic suited to a{" "}
            <strong className="font-medium text-foreground">
              stock trading journal India
            </strong>{" "}
            workflow without paying for features you never open.
          </p>
          <p>
            Full access is free: dashboard, journal, goals, analytics, CSV export,
            workspace backup, and in-app feedback. No credit card. If you started
            with a{" "}
            <Link
              href="/blog/trading-journal-pdf-vs-free-online-journal"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              trading journal PDF
            </Link>{" "}
            or spreadsheet, you can export anytime and still get live analytics.
            Read{" "}
            <Link
              href="/blog/what-is-swing-trading"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              what is swing trading
            </Link>
            , position sizing, gap risk, and weekly review habits, or{" "}
            <Link
              href="/preview"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              preview the app
            </Link>{" "}
            before you sign up.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="home-features"
        className="border-t border-border/80 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="home-features"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Built for swing traders who journal seriously
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Everything below ships in the free product today. See the full feature
            list on the{" "}
            <Link
              href="/features"
              className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              features page
            </Link>
            .
          </p>

          <div className="mt-10 space-y-10">
            {FEATURE_BLOCKS.map((block) => (
              <article key={block.id}>
                <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                  {block.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {block.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="trading-styles"
        className="border-t border-border/80 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="trading-styles"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            One journal for swing, day, and online trading
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              New to markets and wondering{" "}
              <strong className="font-medium text-foreground">what is trading</strong>?
              At its core, trading is buying and selling instruments to capture
              price movement with defined risk.{" "}
              <strong className="font-medium text-foreground">Swing trading</strong>{" "}
              holds positions for days to weeks;{" "}
              <strong className="font-medium text-foreground">day trading</strong>{" "}
              and{" "}
              <strong className="font-medium text-foreground">intraday trading</strong>{" "}
              close before the session ends. SwingTradingLog is optimized for
              multi-day swings but logs every style so your{" "}
              <strong className="font-medium text-foreground">online trading</strong>{" "}
              history stays in one place.
            </p>
            <p>
              Log{" "}
              <strong className="font-medium text-foreground">stock trading</strong>,{" "}
              <strong className="font-medium text-foreground">option trading</strong>,{" "}
              <strong className="font-medium text-foreground">forex trading</strong>, and
              crypto with direction, stops, targets, and notes. Attach a{" "}
              <strong className="font-medium text-foreground">trading chart</strong>{" "}
              screenshot from your broker or charting tool so review week matches
              what you saw at entry. Use the same workflow during{" "}
              <strong className="font-medium text-foreground">paper trading</strong>{" "}
              before you fund a live trading account.
            </p>
            <p>
              Looking for{" "}
              <strong className="font-medium text-foreground">stocks for swing trading</strong>{" "}
              or a repeatable{" "}
              <strong className="font-medium text-foreground">swing trading strategy</strong>?
              Read our guides on building a watchlist, risk reward ratio, and
              psychology tags, then track closed and active trades on the dashboard
              with sector breakdowns and daily P&amp;L for open positions.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="journal-formats"
        className="border-t border-border/80 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="journal-formats"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Better than a trading journal PDF or spreadsheet
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Many traders download a{" "}
              <strong className="font-medium text-foreground">trading journal PDF</strong>{" "}
              or buy a{" "}
              <strong className="font-medium text-foreground">trading journal book</strong>{" "}
              before they have ten closed trades. Paper works for habit building;
              it falls apart when you need filters, equity curves, or daily P&amp;L
              on open positions. SwingTradingLog is a{" "}
              <strong className="font-medium text-foreground">free trading journal</strong>{" "}
              and{" "}
              <strong className="font-medium text-foreground">online trading journal</strong>{" "}
              that stays trading journal free: full dashboard, no trial expiry.
            </p>
            <p>
              Use it as your{" "}
              <strong className="font-medium text-foreground">stock trading journal</strong>,{" "}
              <strong className="font-medium text-foreground">day trading journal</strong>, or
              mixed book. Export CSV when you need a printable snapshot. Traders
              comparing the{" "}
              <strong className="font-medium text-foreground">best trading journal</strong>{" "}
              options often want analytics without a monthly fee; see how we compare
              on the{" "}
              <Link
                href="/blog/swingtradinglog-vs-other-trading-journals"
                className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
              >
                journal comparison guide
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
