import {
  LayoutDashboard,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminNavTabId } from "@/lib/admin-nav-prefs";

export type AdminNavItem = {
  id: AdminNavTabId;
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "overview",
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  { id: "users", href: "/admin/users", label: "Users", icon: Users },
  {
    id: "feedback",
    href: "/admin/feedback",
    label: "Feedback",
    icon: MessageSquare,
  },
];

export function adminNavItemsInOrder(
  order: AdminNavTabId[]
): AdminNavItem[] {
  const byId = new Map(ADMIN_NAV_ITEMS.map((item) => [item.id, item]));
  return order
    .map((id) => byId.get(id))
    .filter((item): item is AdminNavItem => item != null);
}
