import { AppPageHeader } from "@/components/app-page-header";
import { FeedbackFeaturePanel } from "@/components/feedback/feedback-feature-panel";
import { getCurrentUser } from "@/lib/supabase/server";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { cn } from "@/lib/utils";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  const email = user?.email ?? "";
  const name =
    (user?.profile as { name?: string | null } | undefined)?.name ?? "";

  return (
    <div className={cn(APP_PAGE_SHELL_CLASS, "gap-5 sm:min-h-full")}>
      <div className="mb-5 shrink-0 border-b border-border pb-5 sm:mb-6 sm:pb-6">
        <AppPageHeader
          eyebrow="Product feedback"
          title="Feedback"
          description="Tell us what you'd like to see next — features, workflows, or anything that would make the journal more useful for you."
        />
      </div>

      <FeedbackFeaturePanel defaultEmail={email} defaultName={name} />
    </div>
  );
}
