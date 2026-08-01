import { getActiveStorageUserId } from "@/lib/user-storage";

export const ADMIN_NAV_TAB_IDS = ["overview", "users", "feedback"] as const;

export type AdminNavTabId = (typeof ADMIN_NAV_TAB_IDS)[number];

export const DEFAULT_ADMIN_NAV_ORDER: AdminNavTabId[] = [
  "overview",
  "users",
  "feedback",
];

export function adminNavOrderStorageKey(userId: string) {
  return `swingtradinglog_admin_nav_order_v1_${userId}`;
}

export function sanitizeAdminNavOrder(order: unknown): AdminNavTabId[] {
  if (!Array.isArray(order)) return [...DEFAULT_ADMIN_NAV_ORDER];

  const seen = new Set<AdminNavTabId>();
  const next: AdminNavTabId[] = [];

  for (const value of order) {
    if (
      typeof value === "string" &&
      ADMIN_NAV_TAB_IDS.includes(value as AdminNavTabId) &&
      !seen.has(value as AdminNavTabId)
    ) {
      const id = value as AdminNavTabId;
      seen.add(id);
      next.push(id);
    }
  }

  for (const id of ADMIN_NAV_TAB_IDS) {
    if (!seen.has(id)) next.push(id);
  }

  return next;
}

export function loadAdminNavOrder(): AdminNavTabId[] {
  if (typeof window === "undefined") return [...DEFAULT_ADMIN_NAV_ORDER];

  const userId = getActiveStorageUserId();
  if (!userId) return [...DEFAULT_ADMIN_NAV_ORDER];

  try {
    const raw = localStorage.getItem(adminNavOrderStorageKey(userId));
    if (!raw) return [...DEFAULT_ADMIN_NAV_ORDER];
    return sanitizeAdminNavOrder(JSON.parse(raw));
  } catch {
    return [...DEFAULT_ADMIN_NAV_ORDER];
  }
}

export function saveAdminNavOrder(order: AdminNavTabId[]) {
  if (typeof window === "undefined") return;

  const userId = getActiveStorageUserId();
  if (!userId) return;

  localStorage.setItem(
    adminNavOrderStorageKey(userId),
    JSON.stringify(sanitizeAdminNavOrder(order))
  );
}

export function moveAdminNavTab(
  order: AdminNavTabId[],
  tabId: AdminNavTabId,
  direction: "up" | "down"
): AdminNavTabId[] {
  const index = order.indexOf(tabId);
  if (index === -1) return order;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return order;

  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
