"use client";

import { useEffect, useState } from "react";

const WORDS = [
  { emoji: "💍", text: "wedding" },
  { emoji: "🎂", text: "birthday bash" },
  { emoji: "🍼", text: "baby shower" },
  { emoji: "💼", text: "company offsite" },
  { emoji: "✨", text: "gala" },
  { emoji: "🎓", text: "graduation party" },
  { emoji: "🏡", text: "family reunion" },
  { emoji: "🥂", text: "anniversary" },
];

/** "Made for your next ___": the last word gently cycles through event types. */
export function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const w = WORDS[i];
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span key={i} className="inline-block animate-[word-in_550ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none">
        <span aria-hidden className="mr-2 inline-block">{w.emoji}</span>
        <span className="italic text-accent">{w.text}</span>
      </span>
      {/* hand-drawn underline */}
      <svg
        aria-hidden
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="absolute -bottom-2 left-0 h-3 w-full text-accent/40"
      >
        <path d="M2 8 C 40 2, 80 2, 110 6 S 170 11, 198 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">wedding, birthday, shower, offsite, gala and more</span>
    </span>
  );
}
