"use client";

import { usePathname } from "next/navigation";
import { SiteChatbot } from "@/components/marketing/site-chatbot";
import { isPublicPath } from "@/lib/public-paths";

export function SiteChatbotGate() {
  const pathname = usePathname();

  if (!isPublicPath(pathname)) return null;

  return <SiteChatbot />;
}
