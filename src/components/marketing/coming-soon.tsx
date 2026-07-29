import Link from "next/link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { Button } from "@/components/ui/button";

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <LandingNavbar />
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-medium text-emerald-500">Coming soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        <Link href="/" className="mt-8">
          <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
            Back to home
          </Button>
        </Link>
      </main>
      <LandingFooter />
    </>
  );
}
