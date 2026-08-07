"use client";

import { useEffect } from "react";
import { bindScrollActivity } from "@/lib/scroll-activity";

export function ScrollActivityBinder() {
  useEffect(() => {
    const main = document.getElementById("app-scroll-main");
    if (!main) return;
    return bindScrollActivity(main);
  }, []);

  return null;
}
