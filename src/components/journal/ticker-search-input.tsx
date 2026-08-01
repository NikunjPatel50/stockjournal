"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  pickBestSymbolMatch,
  symbolNotFoundMessage,
  type SymbolSearchResult,
} from "@/lib/symbol-search";
import {
  formatTickerDisplayLabel,
  isTickerDisplayLabel,
  normalizeEquityTicker,
  parseTickerInput,
} from "@/lib/ticker-normalize";
import { cn } from "@/lib/utils";

export type TickerSearchInputHandle = {
  commit: () => Promise<boolean>;
};

type TickerSearchInputProps = {
  value: string;
  onChange: (ticker: string) => void;
  onBlur?: () => void;
  listingMarket: ListingMarketId;
  error?: string;
  className?: string;
  disabled?: boolean;
};

async function fetchSymbolSuggestions(
  query: string,
  listingMarket: ListingMarketId
): Promise<SymbolSearchResult[]> {
  const params = new URLSearchParams({ q: query, listingMarket });
  const res = await fetch(`/api/symbol-search?${params.toString()}`);
  if (!res.ok) {
    throw new Error("search_failed");
  }
  const data = (await res.json()) as { results?: SymbolSearchResult[] };
  return data.results ?? [];
}

export const TickerSearchInput = forwardRef<
  TickerSearchInputHandle,
  TickerSearchInputProps
>(function TickerSearchInput(
  {
    value,
    onChange,
    onBlur,
    listingMarket,
    error,
    className,
    disabled,
  },
  ref
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const committedCodeRef = useRef<string | null>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SymbolSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [localError, setLocalError] = useState<string | undefined>();
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const setError = useCallback((message: string | undefined) => {
    setLocalError(message);
  }, []);

  const resolveAndCommit = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("Ticker is required");
        onChange("");
        return false;
      }

      const parsed = parseTickerInput(trimmed);
      if (parsed && value && parsed === normalizeEquityTicker(value)) {
        setError(undefined);
        onChange(parsed);
        return true;
      }

      const searchText = isTickerDisplayLabel(trimmed) ? parsed : trimmed;
      if (!searchText) {
        setError("Ticker is required");
        return false;
      }

      try {
        const results = await fetchSymbolSuggestions(searchText, listingMarket);
        const match = pickBestSymbolMatch(searchText, results);
        if (!match) {
          setError(symbolNotFoundMessage(listingMarket));
          return false;
        }
        setError(undefined);
        onChange(match.code);
        setQuery(formatTickerDisplayLabel(match.name, match.code));
        setSuggestions(results);
        return true;
      } catch {
        setError("Could not verify symbol. Try again.");
        return false;
      }
    },
    [listingMarket, onChange, setError, value]
  );

  useImperativeHandle(
    ref,
    () => ({
      commit: () => resolveAndCommit(query),
    }),
    [query, resolveAndCommit]
  );

  const updateDropdownPosition = useCallback(() => {
    const anchor = inputRef.current ?? rootRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, suggestions, query, updateDropdownPosition]);

  useEffect(() => {
    setLocalError(undefined);
    setSearchError(false);
  }, [listingMarket]);

  useEffect(() => {
    const normalized = value ? normalizeEquityTicker(value) : "";
    setQuery((current) => {
      if (!normalized) {
        committedCodeRef.current = null;
        return "";
      }

      committedCodeRef.current = normalized;
      const currentParsed = parseTickerInput(current);
      if (currentParsed === normalized) return current;
      return normalized;
    });
    if (normalized) {
      setOpen(false);
      setSuggestions([]);
      setLoading(false);
      setSearchError(false);
    }
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setLoading(false);
      setSearchError(false);
      setOpen(false);
      return;
    }

    const parsed = parseTickerInput(trimmed);
    const committedTicker = value ? normalizeEquityTicker(value) : null;
    if (
      (committedTicker && parsed === committedTicker) ||
      (committedCodeRef.current && parsed === committedCodeRef.current)
    ) {
      setSuggestions([]);
      setLoading(false);
      setSearchError(false);
      setOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setSearchError(false);
    setOpen(true);

    const timer = window.setTimeout(async () => {
      try {
        const searchText = isTickerDisplayLabel(trimmed)
          ? parsed
          : trimmed;
        const results = await fetchSymbolSuggestions(searchText, listingMarket);
        if (requestId !== requestIdRef.current) return;
        setSuggestions(results);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setSearchError(true);
        setOpen(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [listingMarket, query, value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-ticker-search-dropdown]")
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectSuggestion(result: SymbolSearchResult) {
    committedCodeRef.current = result.code;
    setError(undefined);
    onChange(result.code);
    setQuery(formatTickerDisplayLabel(result.name, result.code));
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(next: string) {
    committedCodeRef.current = null;
    setQuery(next);
    setError(undefined);
    if (!next.trim()) {
      onChange("");
    }
    setOpen(true);
    updateDropdownPosition();
  }

  async function handleBlur() {
    onBlur?.();
    const trimmed = query.trim();
    if (!trimmed) {
      if (value) onChange("");
      return;
    }

    const parsed = parseTickerInput(trimmed);
    if (parsed && value && parsed === normalizeEquityTicker(value)) {
      setError(undefined);
      return;
    }

    await resolveAndCommit(trimmed);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        void resolveAndCommit(query);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        index < suggestions.length - 1 ? index + 1 : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index > 0 ? index - 1 : suggestions.length - 1
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex]);
        return;
      }
      void resolveAndCommit(query);
      setOpen(false);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const shownError = error ?? localError;
  const showDropdown = open && query.trim().length > 0;

  const dropdown =
    showDropdown && typeof document !== "undefined"
      ? createPortal(
          <div
            data-ticker-search-dropdown
            style={{
              position: "fixed",
              top: dropdownStyle?.top ?? 0,
              left: dropdownStyle?.left ?? 0,
              width: dropdownStyle?.width ?? 320,
              zIndex: 200,
              visibility: dropdownStyle ? "visible" : "hidden",
            }}
            className="overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          >
            {loading ? (
              <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Searching…
              </p>
            ) : searchError ? (
              <p className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                Could not load suggestions. Try again.
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No symbols found for this market.
              </p>
            ) : (
              <ul role="listbox" className="max-h-64 overflow-auto py-1">
                {suggestions.map((result, index) => (
                  <li key={`${result.exchange}-${result.code}`} role="option">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                        index === activeIndex
                          ? "bg-violet-50 dark:bg-violet-950/30"
                          : "hover:bg-violet-50/80 dark:hover:bg-violet-950/20"
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(result)}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {result.name}
                      </span>
                      <span className="shrink-0 font-mono text-sm font-bold tracking-tight text-foreground">
                        {result.code}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            const trimmed = query.trim();
            if (!trimmed) return;

            const parsed = parseTickerInput(trimmed);
            const committedTicker = value ? normalizeEquityTicker(value) : null;
            const isCommitted =
              (committedTicker && parsed === committedTicker) ||
              (committedCodeRef.current && parsed === committedCodeRef.current);

            if (!isCommitted) {
              setOpen(true);
              updateDropdownPosition();
            }
          }}
          onBlur={() => {
            void handleBlur();
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. AAPL or Apple"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={shownError ? true : undefined}
          aria-expanded={open}
          aria-autocomplete="list"
          className={cn(
            className,
            shownError && "border-rose-500 focus-visible:ring-rose-500/30"
          )}
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {dropdown}

      {shownError ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          {shownError}
        </p>
      ) : null}
    </div>
  );
});
