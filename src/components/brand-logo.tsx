import Image from "next/image";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "SwingTradingLog";
export const BRAND_NAME_COMPACT = "SWINGTRADINGLOG";

const LOGO_LIGHT_WEBP = "/swingtradinglog-logo.webp";
const LOGO_DARK_WEBP = "/swingtradinglog-logo-dark.webp";
const LOGO_LIGHT = "/swingtradinglog-logo.png";
const LOGO_DARK = "/swingtradinglog-logo-dark.png";

/** Trimmed light lockup width / height (assets in /public). */
const LOCKUP_ASPECT = 837 / 502;

/** Left portion of the lockup image that contains the bull mark (avoid square crop). */
const MARK_CROP_WIDTH_RATIO = 0.42;

function markFrameWidth(heightPx: number) {
  return Math.round(heightPx * MARK_CROP_WIDTH_RATIO * LOCKUP_ASPECT);
}

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
  priority?: boolean;
  /** Force light or dark logo asset (sidebar title bar uses dark). */
  logoTheme?: LogoTheme;
  /** Drop opaque logo plate into parent bg (multiply / lighten). */
  blendMark?: boolean;
};

const SIZE = {
  sm: {
    box: "size-8",
    img: 32,
    mark: "size-8",
    text: "text-sm",
    lockup: "h-9 w-auto",
    lockupPx: 36,
  },
  md: {
    box: "size-9",
    img: 36,
    mark: "size-10",
    text: "text-sm",
    lockup: "h-10 w-auto",
    lockupPx: 40,
  },
  lg: {
    box: "size-12",
    img: 48,
    mark: "size-12",
    text: "text-base",
    lockup: "h-14 w-auto",
    lockupPx: 56,
  },
  xl: {
    box: "size-14",
    img: 64,
    mark: "size-16",
    text: "text-base",
    lockup: "h-[11rem] w-auto sm:h-[12rem]",
    lockupPx: 192,
  },
} as const;

function LogoImage({
  variant,
  width,
  height,
  className,
  imageClassName,
  priority,
  alt,
  sizeMode = "box",
}: {
  variant: "light" | "dark";
  width: number;
  height: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  alt: string;
  sizeMode?: "box" | "height";
}) {
  const webp = variant === "dark" ? LOGO_DARK_WEBP : LOGO_LIGHT_WEBP;
  const png = variant === "dark" ? LOGO_DARK : LOGO_LIGHT;
  const imgClass = cn(
    sizeMode === "height"
      ? "h-full w-auto max-w-none object-contain"
      : "size-full max-h-full max-w-full object-contain",
    imageClassName
  );

  return (
    <picture
      className={cn(
        "block shrink-0",
        sizeMode === "height" && "w-auto",
        className
      )}
      style={
        sizeMode === "height"
          ? { height, width: "auto" }
          : { width, height }
      }
    >
      <source srcSet={webp} type="image/webp" />
      <Image
        src={png}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={imgClass}
      />
    </picture>
  );
}

function ThemeAwareLogoImage({
  width,
  height,
  className,
  imageClassName,
  priority,
  alt,
  logoTheme = "auto",
  sizeMode = "box",
}: {
  width: number;
  height: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  alt: string;
  logoTheme?: LogoTheme;
  sizeMode?: "box" | "height";
}) {
  if (logoTheme === "dark") {
    return (
      <LogoImage
        variant="dark"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
        imageClassName={imageClassName}
        sizeMode={sizeMode}
      />
    );
  }
  if (logoTheme === "light") {
    return (
      <LogoImage
        variant="light"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
        imageClassName={imageClassName}
        sizeMode={sizeMode}
      />
    );
  }

  return (
    <span className="relative inline-flex items-center justify-center">
      <LogoImage
        variant="light"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("dark:hidden", className)}
        imageClassName={imageClassName}
        sizeMode={sizeMode}
      />
      <LogoImage
        variant="dark"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("hidden dark:inline-flex", className)}
        imageClassName={imageClassName}
        sizeMode={sizeMode}
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
  const markHeight = size;
  const markWidth = markFrameWidth(markHeight);
  const lockupRenderWidth = Math.round(markHeight * LOCKUP_ASPECT);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-start overflow-hidden",
        className
      )}
      style={{ height: markHeight, width: markWidth }}
    >
      <ThemeAwareLogoImage
        alt=""
        width={lockupRenderWidth}
        height={markHeight}
        priority={priority}
        logoTheme={logoTheme}
        sizeMode="height"
        className="h-full w-auto max-w-none"
        imageClassName="h-full w-auto max-w-none object-contain object-left"
      />
    </span>
  );
}

export function BrandLogo({
  className,
  showWordmark = true,
  size = "md",
  markSize,
  framedMark = true,
  lockup = false,
  priority = false,
  logoTheme = "auto",
  blendMark = false,
}: BrandLogoProps) {
  const s = SIZE[size];
  const m = SIZE[markSize ?? size];
  const onDarkChrome = logoTheme === "dark";

  const markBlendClass = blendMark
    ? "mix-blend-multiply dark:mix-blend-normal"
    : undefined;

  const markHeight = m.img;
  const markWidth = markFrameWidth(markHeight);
  const lockupRenderWidth = Math.round(markHeight * LOCKUP_ASPECT);

  const markImage = (
    <span
      className="relative flex shrink-0 items-center justify-start overflow-hidden"
      style={{ height: markHeight, width: markWidth }}
    >
      <ThemeAwareLogoImage
        alt=""
        width={lockupRenderWidth}
        height={markHeight}
        priority={priority}
        logoTheme={logoTheme}
        sizeMode="height"
        className="h-full w-auto max-w-none"
        imageClassName={cn(
          "h-full w-auto max-w-none object-contain object-left",
          framedMark ? "p-0.5" : "p-0",
          markBlendClass
        )}
      />
    </span>
  );

  if (lockup) {
    const lockupHeight = s.lockupPx;
    const lockupWidth = Math.round(lockupHeight * LOCKUP_ASPECT);

    return (
      <span
        className={cn(
          "inline-flex w-auto max-w-full items-center justify-center bg-transparent",
          className
        )}
      >
        <ThemeAwareLogoImage
          alt={BRAND_NAME}
          width={lockupWidth}
          height={lockupHeight}
          priority={priority}
          logoTheme={logoTheme}
          sizeMode="height"
          className={cn(s.lockup, "bg-transparent")}
          imageClassName="bg-transparent object-contain object-center"
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {framedMark ? (
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1",
            onDarkChrome
              ? "bg-black ring-emerald-500/30"
              : "bg-background ring-border/80 dark:bg-zinc-950 dark:ring-emerald-500/25"
          )}
          style={{ height: markHeight, width: markWidth }}
        >
          {markImage}
        </span>
      ) : (
        markImage
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
