"use client";

import Link from "next/link";
import { switchEvent } from "@/app/(app)/actions";

export function EventSwitcher({
  events,
  currentId,
}: {
  events: { id: string; name: string }[];
  currentId: string;
}) {
  return (
    <div className="space-y-1.5">
      {events.length > 1 ? (
        <form action={switchEvent}>
          <label className="sr-only" htmlFor="event-switch">Switch event</label>
          <select
            id="event-switch"
            name="event_id"
            defaultValue={currentId}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="input cursor-pointer bg-white py-1.5 text-sm font-medium"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </form>
      ) : null}
      <div className="flex gap-3 px-1 text-xs">
        <Link href="/events" className="text-muted hover:text-ink">All events</Link>
        <Link href="/events/new" className="text-accent hover:text-accent-dark">+ New event</Link>
      </div>
    </div>
  );
}
