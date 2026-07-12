/**
 * ThemeToggle — the Skiper UI animated toggle button (#2 from skiper4), wired
 * to the ThemeProvider so a click triggers the staircase theme transition and
 * persists the choice.
 */

"use client";

import { ThemeToggleButton2 } from "@/components/ui/skiper-ui/skiper4";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <span
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <ThemeToggleButton2
        isDark={isDark}
        onToggle={toggle}
        className={className ?? "size-9 p-2 border border-hairline"}
      />
    </span>
  );
}

/**
 * Inline script (rendered in <head>) that applies the persisted theme before
 * React hydrates, preventing a flash of the wrong theme.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
