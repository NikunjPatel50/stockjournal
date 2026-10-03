/** Browser message when a request never gets a response (drop, reload, abort). */
export function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const message = error.message.toLowerCase();
  return (
    message === "failed to fetch" ||
    message === "load failed" ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("the operation was aborted")
  );
}
