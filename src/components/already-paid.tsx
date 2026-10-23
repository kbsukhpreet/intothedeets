"use client";

import { useEffect, useRef, useState } from "react";
import { PaidByField } from "@/components/paid-by-field";

/** "Already paid" checkbox that reveals a "Paid by" picker when ticked. */
export function AlreadyPaid({
  people,
  typedNames,
  meId,
}: {
  people: { id: string; name: string }[];
  typedNames: string[];
  meId: string;
}) {
  const [paid, setPaid] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Untick again after the payment is added (the form resets itself).
  useEffect(() => {
    const form = wrap.current?.closest("form");
    if (!form) return;
    const onReset = () => setPaid(false);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  return (
    <div ref={wrap} className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="paid"
          checked={paid}
          onChange={(e) => setPaid(e.target.checked)}
          className="accent-[#a8553f]"
        />
        Already paid
      </label>
      {paid && (
        <>
          <p className="text-xs text-muted">The date above will be saved as the date it was paid.</p>
          <PaidByField people={people} typedNames={typedNames} defaultValue={`user:${meId}`} meId={meId} />
        </>
      )}
    </div>
  );
}
