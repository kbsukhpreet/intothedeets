import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <h1 className="h-display text-4xl">We couldn&apos;t find that</h1>
      <p className="mt-2 text-muted">The page may have moved or been deleted.</p>
      <Link href="/hq" className="btn-primary mt-6">
        Back to HQ
      </Link>
    </main>
  );
}
