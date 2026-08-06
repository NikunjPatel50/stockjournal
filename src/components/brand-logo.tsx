"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "SwingTradingLog";
export const BRAND_NAME_COMPACT = "SWINGTRADINGLOG";

/** Transparent line-art assets: `light` is black ink, `dark` is white ink. */
const ASSETS = {
  lockup: {
    aspect: 837 / 502,
    light: {
      webp: "/swingtradinglog-logo.webp",
      png: "/swingtradinglog-logo.png",
    },
    dark: {
      webp: "/swingtradinglog-logo-dark.webp",
      png: "/swingtradinglog-logo-dark.png",
    },
  },
  bull: {
    aspect: 704 / 412,
    light: {
      webp: "/swingtradinglog-bull.webp",
      png: "/swingtradinglog-bull.png",
    },
    dark: {
      webp: "/swingtradinglog-bull-dark.webp",
      png: "/swingtradinglog-bull-dark.png",
    },
  },
} as const;

type AssetKind = keyof typeof ASSETS;

export type LogoTheme = "auto" | "dark" | "light";

type BrandLogoProps = {
  className?: string;
  /** Show wordmark text beside the mark */
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** Icon/mark pixel size (defaults to `size`). Wordmark still uses `size`. */
  markSize?: "sm" | "md" | "lg" | "xl";
  /** Rounded box around the mark (off for sidebar title bar). */
  framedMark?: boolean;
  /** Use the full generated lockup (bull + SWINGTRADINGLOG) */
  lockup?: boolean;
  /** Override rendered lockup height in pixels. */
  lockupHeight?: number;
  priority?: boolean;
  /** Force the light or dark ink asset instead of following the theme. */
  logoTheme?: LogoTheme;
};

const SIZE = {
  sm: { img: 26, text: "text-sm", lockup: "h-9", lockupPx: 36 },
  md: { img: 30, text: "text-sm", lockup: "h-10", lockupPx: 40 },
  lg: { img: 38, text: "text-base", lockup: "h-14", lockupPx: 56 },
  xl: {
    img: 52,
    text: "text-base",
    lockup: "h-[11rem] sm:h-[12rem]",
    lockupPx: 192,
  },
} as const;

function LogoPicture({
  kind,
  variant,
  height,
  alt,
  priority,
  className,
  imageClassName,
  fixedHeight = false,
}: {
  kind: AssetKind;
  variant: "light" | "dark";
  height: number;
  alt: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  fixedHeight?: boolean;
}) {
  const asset = ASSETS[kind];
  const source = asset[variant];
  const width = Math.round(height * asset.aspect);

  return (
    <picture
      className={cn("block shrink-0", className)}
      style={fixedHeight ? { height } : undefined}
    >
      <source srcSet={source.webp} type="image/webp" />
      <Image
        src={source.png}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("h-full w-auto max-w-none object-contain", imageClassName)}
      />
    </picture>
  );
}

function ThemedLogo({
  kind,
  logoTheme,
  height,
  alt,
  priority,
  className,
  imageClassName,
  fixedHeight = false,
}: {
  kind: AssetKind;
  logoTheme: LogoTheme;
  height: number;
  alt: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  fixedHeight?: boolean;
}) {
  const shared = {
    kind,
    height,
    alt,
    priority,
    imageClassName,
    fixedHeight,
  };

  if (logoTheme === "light") {
    return (
      <LogoPicture
        {...shared}
        variant="light"
        className={className}
      />
    );
  }

  if (logoTheme === "dark") {
    return (
      <LogoPicture
        {...shared}
        variant="dark"
        className={className}
      />
    );
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      style={fixedHeight ? { height } : undefined}
    >
      <LogoPicture
        {...shared}
        variant="light"
        className="dark:hidden"
      />
      <LogoPicture
        {...shared}
        variant="dark"
        className="hidden dark:block"
      />
    </span>
  );
}

export function BrandMark({
  className,
  size = 32,
  priority,
  logoTheme = "auto",
}: {
  className?: string;
  size?: number;
  priority?: boolean;
  logoTheme?: LogoTheme;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <ThemedLogo
        kind="bull"
        logoTheme={logoTheme}
        height={size}
        alt=""
        priority={priority}
        fixedHeight
      />
    </span>
  );
}

export function BrandLogo({
  className,
  showWordmark = true,
  size = "md",
  markSize,
  framedMark = false,
  lockup = false,
  lockupHeight,
  priority = false,
  logoTheme = "auto",
}: BrandLogoProps) {
  const s = SIZE[size];
  const m = SIZE[markSize ?? size];
  const onDarkChrome = logoTheme === "dark";

  if (lockup) {
    const height = lockupHeight ?? s.lockupPx;

    return (
      <span
        className={cn(
          "inline-flex w-auto min-w-0 max-w-full items-center justify-center",
          className
        )}
      >
        <ThemedLogo
          kind="lockup"
          logoTheme={logoTheme}
          height={height}
          alt={BRAND_NAME}
          priority={priority}
          fixedHeight
          className="w-auto"
          imageClassName="object-center"
        />
      </span>
    );
  }

  const mark = (
    <ThemedLogo
      kind="bull"
      logoTheme={logoTheme}
      height={m.img}
      alt={showWordmark ? "" : BRAND_NAME}
      priority={priority}
      fixedHeight
    />
  );

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {framedMark ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg px-1.5 py-1 ring-1",
            onDarkChrome
              ? "bg-black ring-emerald-500/30"
              : "bg-background ring-border/80 dark:bg-zinc-950 dark:ring-emerald-500/25"
          )}
        >
          {mark}
        </span>
      ) : (
        mark
      )}
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold italic tracking-tight",
            onDarkChrome
              ? "text-emerald-400"
              : "text-foreground dark:text-emerald-400",
            s.text
          )}
        >
          {BRAND_NAME}
        </span>
      ) : null}
    </span>
  );
}
