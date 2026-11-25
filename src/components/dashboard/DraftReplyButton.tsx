"use client";

import { useState } from "react";
import { Copy, Check, MessageSquareText, Loader2 } from "lucide-react";
import type { Review } from "@/lib/types";
import { InfoTip } from "@/components/dashboard/InfoTip";

type Props = {
  review: Review;
  propertyName: string;
};

export function DraftReplyButton({ review, propertyName }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setOpen(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName,
          guestName: review.guestName,
          score: review.overallScore,
          title: review.title,
          pros: review.pros,
          cons: review.cons,
          text: review.text,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Draft failed.");
        return;
      }
      setReply(data.reply);
      setSource(data.source === "ai" ? "ai" : "rules");
    } catch {
      setError("Could not reach Reply API.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void draft()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-azzurro-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquareText className="h-3.5 w-3.5" />
          )}
          {busy ? "Drafting…" : "Draft reply"}
        </button>
        <InfoTip label="About Draft reply">
          Draft an AI reply in seconds, then copy and paste it into Booking.com
          (or email the guest). Review and tweak before sending — it’s a
          starting point, not auto-posted.
        </InfoTip>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-azzurro-line bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-azzurro-muted">
              {source === "ai"
                ? "AI draft"
                : source === "rules"
                  ? "Template draft"
                  : "Draft"}
            </span>
            {reply && (
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-azzurro-accent hover:underline"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          {error && <p className="text-xs text-azzurro-accent">{error}</p>}
          {reply && (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-azzurro-ink">
              {reply}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
