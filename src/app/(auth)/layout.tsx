import Link from "next/link";
import { Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "linear-gradient(165deg, #f8fafc 0%, #f0fdf4 38%, #ecfdf5 52%, #f1f5f9 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-90 dark:hidden"
          style={{
            background:
              "radial-gradient(ellipse 85% 60% at 15% -10%, rgba(16, 185, 129, 0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(148, 163, 184, 0.12), transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.35] dark:hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1' cy='1' r='1' fill='%2394a3b8'/%3E%3C/svg%3E")`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="absolute inset-0 hidden bg-[#07090c] dark:block" />
        <div
          className="absolute inset-0 hidden opacity-[0.35] dark:block"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(16,185,129,0.06), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 hidden opacity-[0.04] dark:block"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1' cy='1' r='1' fill='white'/%3E%3C/svg%3E")`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <header className="relative z-20 flex h-14 shrink-0 items-center justify-end gap-1 border-b border-border/60 bg-background px-5 sm:h-16 sm:px-8">
        <Link
          href="/"
          aria-label="Home"
          className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <Home className="size-4" />
        </Link>
        <ThemeToggle className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-8">
        <div className="w-full max-w-[32rem]">{children}</div>
      </main>
    </div>
  );
}
