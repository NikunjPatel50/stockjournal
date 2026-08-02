#!/usr/bin/env node
/**
 * Migrate a user's data from InsForge (or a browser export JSON) into Supabase.
 *
 * InsForge source (when API is available):
 *   node scripts/migrate-insforge-to-supabase.mjs --email nicksofficialindia@gmail.com
 *
 * Browser localStorage export:
 *   node scripts/migrate-insforge-to-supabase.mjs --from-json ./insforge-backup.json --email nicksofficialindia@gmail.com
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i);
    let value = trimmed.slice(i + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseArgs(argv) {
  const args = { email: "", fromJson: "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--email") args.email = argv[++i] ?? "";
    else if (argv[i] === "--from-json") args.fromJson = argv[++i] ?? "";
  }
  return args;
}

function insforgeHeaders(apiKey) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function supabaseHeaders(serviceKey, prefer = "return=minimal") {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

async function insforgeGet(baseUrl, apiKey, table, query) {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: insforgeHeaders(apiKey) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`InsForge ${table} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : [];
}

async function supabaseRest(supabaseUrl, serviceKey, method, path, body, prefer) {
  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    method,
    headers: supabaseHeaders(serviceKey, prefer),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function findInsforgeUserId(email, baseUrl, apiKey) {
  const rows = await insforgeGet(
    baseUrl,
    apiKey,
    "user_settings",
    "select=user_id,full_name,journal_trades&limit=500"
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No user_settings rows returned from InsForge.");
  }

  try {
    const sql = `SELECT id, email FROM auth.users WHERE lower(email) = lower('${email.replace(/'/g, "''")}') LIMIT 1`;
    const out = execSync(`npx @insforge/cli@latest db query ${JSON.stringify(sql)} --json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(out);
    const row = parsed?.rows?.[0] ?? parsed?.[0];
    if (row?.id) return String(row.id);
  } catch {
    // CLI query unavailable; fall through.
  }

  const withTrades = rows
    .map((r) => ({
      userId: String(r.user_id),
      tradeCount: Array.isArray(r.journal_trades) ? r.journal_trades.length : 0,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  if (withTrades[0]?.tradeCount > 0) {
    console.warn(
      `Could not resolve InsForge user by email; using user_id with most trades (${withTrades[0].tradeCount}).`
    );
    return withTrades[0].userId;
  }

  throw new Error(`No InsForge user found for ${email}.`);
}

async function fetchInsforgeUserData(userId, baseUrl, apiKey) {
  const [settingsRows, goals, disciplineRules] = await Promise.all([
    insforgeGet(baseUrl, apiKey, "user_settings", `user_id=eq.${userId}&select=*`),
    insforgeGet(baseUrl, apiKey, "goals", `user_id=eq.${userId}&select=*`),
    insforgeGet(
      baseUrl,
      apiKey,
      "discipline_rules",
      `user_id=eq.${userId}&select=*&order=sort_order.asc`
    ),
  ]);

  const settings = settingsRows[0] ?? null;
  return {
    journalTrades: Array.isArray(settings?.journal_trades) ? settings.journal_trades : [],
    journalTradesUpdatedAt: settings?.journal_trades_updated_at ?? null,
    settings,
    goals: Array.isArray(goals) ? goals : [],
    disciplineRules: Array.isArray(disciplineRules) ? disciplineRules : [],
  };
}

function normalizeExportJson(raw) {
  return {
    journalTrades: raw.journalTrades ?? raw.journal_trades ?? raw.trades ?? [],
    journalTradesUpdatedAt:
      raw.journalTradesUpdatedAt ?? raw.journal_trades_updated_at ?? null,
    settings: raw.settings ?? raw.user_settings ?? null,
    goals: raw.goals ?? [],
    disciplineRules: raw.disciplineRules ?? raw.discipline_rules ?? [],
  };
}

async function findSupabaseUserId(supabaseUrl, serviceKey, email) {
  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message ?? `Supabase auth lookup failed (${res.status})`);
  }
  const user = body.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) throw new Error(`No Supabase user for ${email}. Sign in once first.`);
  return user.id;
}

async function importToSupabase(supabaseUrl, serviceKey, supabaseUserId, payload) {
  const settings = payload.settings;
  const settingsRow = {
    user_id: supabaseUserId,
    full_name: settings?.full_name ?? settings?.profile?.fullName ?? "Nikunj Patel",
    handle: settings?.handle ?? settings?.profile?.handle ?? "",
    initials: settings?.initials ?? settings?.profile?.initials ?? "",
    currency: settings?.currency ?? settings?.profile?.currency ?? "INR",
    starting_balance: Number(
      settings?.starting_balance ?? settings?.profile?.startingBalance ?? 10000
    ),
    risk: settings?.risk ?? {},
    customization: settings?.customization ?? {},
    display: settings?.display ?? {},
    journal_trades: payload.journalTrades,
    journal_trades_updated_at:
      payload.journalTradesUpdatedAt ?? new Date().toISOString(),
  };

  const existing = await supabaseRest(
    supabaseUrl,
    serviceKey,
    "GET",
    `user_settings?user_id=eq.${supabaseUserId}&select=id&limit=1`,
    null,
    "return=representation"
  );

  if (existing?.[0]?.id) {
    await supabaseRest(
      supabaseUrl,
      serviceKey,
      "PATCH",
      `user_settings?user_id=eq.${supabaseUserId}`,
      settingsRow
    );
  } else {
    await supabaseRest(supabaseUrl, serviceKey, "POST", "user_settings", settingsRow);
  }

  if (payload.goals.length > 0) {
    const goals = payload.goals.map((g) => ({
      id: g.id,
      user_id: supabaseUserId,
      title: g.title,
      category: g.category,
      category_label: g.category_label ?? g.categoryLabel ?? "",
      period: g.period,
      metric_type: g.metric_type ?? g.metricType,
      current_value: g.current_value ?? g.currentValue ?? 0,
      target_value: g.target_value ?? g.targetValue ?? 0,
      start_value: g.start_value ?? g.startValue ?? 0,
      start_date: g.start_date ?? g.startDate,
      end_date: g.end_date ?? g.endDate,
      status: g.status ?? "on_track",
      auto_track: g.auto_track ?? g.autoTrack ?? true,
      completed: g.completed ?? false,
      daily_rate: g.daily_rate ?? g.dailyRate ?? 0,
      unit: g.unit ?? "",
    }));

    await supabaseRest(
      supabaseUrl,
      serviceKey,
      "DELETE",
      `goals?user_id=eq.${supabaseUserId}`,
      null
    );
    await supabaseRest(supabaseUrl, serviceKey, "POST", "goals", goals);
  }

  if (payload.disciplineRules.length > 0) {
    const rules = payload.disciplineRules.map((r, index) => ({
      id: r.id,
      user_id: supabaseUserId,
      label: r.label,
      checked: r.checked ?? false,
      sort_order: r.sort_order ?? r.sortOrder ?? index,
    }));

    await supabaseRest(
      supabaseUrl,
      serviceKey,
      "DELETE",
      `discipline_rules?user_id=eq.${supabaseUserId}`,
      null
    );
    await supabaseRest(supabaseUrl, serviceKey, "POST", "discipline_rules", rules);
  }

  return {
    trades: payload.journalTrades.length,
    goals: payload.goals.length,
    disciplineRules: payload.disciplineRules.length,
  };
}

async function main() {
  const { email, fromJson } = parseArgs(process.argv);
  if (!email) {
    console.error("Usage: --email you@example.com [--from-json backup.json]");
    process.exit(1);
  }

  const env = {
    ...loadEnvFile(resolve(process.cwd(), ".env.local")),
    ...process.env,
  };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabaseUserId = await findSupabaseUserId(supabaseUrl, serviceKey, email);
  console.log(`Supabase user: ${supabaseUserId}`);

  let payload;
  if (fromJson) {
    const raw = JSON.parse(readFileSync(resolve(fromJson), "utf8"));
    payload = normalizeExportJson(raw);
    console.log(`Loaded export from ${fromJson}`);
  } else {
    const baseUrl = env.NEXT_PUBLIC_INSFORGE_URL;
    const apiKey = env.INSFORGE_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error(
        "InsForge env missing. Use --from-json or restore InsForge API access."
      );
    }
    const insforgeUserId = await findInsforgeUserId(email, baseUrl, apiKey);
    console.log(`InsForge user: ${insforgeUserId}`);
    payload = await fetchInsforgeUserData(insforgeUserId, baseUrl, apiKey);
  }

  const summary = await importToSupabase(
    supabaseUrl,
    serviceKey,
    supabaseUserId,
    payload
  );
  console.log("Migration complete:", summary);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
