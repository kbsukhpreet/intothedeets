"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A small pop-up box (e.g. "Edit day"). Closes when you click outside it,
 * press Escape, or submit a form inside it.
 */
export function Popover({
  label,
  triggerClassName = "",
  align = "left",
  width = "w-[300px]",
  children,
}: {
  label: React.ReactNode;
  triggerClassName?: string;
  align?: "left" | "right";
  width?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={triggerClassName}
      >
        {label}
      </button>
      {open && (
        <div
          onSubmit={() => setTimeout(() => setOpen(false), 0)}
          className={`absolute ${align === "right" ? "right-0" : "left-0"} z-20 mt-2 ${width} rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_-12px_rgba(34,30,26,0.25)]`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
