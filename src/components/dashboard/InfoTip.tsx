"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

type Props = {
  label: string;
  children: string;
  /** Prefer "left" near the right edge of the screen */
  align?: "left" | "right";
};

export function InfoTip({ label, children, align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-azzurro-navy/10 text-azzurro-navy ring-1 ring-azzurro-line transition hover:bg-azzurro-accent/15 hover:text-azzurro-accent"
      >
        <Info className="h-3 w-3" strokeWidth={2.5} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-30 mt-1 w-56 rounded-xl border border-azzurro-line bg-white p-3 text-left text-xs leading-relaxed text-azzurro-ink shadow-lg sm:w-64 ${
            align === "right" ? "right-0" : "left-0"
          } top-full`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
