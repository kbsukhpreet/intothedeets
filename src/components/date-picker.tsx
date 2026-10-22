"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function parse(iso: string | null | undefined) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

/**
 * A friendly calendar picker that matches the site's look.
 * Submits as a normal form field (YYYY-MM-DD), just like a date input.
 */
export function DatePicker({
  name,
  id,
  defaultValue,
  placeholder = "Pick a date",
  short = false,
  prefix = "",
  align = "left",
  className = "",
  ariaLabel,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
  /** Show "Nov 3" instead of "Tue, November 3, 2026" (handy in tight rows). */
  short?: boolean;
  /** Text shown before the chosen date, e.g. "Due ". */
  prefix?: string;
  /** Which edge the calendar lines up with. */
  align?: "left" | "right";
  /** Extra classes for the field, e.g. "w-auto". */
  className?: string;
  ariaLabel?: string;
}) {
  const now = new Date();
  const todayISO = toISO(now.getFullYear(), now.getMonth(), now.getDate());
  const initial = parse(defaultValue);

  const [value, setValue] = useState<string>(initial ? toISO(initial.y, initial.m, initial.d) : "");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [year, setYear] = useState(initial?.y ?? now.getFullYear());
  const [month, setMonth] = useState(initial?.m ?? now.getMonth());
  const wrap = useRef<HTMLDivElement>(null);

  // When the form is reset (e.g. after adding a ticket), go back to the starting value.
  useEffect(() => {
    const form = wrap.current?.closest("form");
    if (!form) return;
    const start = initial ? toISO(initial.y, initial.m, initial.d) : "";
    const onReset = () => setValue(start);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  // Close when clicking outside or pressing Escape.
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

  const selected = parse(value);
  const label = selected
    ? prefix +
      new Date(selected.y, selected.m, selected.d).toLocaleDateString(
        "en-US",
        short
          ? { month: "short", day: "numeric", ...(selected.y !== now.getFullYear() ? { year: "numeric" } : {}) }
          : { weekday: "short", month: "long", day: "numeric", year: "numeric" }
      )
    : "";

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const pick = (d: number) => {
    setValue(toISO(year, month, d));
    setOpen(false);
  };

  return (
    <div ref={wrap} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        onClick={() => {
          setView("days");
          setOpen((o) => !o);
        }}
        className={`input flex items-center justify-between gap-2 whitespace-nowrap text-left ${className} ${open ? "border-accent ring-2 ring-accent/15" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "text-ink" : "text-muted/60"}>{value ? label : placeholder}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} z-30 mt-2 w-[296px] rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_-12px_rgba(34,30,26,0.25)]`}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (view === "days" ? shiftMonth(-1) : setYear((y) => y - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-ink"
              aria-label={view === "days" ? "Previous month" : "Previous year"}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setView((v) => (v === "days" ? "months" : "days"))}
              className="rounded-lg px-2 py-1 font-display text-lg transition hover:bg-paper"
              title={view === "days" ? "Choose month and year" : "Back to days"}
            >
              {view === "days" ? `${MONTHS[month]} ${year}` : year}
            </button>
            <button
              type="button"
              onClick={() => (view === "days" ? shiftMonth(1) : setYear((y) => y + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-ink"
              aria-label={view === "days" ? "Next month" : "Next year"}
            >
              ›
            </button>
          </div>

          {view === "days" ? (
            <>
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wider text-muted">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="py-1">{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                {cells.map((d, i) => {
                  if (d === null) return <span key={`e${i}`} />;
                  const iso = toISO(year, month, d);
                  const isSel = iso === value;
                  const isToday = iso === todayISO;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => pick(d)}
                      className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full tabular-nums transition ${
                        isSel
                          ? "bg-accent font-semibold text-white"
                          : isToday
                            ? "font-semibold text-accent ring-1 ring-accent/40 hover:bg-accent-soft"
                            : "hover:bg-accent-soft"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMonth(i);
                    setView("days");
                  }}
                  className={`rounded-xl py-2.5 text-sm transition ${
                    i === month ? "bg-accent font-medium text-white" : "hover:bg-accent-soft"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="text-muted hover:text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
                setView("days");
              }}
              className="font-medium text-accent hover:text-accent-dark"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
