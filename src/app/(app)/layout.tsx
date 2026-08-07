import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessProvider } from "@/components/admin/admin-access-provider";
import { JournalTradesProvider } from "@/components/journal-trades-provider";
import { MarketQuotesProvider } from "@/components/market-quotes-provider";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ScrollActivityBinder } from "@/components/scroll-activity-binder";
import { Sidebar } from "@/components/sidebar";
import { UserStorageProvider } from "@/components/user-storage-provider";
import { isAdminUser } from "@/lib/admin";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = isAdminUser(user);

  return (
    <AdminAccessProvider isAdmin={isAdmin}>
      <UserStorageProvider
        userId={user.id}
        userDisplayName={user.profile?.name ?? user.email}
      >
        <JournalTradesProvider>
          <MarketQuotesProvider>
            <div className="flex h-dvh min-h-0 w-full min-w-0 overflow-hidden">
              <Sidebar />
              <ScrollActivityBinder />
              <main
                id="app-scroll-main"
                className="app-scroll-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-[max(0px,env(safe-area-inset-bottom))]"
              >
                {children}
              </main>
              <MobileBottomNav />
            </div>
          </MarketQuotesProvider>
        </JournalTradesProvider>
      </UserStorageProvider>
    </AdminAccessProvider>
  );
}
