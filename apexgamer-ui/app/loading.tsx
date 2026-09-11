import Spinner from "@/components/Spinner";

// Shown instantly while the home page's server render (and its backend fetch)
// is in flight. Mirrors the real layout so content doesn't jump on arrival.
export default function Loading() {
  return (
    <main className="mx-auto max-w-[1280px] px-8 py-8 w-full">
      <h1 className="mb-1 text-2xl font-bold">Games</h1>
      <p className="mb-7 flex items-center gap-2 text-sm text-text-dim">
        <Spinner />
        Loading games…
      </p>
      <div className="mb-7 h-[42px] w-[420px] max-w-full animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[14px] border border-border bg-surface">
            <div className="aspect-video w-full animate-pulse bg-surface-hover" />
            <div className="space-y-2.5 px-4 pt-3.5 pb-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 animate-pulse rounded-full bg-surface-hover" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-surface-hover" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
