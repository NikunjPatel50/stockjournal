/**
 * Run in the browser console on swingtradinglog.com (or localhost) in the SAME
 * browser/profile you used before the Supabase migration.
 *
 * Copies a JSON backup to clipboard. Save as insforge-backup.json, then:
 *   node scripts/migrate-insforge-to-supabase.mjs --from-json insforge-backup.json --email nicksofficialindia@gmail.com
 */
(function exportSwingTradingLogStorage() {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith("swingtradinglog_") || k === "tradelog_trades" || k.startsWith("tradetracker_")
  );

  const dump = { keys, journalTrades: [], goals: [], settings: null };
  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "null");
      if (key.includes("_trades_v1_")) dump.journalTrades = value;
      else if (key.includes("_goals_v1_")) dump.goals = value;
      else if (key.includes("_settings_v1_")) dump.settings = value;
      dump[key] = value;
    } catch {
      dump[key] = localStorage.getItem(key);
    }
  }

  const json = JSON.stringify(dump, null, 2);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json);
    console.log(`Copied ${keys.length} localStorage keys to clipboard.`);
  } else {
    console.log(json);
  }
  return dump;
})();
