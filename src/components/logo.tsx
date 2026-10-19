import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#a8553f" />
        <circle cx="26" cy="34" r="12" fill="none" stroke="#faf7f2" strokeWidth="4" />
        <circle cx="38" cy="34" r="12" fill="none" stroke="#faf7f2" strokeWidth="4" />
      </svg>
      <span className="h-display text-xl">Into the Deets</span>
    </Link>
  );
}
