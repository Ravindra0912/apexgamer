import Link from "next/link";
import Spinner from "@/components/Spinner";

// Shown instantly after clicking a game card, while its details, reviews and
// video guides load. Mirrors the real page layout.
export default function Loading() {
  return (
    <>
      <div className="px-8 pt-3">
        <Link href="/" className="text-sm text-text-dim transition-colors hover:text-text">
          &larr; Back to games
        </Link>
      </div>

      <div className="relative mt-3 h-[380px] w-full animate-pulse bg-surface">
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[1120px] px-8 pb-7">
          <div className="mb-3 h-10 w-2/3 max-w-[480px] rounded bg-surface-hover" />
          <p className="flex items-center gap-2 text-sm text-text-dim">
            <Spinner />
            Loading game details…
          </p>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1120px] grid-cols-1 gap-8 px-8 py-8 md:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          {[0, 1, 2].map((section) => (
            <div key={section}>
              <div className="mb-3.5 h-5 w-32 animate-pulse rounded bg-surface" />
              <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
            </div>
          ))}
        </div>
        <div>
          <div className="mb-3.5 h-5 w-20 animate-pulse rounded bg-surface" />
          <div className="h-44 animate-pulse rounded-xl border border-border bg-surface" />
        </div>
      </main>
    </>
  );
}
