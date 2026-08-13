let lockCount = 0;
let savedScrollY = 0;

interface BodySnapshot {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
}

let snapshot: BodySnapshot | null = null;

function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
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
  const scrollbarWidth = getScrollbarWidth();

  snapshot = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };

  body.style.overflow = "hidden";
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
  const scrollY = savedScrollY;

  if (snapshot) {
    body.style.overflow = snapshot.overflow;
    body.style.position = snapshot.position;
    body.style.top = snapshot.top;
    body.style.width = snapshot.width;
    body.style.paddingRight = snapshot.paddingRight;
    snapshot = null;
  } else {
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
    body.style.paddingRight = "";
  }

  window.scrollTo(0, scrollY);

  // Android Chrome can lose touch momentum on nested overflow containers after body unlock.
  void body.offsetHeight;
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>("[data-touch-scroll]").forEach((el) => {
      el.style.removeProperty("-webkit-overflow-scrolling");
      void el.offsetHeight;
      el.style.setProperty("-webkit-overflow-scrolling", "touch");
    });
  });
}
