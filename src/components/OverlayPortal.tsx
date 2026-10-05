"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a full-screen overlay at the end of <body>. Pages scroll inside the shell's
 * <main data-touch-scroll>, whose -webkit-overflow-scrolling makes iOS Safari treat it as a stacking
 * context — a fixed sheet left inside it paints under the fixed mobile header and bottom tab bar no
 * matter its z-index, hiding headers and footer actions on iPhone.
 */
export function OverlayPortal({ children }: { children: React.ReactNode }) {
  // false during static export / hydration, true in the browser — no effect-driven re-render needed.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}

const noopSubscribe = () => () => {};
