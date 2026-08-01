#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! gh auth status >/dev/null 2>&1; then
  echo "Log in to GitHub first:"
  echo "  gh auth login --hostname github.com --git-protocol https --web"
  exit 1
fi

REPO_NAME="${1:-swingtradinglog}"
VISIBILITY="${2:-private}"

if git remote get-url origin >/dev/null 2>&1; then
  echo "Pushing to existing origin..."
  git push -u origin main
else
  echo "Creating GitHub repo: $REPO_NAME ($VISIBILITY)"
  gh repo create "$REPO_NAME" \
    --"$VISIBILITY" \
    --source=. \
    --remote=origin \
    --push \
    --description "SwingTradingLog — trading journal with InsForge backend"
fi

echo ""
echo "Done. Next: import this repo at https://vercel.com/new"
echo "Add env vars from .env.example, then connect swingtradinglog.com in Vercel domains."
