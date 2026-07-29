"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChartScreenshotPreviewProps = {
  src: string;
  alt?: string;
  thumbnailClassName?: string;
  caption?: string;
  wrapperClassName?: string;
};

export function ChartScreenshotPreview({
  src,
  alt = "Chart screenshot",
  thumbnailClassName,
  caption,
  wrapperClassName,
}: ChartScreenshotPreviewProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-border bg-background",
          wrapperClassName
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full cursor-zoom-in object-contain",
            thumbnailClassName ?? "max-h-36"
          )}
          onDoubleClick={() => setOpen(true)}
          title="Double-click to enlarge"
        />
        {caption ? (
          <p className="border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label="Chart screenshot preview"
              onClick={() => setOpen(false)}
            >
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-10 size-10 rounded-full shadow-lg"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                }}
                aria-label="Close preview"
              >
                <X className="size-5" />
              </Button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[calc(100vh-4rem)] max-w-[min(100%,calc(100vw-2rem))] object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
