import type { FeedbackCategory } from "@/lib/feedback";
import { createInsForgeAdminClient } from "@/lib/insforge/admin";

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
  const admin = createInsForgeAdminClient();

  const [feedbackRes, settingsRes, goalsRes] = await Promise.all([
    admin.database
      .from("feedback_submissions")
      .select("id, category, created_at"),
    admin.database
      .from("user_settings")
      .select(
        "user_id, journal_trades, journal_trades_updated_at"
      ),
    admin.database.from("goals").select("user_id"),
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
  const admin = createInsForgeAdminClient();
  const { data, error } = await admin.database
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
  const admin = createInsForgeAdminClient();

  const [settingsRes, goalsRes, feedbackRes] = await Promise.all([
    admin.database
      .from("user_settings")
      .select(
        "user_id, full_name, currency, created_at, journal_trades, journal_trades_updated_at"
      )
      .order("created_at", { ascending: false }),
    admin.database.from("goals").select("user_id"),
    admin.database
      .from("feedback_submissions")
      .select("user_id, email")
      .order("created_at", { ascending: false }),
  ]);

  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (feedbackRes.error) throw new Error(feedbackRes.error.message);

  const settings = (settingsRes.data ?? []) as UserSettingsRow[];
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const feedback = (feedbackRes.data ?? []) as {
    user_id: string;
    email: string;
  }[];

  const goalCountByUser = new Map<string, number>();
  for (const goal of goals) {
    goalCountByUser.set(
      goal.user_id,
      (goalCountByUser.get(goal.user_id) ?? 0) + 1
    );
  }

  const emailByUser = new Map<string, string>();
  for (const row of feedback) {
    if (!emailByUser.has(row.user_id)) {
      emailByUser.set(row.user_id, row.email);
    }
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
