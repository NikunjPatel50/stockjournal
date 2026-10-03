/** Shared padding and width guard for authenticated app routes. */
export const APP_PAGE_SHELL_CLASS =
  "flex w-full min-h-full min-w-0 flex-col gap-4 px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:pt-6";

/** Primary bordered card surface (dashboard, journal, analytics, calendar, settings). */
export const APP_CARD_SURFACE_CLASS =
  "overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-border/60 dark:ring-border/85";

/** Hairline grid cards built from gap-px + bg-border (metric band, summary grids). */
export const APP_CARD_GRID_SURFACE_CLASS =
  "overflow-hidden rounded-xl border border-border bg-border/80 shadow-sm ring-1 ring-border/60 dark:ring-border/85";
