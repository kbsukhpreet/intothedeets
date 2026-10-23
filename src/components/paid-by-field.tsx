"use client";

import { useState } from "react";

/** "Paid by" — pick a teammate, a name typed before, or type someone new. */
export function PaidByField({
  people,
  typedNames,
  defaultValue = "",
  meId,
}: {
  people: { id: string; name: string }[];
  typedNames: string[];
  defaultValue?: string; // "user:<id>" | "name:<text>" | ""
  meId: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="space-y-2">
      <select
        name="paid_by"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input select-placeholder"
        aria-label="Paid by"
      >
        <option value="">Paid by</option>
        <optgroup label="Team">
          {people.map((p) => (
            <option key={p.id} value={`user:${p.id}`}>{p.id === meId ? `${p.name} (me)` : p.name}</option>
          ))}
        </optgroup>
        {typedNames.length > 0 && (
          <optgroup label="Others">
            {typedNames.map((n) => (
              <option key={n} value={`name:${n}`}>{n}</option>
            ))}
          </optgroup>
        )}
        <option value="other">Someone else… (type a name)</option>
      </select>
      {value === "other" && (
        <input name="paid_by_name" required autoFocus placeholder="e.g. Groom's parents" className="input" />
      )}
    </div>
  );
}
