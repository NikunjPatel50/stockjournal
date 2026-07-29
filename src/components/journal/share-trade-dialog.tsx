"use client";

import { useCallback, useState } from "react";
import { Download, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/components/settings/settings-provider";
import { isClosedTrade, type JournalTrade } from "@/lib/journal-types";
import {
  sharePagePath,
  tradeCardImagePath,
} from "@/lib/share-trade";

interface ShareTradeDialogProps {
  trade: JournalTrade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTradeDialog({
  trade,
  open,
  onOpenChange,
}: ShareTradeDialogProps) {
  const { settings } = useSettings();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setToken(null);
    setLoading(false);
  }, []);

  const ensureToken = useCallback(async () => {
    if (!trade || !isClosedTrade(trade)) return null;
    if (token) return token;
    setLoading(true);
    try {
      const res = await fetch("/api/trade-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not create share link");
      }
      const data = (await res.json()) as { token: string };
      setToken(data.token);
      return data.token;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [trade, token]);

  async function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
    if (next && trade && settings.display.allowTradeSharing) {
      void ensureToken();
    }
  }

  if (!trade) return null;

  const sharingAllowed = settings.display.allowTradeSharing;
  const canShare = isClosedTrade(trade);
  const previewSrc = token ? tradeCardImagePath(token) : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-border bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4 text-emerald-500" />
            Share trade
          </DialogTitle>
          <DialogDescription>
            Generate a branded card for {trade.ticker}. Only this trade is
            included — no account details.
          </DialogDescription>
        </DialogHeader>

        {!sharingAllowed ? (
          <p className="text-sm text-muted-foreground">
            Trade sharing is turned off in Settings → Display. Enable
            &quot;Allow trade sharing&quot; to create public links.
          </p>
        ) : !canShare ? (
          <p className="text-sm text-muted-foreground">
            Open positions cannot be shared. Close the trade first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
              {loading ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Generating preview…
                </div>
              ) : previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt={`${trade.ticker} share preview`}
                  className="w-full"
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Preview unavailable
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={!sharingAllowed || !canShare || loading}
            onClick={async () => {
              const t = await ensureToken();
              if (!t) return;
              const url = `${window.location.origin}${sharePagePath(t)}`;
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
          >
            <Link2 data-icon="inline-start" />
            Copy link
          </Button>
          <Button
            type="button"
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            disabled={!sharingAllowed || !canShare || loading}
            onClick={async () => {
              const t = await ensureToken();
              if (!t) return;
              const a = document.createElement("a");
              a.href = tradeCardImagePath(t);
              a.download = `${trade.ticker}-trade-card.png`;
              a.click();
            }}
          >
            <Download data-icon="inline-start" />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShareTradeButton({ trade }: { trade: JournalTrade }) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();

  if (!isClosedTrade(trade)) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        title={
          settings.display.allowTradeSharing
            ? "Share trade card"
            : "Enable sharing in Display settings"
        }
      >
        <Share2 className="size-3.5" />
        Share
      </Button>
      <ShareTradeDialog trade={trade} open={open} onOpenChange={setOpen} />
    </>
  );
}
