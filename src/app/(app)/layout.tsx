import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessProvider } from "@/components/admin/admin-access-provider";
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
        <div className="flex h-dvh min-h-0 w-full min-w-0 overflow-hidden">
          <Sidebar user={user} />
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background supports-[padding:max(0px)]:pb-[max(0px,env(safe-area-inset-bottom))]">
            {children}
          </main>
        </div>
      </UserStorageProvider>
    </AdminAccessProvider>
  );
}
