import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { EventForm } from "@/components/event-form";
import { createEvent } from "../actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; team?: string; new_team?: string }>;
}) {
  const { error, team, new_team } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ count }, { data: teams }, { data: profile }] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id, name").order("created_at"),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const isFirst = !count;
  const fullName = profile?.full_name ?? "";
  const firstName = fullName.split(" ")[0];
  const lastName = fullName.split(" ").length > 1 ? fullName.split(" ").slice(-1)[0] : "";
  const suggestedTeamName = lastName ? `The ${lastName} Family` : firstName ? `${firstName}'s team` : "My team";
  const joinedTeam = (teams ?? []).find((t) => t.id === team);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
      <div className="mb-10 flex items-center justify-between">
        <Logo href={isFirst ? "/" : "/hq"} />
        {!isFirst && (
          <Link href="/hq" className="text-sm text-muted hover:text-ink">Cancel</Link>
        )}
      </div>
      <h1 className="h-display text-4xl">
        {new_team
          ? "Start a new team"
          : joinedTeam
            ? `Welcome to ${joinedTeam.name}! Add your first event`
            : isFirst
              ? `Welcome${firstName ? `, ${firstName}` : ""}! Let's set up your first event`
              : "Add a new event"}
      </h1>
      <p className="mt-2 text-muted">
        Just the basics for now. You can change any of this later.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{error}</p>
      )}

      <div className="mt-8">
        <EventForm
          action={createEvent}
          submitLabel={isFirst ? "Create my event" : "Create event"}
          teams={teams ?? []}
          defaultTeamId={team}
          suggestedTeamName={new_team ? "" : suggestedTeamName}
          forceNewTeam={Boolean(new_team)}
        />
      </div>
    </main>
  );
}
