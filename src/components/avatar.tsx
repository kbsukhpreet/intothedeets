import { initials } from "@/lib/format";

const COLORS = [
  "bg-[#f5e6df] text-[#8c4431]",
  "bg-[#e6eee5] text-[#4b6650]",
  "bg-[#f8edd6] text-[#8a5b0f]",
  "bg-[#e5ebf3] text-[#3f5a7d]",
  "bg-[#efe6f3] text-[#6d4a7d]",
  "bg-[#e3f0ee] text-[#2f6a63]",
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  id,
  name,
  size = "md",
}: {
  id: string | null;
  name: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  if (!id || !name) {
    return (
      <span
        title="Unassigned"
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line text-muted ${dims}`}
      >
        ?
      </span>
    );
  }
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${colorFor(id)}`}
    >
      {initials(name)}
    </span>
  );
}
