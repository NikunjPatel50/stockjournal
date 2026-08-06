/** Shared padding and width guard for authenticated app routes. */
export const APP_PAGE_SHELL_CLASS =
  "flex w-full min-h-full min-w-0 flex-col gap-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pt-6";

/** Left inset for page toolbars below the mobile hamburger (hidden at lg+). */
export const MOBILE_NAV_OFFSET_CLASS = "max-lg:pl-12 lg:pl-0";

/** Top inset so page content clears the fixed mobile menu button. */
export const MOBILE_NAV_TOP_OFFSET_CLASS = "max-lg:pt-1 lg:pt-0";
