"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** A dropdown that saves as soon as you pick something (no Save button). */
export function AutoSubmitSelect({
  action,
  name,
  value,
  options,
  hidden,
  className = "",
  ariaLabel,
}: {
  action: (form: FormData) => Promise<void>;
  name: string;
  value: string;
  options: Option[];
  hidden?: Record<string, string>;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <select
        name={name}
        defaultValue={value}
        aria-label={ariaLabel}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={className}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}

/** A dropdown that changes a filter in the page address (e.g. ?event=…). */
export function FilterSelect({
  param,
  value,
  options,
  className = "",
  ariaLabel,
}: {
  param: string;
  value: string;
  options: Option[];
  className?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => {
        const q = new URLSearchParams(search.toString());
        if (e.target.value === "all") q.delete(param);
        else q.set(param, e.target.value);
        router.push(`?${q.toString()}`);
      }}
      className={className}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
