export const VIEW_MODES = [
  {
    value: "personal",
    title: "Just me",
    body: "A simple planner for your tasks, vendors and budget.",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" />
      </>
    ),
  },
  {
    value: "team",
    title: "With a team",
    body: "Invite family or co-planners, assign tickets, and track everyone's progress.",
    icon: (
      <>
        <circle cx="8" cy="9" r="3" />
        <circle cx="16" cy="9" r="3" />
        <path d="M2.5 19c.5-3 2.7-4.5 5.5-4.5s5 1.5 5.5 4.5M13 15c.9-.4 1.9-.5 3-.5 2.8 0 5 1.5 5.5 4.5" />
      </>
    ),
  },
] as const;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Two big tappable cards for choosing personal or team view (used in sign-up). */
export function ViewModeChoice({ defaultValue }: { defaultValue?: string }) {
  return (
    <fieldset>
      <legend className="label">How will you plan?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {VIEW_MODES.map((m) => (
          <label
            key={m.value}
            className="relative flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 border-line bg-white p-4 transition hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/50"
          >
            <input
              type="radio"
              name="view_mode"
              value={m.value}
              required
              defaultChecked={defaultValue === m.value}
              className="peer sr-only"
            />
            <span className="text-accent"><Icon>{m.icon}</Icon></span>
            <span className="font-medium">{m.title}</span>
            <span className="text-xs leading-relaxed text-muted">{m.body}</span>
            <span className="absolute right-3 top-3 hidden h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-white peer-checked:flex">
              ✓
            </span>
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">You can switch anytime in Settings.</p>
    </fieldset>
  );
}

export function ModeIcon({ mode }: { mode: "personal" | "team" }) {
  const m = VIEW_MODES.find((x) => x.value === mode)!;
  return <Icon>{m.icon}</Icon>;
}
