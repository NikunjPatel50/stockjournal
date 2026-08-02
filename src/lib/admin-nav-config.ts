import {
  LayoutDashboard,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavTabId = "overview" | "users" | "feedback";

export type AdminNavItem = {
  id: AdminNavTabId;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the pathname exactly instead of by prefix. */
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
