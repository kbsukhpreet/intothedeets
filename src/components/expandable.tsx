"use client";

import { useState } from "react";

/** An "Edit" link that opens a form in place and closes again once you save. */
export function Expandable({
  label = "Edit",
  className = "text-xs text-muted hover:text-accent",
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className={className} aria-expanded={open}>
        {open ? "Close" : label}
      </button>
      {open && <div onSubmit={() => setTimeout(() => setOpen(false), 0)}>{children}</div>}
    </div>
  );
}
