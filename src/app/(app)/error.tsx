"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-7 text-center">
      <h1 className="h-display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        {error.message || "We couldn't finish that. Please try again."}
      </p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
