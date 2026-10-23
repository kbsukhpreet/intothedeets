import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prettyDate } from "@/lib/format";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/print-button";
import { ItinerarySheet, type SheetDay } from "@/components/itinerary-sheet";

type Shared = {
  event: { name: string; event_type: string; event_date: string | null; location: string | null; team: string };
  days: SheetDay[];
} | null;

async function load(token: string): Promise<Shared> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("itinerary_public", { p_token: token });
  return (data as Shared) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const data = await load((await params).token);
  if (!data) return { title: "Itinerary — Into the Deets" };
  const title = `${data.event.team} — itinerary`;
  return { title, openGraph: { title, description: "The full schedule, shared with you on Into the Deets." }, robots: { index: false } };
}

export default async function SharedItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await load(token);
  if (!data) notFound();

  const { event, days } = data!;
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Logo />
        <PrintButton label="Print" />
      </div>
      <ItinerarySheet
        eyebrow={event.team}
        title={`${event.name} itinerary`}
        subtitle={[event.event_date ? prettyDate(event.event_date, true) : null, event.location].filter(Boolean).join(" · ")}
        days={days}
      />
      <footer className="mt-10 border-t border-line pt-5 text-center text-sm text-muted print:hidden">
        Planned with{" "}
        <Link href="/" className="font-medium text-accent hover:text-accent-dark">Into the Deets</Link>
        {" "}· dream it. plan it. deet-ail it.
      </footer>
    </main>
  );
}
