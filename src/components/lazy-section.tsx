"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type LazySectionProps = {
  children: ReactNode;
  className?: string;
  /** Placeholder height before the section mounts. */
  minHeight?: string;
  /** Start loading before the section enters the viewport. */
  rootMargin?: string;
};

export function LazySection({
  children,
  className,
  minHeight = "12rem",
  rootMargin = "240px 0px",
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div
      ref={ref}
      className={cn(className, "cv-section")}
      style={
        visible
          ? undefined
          : {
              contentVisibility: "auto",
              containIntrinsicSize: `auto ${minHeight}`,
            }
      }
    >
      {visible ? children : <div aria-hidden style={{ minHeight }} />}
    </div>
  );
}
