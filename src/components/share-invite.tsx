"use client";

import { useEffect, useState } from "react";

/** Copy (or, on phones, share) the invite message together with the link. */
export function ShareInvite({ message, link }: { message: string; link: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const full = `${message}\n${link}`;

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invite:", full);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ text: message, url: link });
    } catch {
      /* closed the share sheet */
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-paper p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Your invite message</p>
        <p className="mt-2 text-sm leading-relaxed">{message}</p>
        <p className="mt-1 break-all font-mono text-xs text-accent">{link}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-primary">
          {copied ? "Copied! Paste it anywhere" : "Copy invite"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn-ghost">
            Share…
          </button>
        )}
      </div>
    </div>
  );
}
