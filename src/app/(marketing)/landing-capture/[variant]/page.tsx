import { notFound } from "next/navigation";
import {
  LandingAppPreview,
  type LandingPreviewVariant,
} from "@/components/landing/landing-app-preview";

const VARIANTS: LandingPreviewVariant[] = [
  "dashboard",
  "journal",
  "analytics",
  "calendar",
];

export default async function LandingCapturePage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!VARIANTS.includes(variant as LandingPreviewVariant)) {
    notFound();
  }

  return (
    <div id="capture-root" className="min-h-dvh bg-background">
      <LandingAppPreview variant={variant as LandingPreviewVariant} />
    </div>
  );
}
