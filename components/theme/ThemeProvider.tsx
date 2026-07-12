/**
 * ThemeProvider + staircase theme-transition overlay.
 *
 * Recreates the Skiper UI "staircase opening" theme transition:
 *  1. A stack of full-width panels wipes across the screen. A per-panel stagger
 *     turns the leading edge into a diagonal staircase.
 *  2. Once the screen is fully covered, the theme (`.dark` class) is flipped.
 *  3. The panels retract, revealing the new theme underneath.
 *
 * Any component can trigger it via the useTheme() hook. Honors
 * prefers-reduced-motion (skips the animation, just flips the theme).
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, useAnimationControls } from "framer-motion";

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
  isAnimating: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}

const PANELS = 6; // number of staircase steps
const STEP = 0.075; // stagger between steps (s)
const DURATION = 0.42; // per-panel wipe duration (s)
const EASE = [0.65, 0, 0.35, 1] as const; // smooth ease-in-out

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* ignore storage errors */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");
  // Color the overlay paints while sweeping = the theme we're moving TO.
  const [overlayColor, setOverlayColor] = useState("#0b0b0c");
  const controls = useAnimationControls();
  const busy = useRef(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(async () => {
    if (busy.current) return;
    const next = !document.documentElement.classList.contains("dark");

    // Respect reduced-motion: flip instantly, no overlay.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      applyTheme(next);
      setIsDark(next);
      return;
    }

    busy.current = true;
    setIsAnimating(true);
    setOverlayColor(next ? "#0b0b0c" : "#ffffff");

    // Phase 1 — cover: panels grow from the left, staggered into a staircase.
    setPhase("cover");
    await controls.start("cover");

    // Flip the theme while the screen is fully covered.
    applyTheme(next);
    setIsDark(next);

    // Phase 2 — reveal: panels retract to the right, uncovering the new theme.
    setPhase("reveal");
    await controls.start("reveal");

    controls.set("hidden");
    setPhase("idle");
    setIsAnimating(false);
    busy.current = false;
  }, [controls]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle, isAnimating }}>
      {children}

      {/* Full-screen staircase overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999] flex flex-col"
        style={{ display: phase === "idle" ? "none" : "flex" }}
      >
        {Array.from({ length: PANELS }).map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate={controls}
            variants={{
              hidden: { scaleX: 0 },
              cover: (idx: number) => ({
                scaleX: 1,
                transition: {
                  duration: DURATION,
                  delay: idx * STEP,
                  ease: EASE,
                },
              }),
              reveal: (idx: number) => ({
                scaleX: 0,
                transition: {
                  duration: DURATION,
                  delay: idx * STEP,
                  ease: EASE,
                },
              }),
            }}
            style={{
              flex: 1,
              backgroundColor: overlayColor,
              // Cover grows from the left; reveal collapses to the right —
              // together they form a continuous left-to-right sweep.
              transformOrigin: phase === "reveal" ? "right center" : "left center",
              willChange: "transform",
            }}
          />
        ))}
      </div>
    </ThemeContext.Provider>
  );
}
