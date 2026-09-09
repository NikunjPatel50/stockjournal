"use client";

import { usePathname } from "next/navigation";
import { SiteChatbot } from "@/components/marketing/site-chatbot";
import { isPublicPath } from "@/lib/public-paths";

/** Auth + capture screens need unobstructed CTAs / clean frames. */
const CHATBOT_EXCLUDED_PREFIXES = ["/login", "/landing-capture"] as const;

export function SiteChatbotGate() {
  const pathname = usePathname();

  if (!isPublicPath(pathname)) return null;
  if (
    CHATBOT_EXCLUDED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  return <SiteChatbot />;
}
