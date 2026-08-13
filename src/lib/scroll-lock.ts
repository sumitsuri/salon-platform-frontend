let lockCount = 0;
let savedScrollY = 0;
let useLightLock = false;

interface ScrollSnapshot {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
}

let snapshot: ScrollSnapshot | null = null;

function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}

/** Installed PWA / Add to Home Screen — avoid body position:fixed (breaks Android scroll). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari PWA
    ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function refreshTouchScrollers() {
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>("[data-touch-scroll], .touch-scroll-y").forEach((el) => {
      el.style.removeProperty("-webkit-overflow-scrolling");
      void el.offsetHeight;
      el.style.setProperty("-webkit-overflow-scrolling", "touch");
    });
  });
}

/** Clear orphaned inline scroll styles (e.g. PWA resumed after overlay). Safe when lockCount is 0. */
export function repairOrphanedScrollLock() {
  if (typeof document === "undefined") return;
  if (lockCount > 0) return;

  const body = document.body;
  const html = document.documentElement;
  const stuck =
    body.style.position === "fixed" ||
    body.style.overflow === "hidden" ||
    html.style.overflow === "hidden";

  if (!stuck) return;

  body.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.width = "";
  body.style.paddingRight = "";
  html.style.overflow = "";
  snapshot = null;
  refreshTouchScrollers();
}

/** Ref-counted body scroll lock safe for stacked overlays (drawer + settings, etc.). */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  lockCount += 1;
  if (lockCount > 1) {
    return releaseBodyScroll;
  }

  savedScrollY = window.scrollY;
  const body = document.body;
  const html = document.documentElement;
  const scrollbarWidth = getScrollbarWidth();
  useLightLock = isStandalonePwa();

  snapshot = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
    htmlOverflow: html.style.overflow,
  };

  body.style.overflow = "hidden";
  html.style.overflow = "hidden";

  if (useLightLock) {
    // PWA: overflow lock only — position:fixed breaks touch scroll on Android after unlock.
    return releaseBodyScroll;
  }

  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.width = "100%";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return releaseBodyScroll;
}

function releaseBodyScroll() {
  if (typeof document === "undefined") return;
  if (lockCount <= 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  const body = document.body;
  const html = document.documentElement;
  const scrollY = savedScrollY;
  const wasLightLock = useLightLock;
  useLightLock = false;

  if (snapshot) {
    body.style.overflow = snapshot.bodyOverflow;
    body.style.position = snapshot.bodyPosition;
    body.style.top = snapshot.bodyTop;
    body.style.width = snapshot.bodyWidth;
    body.style.paddingRight = snapshot.bodyPaddingRight;
    html.style.overflow = snapshot.htmlOverflow;
    snapshot = null;
  } else {
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
    body.style.paddingRight = "";
    html.style.overflow = "";
  }

  if (!wasLightLock) {
    window.scrollTo(0, scrollY);
  }

  void body.offsetHeight;
  refreshTouchScrollers();
}
