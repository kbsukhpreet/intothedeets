import { TIME_OPTIONS } from "@/lib/format";

/** A tidy time dropdown in 15-minute steps (e.g. "4:30 PM"). Submits "HH:MM". */
export function TimeSelect({
  name,
  defaultValue,
  placeholder,
  id,
  className = "",
}: {
  name: string;
  defaultValue?: string | null;
  placeholder: string;
  id?: string;
  className?: string;
}) {
  const value = defaultValue ? defaultValue.slice(0, 5) : "";
  const options =
    value && !TIME_OPTIONS.some((o) => o.value === value)
      ? [...TIME_OPTIONS, { value, label: value }].sort((a, b) => a.value.localeCompare(b.value))
      : TIME_OPTIONS;
  return (
    <select id={id} name={name} defaultValue={value} aria-label={placeholder} className={`input select-placeholder ${className}`}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
