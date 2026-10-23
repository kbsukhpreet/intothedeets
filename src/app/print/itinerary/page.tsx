import Link from "next/link";
import { requireEvent, teamPeople } from "@/lib/event";
import { prettyDate } from "@/lib/format";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/print-button";
import { ItinerarySheet, type SheetDay } from "@/components/itinerary-sheet";

export const metadata = { title: "Itinerary — Into the Deets" };

export default async function PrintItineraryPage() {
  const { supabase, event, team, user, mode } = await requireEvent();

  const [{ data: days }, { data: items }, { data: vendors }, people] = await Promise.all([
    supabase
      .from("itinerary_days")
      .select("id, title, day_date")
      .eq("event_id", event.id)
      .order("day_date", { ascending: true, nullsFirst: false })
      .order("position")
      .order("created_at"),
    supabase
      .from("itinerary_items")
      .select("day_id, start_time, end_time, title, location, notes, responsible_user_id, vendor_id")
      .eq("event_id", event.id)
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("position")
      .order("created_at"),
    supabase.from("vendors").select("id, name").eq("event_id", event.id),
    teamPeople(supabase, event.team_id, user.id),
  ]);

  const personName = new Map(people.map((p) => [p.id, p.name.split(" ")[0]]));
  const vendorName = new Map((vendors ?? []).map((v) => [v.id, v.name]));

  const sheet: SheetDay[] = (days ?? []).map((d) => ({
    ...d,
    items: (items ?? [])
      .filter((i) => i.day_id === d.id)
      .map((i) => ({
        ...i,
        who: i.responsible_user_id
          ? personName.get(i.responsible_user_id) ?? null
          : i.vendor_id
            ? vendorName.get(i.vendor_id) ?? null
            : null,
      })),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link href="/itinerary" className="text-sm text-muted hover:text-ink">← Back to itinerary</Link>
        <PrintButton />
      </div>
      <ItinerarySheet
        eyebrow={mode === "team" ? team.name : event.event_type}
        title={`${event.name} itinerary`}
        subtitle={[event.event_date ? prettyDate(event.event_date, true) : null, event.location].filter(Boolean).join(" · ")}
        days={sheet}
      />
      <div className="mt-10 hidden print:block">
        <Logo />
      </div>
    </main>
  );
}
