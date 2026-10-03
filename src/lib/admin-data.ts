import type { FeedbackCategory } from "@/lib/feedback";
import { normalizeJournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import {
  createSupabaseAdminClient,
  createSupabaseAuthAdminClient,
} from "@/lib/supabase/admin";

export type AdminFeedbackRow = {
  id: string;
  userId: string;
  email: string;
  name: string;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
};

export type AdminUserRow = {
  userId: string;
  fullName: string;
  email: string | null;
  currency: string;
  tradeCount: number;
  goalCount: number;
  createdAt: string;
  lastTradeSync: string | null;
};

export type AdminTradeRow = {
  key: string;
  userId: string;
  userName: string;
  email: string | null;
  currency: CurrencyCode;
  ticker: string;
  assetClass: string;
  direction: string;
  status: "Active" | "Closed";
  outcome: string;
  strategy: string;
  entryDate: string;
  exitDate: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
};

export type AdminDashboardStats = {
  feedbackTotal: number;
  feedbackThisWeek: number;
  usersWithSettings: number;
  totalTradesSynced: number;
  totalGoals: number;
  activeSyncUsers7d: number;
  categoryCounts: Record<string, number>;
};

type UserSettingsRow = {
  user_id: string;
  full_name: string;
  currency: string;
  created_at: string;
  journal_trades: unknown;
  journal_trades_updated_at: string | null;
};

type FeedbackDbRow = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  category: string;
  message: string;
  created_at: string;
};

type GoalRow = {
  user_id: string;
};

function tradeCountFromJournal(trades: unknown): number {
  return Array.isArray(trades) ? trades.length : 0;
}

function asCurrency(value: string): CurrencyCode {
  if (
    value === "USD" ||
    value === "EUR" ||
    value === "GBP" ||
    value === "INR" ||
    value === "CAD"
  ) {
    return value;
  }
  return DEFAULT_CURRENCY;
}

async function loadEmailByUserId(): Promise<Map<string, string>> {
  const emails = new Map<string, string>();

  try {
    const authAdmin = createSupabaseAuthAdminClient();
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await authAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error || !data?.users?.length) break;
      for (const user of data.users) {
        const email = user.email?.trim();
        if (email) emails.set(user.id, email);
      }
      if (data.users.length < 200) break;
    }
  } catch {
    // Fall through to feedback emails below.
  }

  if (emails.size > 0) return emails;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("feedback_submissions")
    .select("user_id, email")
    .order("created_at", { ascending: false });

  if (error || !data) return emails;

  for (const row of data as { user_id: string; email: string }[]) {
    if (row.email && !emails.has(row.user_id)) {
      emails.set(row.user_id, row.email);
    }
  }

  return emails;
}

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function sevenDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const admin = createSupabaseAdminClient();

  const [feedbackRes, settingsRes, goalsRes] = await Promise.all([
    admin
      .from("feedback_submissions")
      .select("id, category, created_at"),
    admin
      .from("user_settings")
      .select(
        "user_id, journal_trades, journal_trades_updated_at"
      ),
    admin.from("goals").select("user_id"),
  ]);

  if (feedbackRes.error) throw new Error(feedbackRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);

  const feedback = (feedbackRes.data ?? []) as Pick<
    FeedbackDbRow,
    "id" | "category" | "created_at"
  >[];
  const settings = (settingsRes.data ?? []) as Pick<
    UserSettingsRow,
    "user_id" | "journal_trades" | "journal_trades_updated_at"
  >[];
  const goals = (goalsRes.data ?? []) as GoalRow[];

  const weekStart = startOfWeekIso();
  const weekAgo = sevenDaysAgoIso();

  const categoryCounts: Record<string, number> = {};
  let feedbackThisWeek = 0;

  for (const row of feedback) {
    categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
    if (row.created_at >= weekStart) feedbackThisWeek += 1;
  }

  let totalTradesSynced = 0;
  let activeSyncUsers7d = 0;
  for (const row of settings) {
    totalTradesSynced += tradeCountFromJournal(row.journal_trades);
    if (
      row.journal_trades_updated_at &&
      row.journal_trades_updated_at >= weekAgo
    ) {
      activeSyncUsers7d += 1;
    }
  }

  return {
    feedbackTotal: feedback.length,
    feedbackThisWeek,
    usersWithSettings: settings.length,
    totalTradesSynced,
    totalGoals: goals.length,
    activeSyncUsers7d,
    categoryCounts,
  };
}

export async function fetchAdminFeedback(
  limit = 100
): Promise<AdminFeedbackRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("feedback_submissions")
    .select("id, user_id, email, name, category, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as FeedbackDbRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    category: row.category as FeedbackCategory,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createSupabaseAdminClient();

  const [settingsRes, goalsRes, emailByUser] = await Promise.all([
    admin
      .from("user_settings")
      .select(
        "user_id, full_name, currency, created_at, journal_trades, journal_trades_updated_at"
      )
      .order("created_at", { ascending: false }),
    admin.from("goals").select("user_id"),
    loadEmailByUserId(),
  ]);

  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);

  const settings = (settingsRes.data ?? []) as UserSettingsRow[];
  const goals = (goalsRes.data ?? []) as GoalRow[];

  const goalCountByUser = new Map<string, number>();
  for (const goal of goals) {
    goalCountByUser.set(
      goal.user_id,
      (goalCountByUser.get(goal.user_id) ?? 0) + 1
    );
  }

  return settings.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name || "—",
    email: emailByUser.get(row.user_id) ?? null,
    currency: row.currency,
    tradeCount: tradeCountFromJournal(row.journal_trades),
    goalCount: goalCountByUser.get(row.user_id) ?? 0,
    createdAt: row.created_at,
    lastTradeSync: row.journal_trades_updated_at,
  }));
}

export async function fetchAdminTrades(): Promise<AdminTradeRow[]> {
  const admin = createSupabaseAdminClient();
  const [settingsRes, emailByUser] = await Promise.all([
    admin
      .from("user_settings")
      .select("user_id, full_name, currency, journal_trades"),
    loadEmailByUserId(),
  ]);

  if (settingsRes.error) throw new Error(settingsRes.error.message);

  const settings = (settingsRes.data ?? []) as Pick<
    UserSettingsRow,
    "user_id" | "full_name" | "currency" | "journal_trades"
  >[];

  const rows: AdminTradeRow[] = [];

  for (const account of settings) {
    if (!Array.isArray(account.journal_trades)) continue;
    const currency = asCurrency(account.currency);
    const userName = account.full_name?.trim() || "—";
    const email = emailByUser.get(account.user_id) ?? null;

    for (const raw of account.journal_trades) {
      if (raw == null || typeof raw !== "object") continue;
      const trade = normalizeJournalTrade(raw);
      rows.push({
        key: `${account.user_id}:${trade.id}`,
        userId: account.user_id,
        userName,
        email,
        currency,
        ticker: trade.ticker,
        assetClass: trade.assetClass,
        direction: trade.direction,
        status: trade.status === "Active" ? "Active" : "Closed",
        outcome: trade.outcome,
        strategy: trade.strategy,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        pnl: trade.pnl,
      });
    }
  }

  rows.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  return rows;
}
