type ScrollEndListener = () => void;

let scrollActive = false;
let scrollEndTimer: number | null = null;
const scrollEndListeners = new Set<ScrollEndListener>();

export function isScrollActive() {
  return scrollActive;
}

export function onScrollEnd(listener: ScrollEndListener) {
  scrollEndListeners.add(listener);
  return () => {
    scrollEndListeners.delete(listener);
  };
}

function notifyScrollEnd() {
  scrollActive = false;
  for (const listener of scrollEndListeners) {
    listener();
  }
}

export function bindScrollActivity(element: HTMLElement) {
  const onScroll = () => {
    scrollActive = true;
    if (scrollEndTimer != null) {
      window.clearTimeout(scrollEndTimer);
    }
    scrollEndTimer = window.setTimeout(notifyScrollEnd, 140);
  };

  element.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    element.removeEventListener("scroll", onScroll);
    if (scrollEndTimer != null) {
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = null;
    }
    scrollActive = false;
  };
}
