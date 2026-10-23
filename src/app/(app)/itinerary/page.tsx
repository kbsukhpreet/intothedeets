import Link from "next/link";
import { requireEvent, teamPeople } from "@/lib/event";
import { SITE_URL } from "@/lib/env";
import { formatTime, longDate, prettyDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { DatePicker } from "@/components/date-picker";
import { TimeSelect } from "@/components/time-select";
import { Avatar } from "@/components/avatar";
import {
  addItineraryDay,
  addItineraryItem,
  deleteItineraryDay,
  deleteItineraryItem,
  setItinerarySharing,
  updateItineraryDay,
  updateItineraryItem,
} from "../actions";

type Day = { id: string; title: string; day_date: string | null };
type Item = {
  id: string;
  day_id: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  responsible_user_id: string | null;
  vendor_id: string | null;
};

export default async function ItineraryPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; who?: string }>;
}) {
  const params = await searchParams;
  const { supabase, event, user, mode } = await requireEvent();
  const personal = mode === "personal";

  const [{ data: dayRows }, { data: itemRows }, { data: vendorRows }, { data: shareRow }, people] = await Promise.all([
    supabase
      .from("itinerary_days")
      .select("id, title, day_date")
      .eq("event_id", event.id)
      .order("day_date", { ascending: true, nullsFirst: false })
      .order("position")
      .order("created_at"),
    supabase
      .from("itinerary_items")
      .select("id, day_id, start_time, end_time, title, location, notes, responsible_user_id, vendor_id")
      .eq("event_id", event.id)
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("position")
      .order("created_at"),
    supabase.from("vendors").select("id, name, category").eq("event_id", event.id).neq("status", "declined").order("name"),
    supabase.from("events").select("itinerary_share_token").eq("id", event.id).maybeSingle(),
    teamPeople(supabase, event.team_id, user.id),
  ]);

  const days = (dayRows ?? []) as Day[];
  const allItems = (itemRows ?? []) as Item[];
  const vendors = vendorRows ?? [];
  const shareToken: string | null = shareRow?.itinerary_share_token ?? null;
  const shareLink = shareToken ? `${SITE_URL || "https://intothedeets.com"}/share/itinerary/${shareToken}` : null;

  const day = days.find((d) => d.id === params.day) ?? days[0];
  const justMine = !personal && params.who === "me";
  const items = allItems
    .filter((i) => i.day_id === day?.id)
    .filter((i) => !justMine || i.responsible_user_id === user.id);

  const personById = new Map(people.map((p) => [p.id, p]));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const countByDay = new Map<string, number>();
  for (const i of allItems) countByDay.set(i.day_id, (countByDay.get(i.day_id) ?? 0) + 1);

  const whoValue = (i: Item) =>
    i.responsible_user_id ? `user:${i.responsible_user_id}` : i.vendor_id ? `vendor:${i.vendor_id}` : "";

  const WhoSelect = ({ defaultValue = "" }: { defaultValue?: string }) => (
    <select name="who" defaultValue={defaultValue} className="input select-placeholder" aria-label="Who's responsible">
      <option value="">Who&apos;s responsible?</option>
      <optgroup label={personal ? "You" : "Team"}>
        {people.map((p) => (
          <option key={p.id} value={`user:${p.id}`}>{p.id === user.id ? `${p.name} (me)` : p.name}</option>
        ))}
      </optgroup>
      {vendors.length > 0 && (
        <optgroup label="Vendors">
          {vendors.map((v) => (
            <option key={v.id} value={`vendor:${v.id}`}>{v.name} · {v.category}</option>
          ))}
        </optgroup>
      )}
    </select>
  );

  const ItemFields = ({ item }: { item?: Item }) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <TimeSelect name="start_time" placeholder="Start time" defaultValue={item?.start_time} />
      <TimeSelect name="end_time" placeholder="End time (optional)" defaultValue={item?.end_time} />
      <input
        name="title"
        required
        defaultValue={item?.title ?? ""}
        placeholder="What's happening? e.g. Baraat arrives"
        className="input sm:col-span-2"
      />
      <input name="location" defaultValue={item?.location ?? ""} placeholder="Where? e.g. Front lawn" className="input" />
      <WhoSelect defaultValue={item ? whoValue(item) : ""} />
      <textarea
        name="notes"
        rows={2}
        defaultValue={item?.notes ?? ""}
        placeholder="Notes, e.g. bring the cake knife, cue song #3"
        className="input resize-y sm:col-span-2"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Itinerary"
        subtitle="Plan the day minute by minute, and share it with everyone who needs it."
        action={
          days.length > 0 ? (
            <Link href="/print/itinerary" target="_blank" className="btn-ghost">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" strokeLinejoin="round" />
              </svg>
              Print
            </Link>
          ) : undefined
        }
      />

      {/* No days yet */}
      {days.length === 0 ? (
        <section className="card p-6 sm:p-8">
          <h2 className="h-display text-2xl">Start with your first day</h2>
          <p className="mt-1 text-sm text-muted">
            Add each day of your event: a welcome dinner, the main day, a brunch. Then fill in the timeline.
          </p>
          <form action={addItineraryDay} className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <input name="title" required defaultValue={`${event.name} day`} placeholder="e.g. Wedding day" className="input" />
            <DatePicker name="day_date" defaultValue={event.event_date} placeholder="Date" short />
            <SubmitButton pendingText="Adding…">Add day</SubmitButton>
          </form>
        </section>
      ) : (
        <>
          {/* Day tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {days.map((d) => {
              const active = d.id === day?.id;
              return (
                <Link
                  key={d.id}
                  href={`/itinerary?day=${d.id}${justMine ? "&who=me" : ""}`}
                  className={`rounded-2xl border px-4 py-2 transition ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-white text-ink hover:border-accent/50"
                  }`}
                >
                  <span className="block text-sm font-medium leading-tight">{d.title}</span>
                  <span className={`block text-xs ${active ? "text-white/80" : "text-muted"}`}>
                    {d.day_date ? prettyDate(d.day_date, true) : "No date"} · {countByDay.get(d.id) ?? 0} items
                  </span>
                </Link>
              );
            })}
            <details className="group relative">
              <summary className="cursor-pointer list-none rounded-2xl border border-dashed border-line px-4 py-3 text-sm font-medium text-accent hover:border-accent/50">
                + Add day
              </summary>
              <form
                action={addItineraryDay}
                className="absolute left-0 z-20 mt-2 w-[300px] space-y-3 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_-12px_rgba(34,30,26,0.25)]"
              >
                <input name="title" required placeholder="e.g. Welcome dinner" className="input" />
                <DatePicker name="day_date" placeholder="Date" short />
                <SubmitButton className="btn-primary w-full" pendingText="Adding…">Add day</SubmitButton>
              </form>
            </details>
          </div>

          {day && (
            <section className="card p-5 sm:p-6">
              {/* Day header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="h-display text-2xl">{day.title}</h2>
                  <p className="text-sm text-muted">{day.day_date ? longDate(day.day_date) : "No date set"}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!personal && (
                    <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
                      <Link href={`/itinerary?day=${day.id}`} className={`rounded-md px-3 py-1.5 ${!justMine ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
                        Everyone
                      </Link>
                      <Link href={`/itinerary?day=${day.id}&who=me`} className={`rounded-md px-3 py-1.5 ${justMine ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
                        Just mine
                      </Link>
                    </div>
                  )}
                  <details className="group relative">
                    <summary className="cursor-pointer list-none text-sm text-muted hover:text-ink">Edit day</summary>
                    <div className="absolute right-0 z-20 mt-2 w-[300px] rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_-12px_rgba(34,30,26,0.25)]">
                      <form action={updateItineraryDay} className="space-y-3">
                        <input type="hidden" name="id" value={day.id} />
                        <input name="title" required defaultValue={day.title} className="input" />
                        <DatePicker name="day_date" defaultValue={day.day_date} placeholder="Date" short align="right" />
                        <SubmitButton className="btn-primary w-full">Save</SubmitButton>
                      </form>
                      <form action={deleteItineraryDay} className="mt-3 border-t border-line pt-3">
                        <input type="hidden" name="id" value={day.id} />
                        <ConfirmButton
                          message={`Delete "${day.title}" and everything on its timeline?`}
                          className="text-xs font-medium text-[#b3261e] hover:underline"
                        >
                          Delete this day
                        </ConfirmButton>
                      </form>
                    </div>
                  </details>
                </div>
              </div>

              {/* Timeline */}
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  {justMine ? "Nothing on this day is assigned to you." : "Nothing on the timeline yet. Add the first item below."}
                </p>
              ) : (
                <ol className="relative mt-5">
                  <span aria-hidden className="absolute bottom-3 left-[5.75rem] top-3 hidden w-px bg-line sm:block" />
                  {items.map((i) => {
                    const person = i.responsible_user_id ? personById.get(i.responsible_user_id) : null;
                    const vendor = i.vendor_id ? vendorById.get(i.vendor_id) : null;
                    return (
                      <li key={i.id} className="group relative grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[5rem_1fr]">
                        <div className="text-sm tabular-nums sm:text-right">
                          <span className="font-semibold text-ink">{i.start_time ? formatTime(i.start_time) : "Anytime"}</span>
                          {i.end_time && <span className="block text-xs text-muted">to {formatTime(i.end_time)}</span>}
                        </div>
                        <div className="relative sm:pl-2">
                          <span aria-hidden className="absolute -left-[1.03rem] top-1.5 hidden h-2.5 w-2.5 rounded-full border-2 border-white bg-accent ring-1 ring-accent/30 sm:block" />
                          <div className="rounded-xl bg-paper px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-medium">{i.title}</p>
                              <div className="flex items-center gap-2">
                                {person && (
                                  <span className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs text-muted">
                                    <Avatar id={person.id} name={person.name} size="sm" />
                                    {person.id === user.id ? "You" : person.name.split(" ")[0]}
                                  </span>
                                )}
                                {vendor && (
                                  <Link
                                    href={`/vendors/${vendor.id}`}
                                    className="rounded-full bg-white px-2.5 py-1 text-xs text-muted hover:text-accent"
                                  >
                                    {vendor.name}
                                  </Link>
                                )}
                              </div>
                            </div>
                            {i.location && (
                              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                  <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                                  <circle cx="12" cy="10" r="2.5" />
                                </svg>
                                {i.location}
                              </p>
                            )}
                            {i.notes && <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{i.notes}</p>}
                            <details className="mt-2">
                              <summary className="cursor-pointer list-none text-xs text-muted hover:text-accent">Edit</summary>
                              <form action={updateItineraryItem} className="mt-3 space-y-3">
                                <input type="hidden" name="id" value={i.id} />
                                <ItemFields item={i} />
                                <div className="flex items-center justify-between">
                                  <SubmitButton className="btn-primary py-1.5">Save</SubmitButton>
                                </div>
                              </form>
                              <form action={deleteItineraryItem} className="mt-2">
                                <input type="hidden" name="id" value={i.id} />
                                <ConfirmButton message={`Remove "${i.title}" from the itinerary?`} className="text-xs text-[#b3261e] hover:underline">
                                  Remove item
                                </ConfirmButton>
                              </form>
                            </details>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Add item */}
              <form action={addItineraryItem} className="mt-6 rounded-2xl border border-dashed border-line p-4">
                <input type="hidden" name="day_id" value={day.id} />
                <p className="mb-3 text-sm font-medium">Add to {day.title}</p>
                <ItemFields />
                <div className="mt-3 flex justify-end">
                  <SubmitButton pendingText="Adding…">Add to itinerary</SubmitButton>
                </div>
              </form>
            </section>
          )}

          {/* Sharing */}
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="h-display text-xl">Share the itinerary</h2>
                <p className="mt-1 max-w-xl text-sm text-muted">
                  Send a view-only link to vendors, the wedding party or guests. They don&apos;t need an
                  account, and they can&apos;t make changes. Notes are included, so keep anything private out of them.
                </p>
              </div>
              {shareLink && (
                <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-sage">Sharing is on</span>
              )}
            </div>
            {shareLink ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input readOnly value={shareLink} className="input min-w-0 flex-1 font-mono text-xs" />
                  <CopyButton value={shareLink} />
                  <Link href={shareLink} target="_blank" className="btn-ghost">Open</Link>
                </div>
                <form action={setItinerarySharing}>
                  <input type="hidden" name="on" value="0" />
                  <ConfirmButton
                    message="Turn off sharing? The link will stop working for everyone you sent it to."
                    className="text-xs text-muted hover:text-[#b3261e]"
                  >
                    Turn off sharing
                  </ConfirmButton>
                </form>
              </div>
            ) : (
              <form action={setItinerarySharing} className="mt-4">
                <input type="hidden" name="on" value="1" />
                <SubmitButton className="btn-primary" pendingText="Creating link…">Create share link</SubmitButton>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
