"use client";

import { startTransition, useOptimistic } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GameCategory, GameSort } from "@/lib/types";
import Spinner from "./Spinner";

const SORT_OPTIONS: { value: GameSort; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
];

const CATEGORY_OPTIONS: { value: GameCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "AAA", label: "AAA" },
  { value: "INDIE", label: "Indie" },
];

export default function FilterBar({
  sort,
  category,
}: {
  sort: GameSort;
  category: GameCategory | "ALL";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL (and so the props) only change once the server re-render lands,
  // which can be slow on a cold backend. The optimistic values highlight the
  // clicked pill immediately and revert to the real props when it arrives.
  const [optimisticSort, setOptimisticSort] = useOptimistic(sort);
  const [optimisticCategory, setOptimisticCategory] = useOptimistic(category);
  const [isPending, setIsPending] = useOptimistic(false);

  function updateFilters(next: { sort?: GameSort; category?: GameCategory | "ALL" }) {
    // Read optimistic values so a second click before the first navigation
    // finishes combines with it instead of reverting it.
    const nextSort = next.sort ?? optimisticSort;
    const nextCategory = next.category ?? optimisticCategory;

    const params = new URLSearchParams(searchParams.toString());
    if (nextSort === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", nextSort);
    }
    if (nextCategory === "ALL") {
      params.delete("category");
    } else {
      params.set("category", nextCategory);
    }

    const query = params.toString();
    startTransition(async () => {
      setOptimisticSort(nextSort);
      setOptimisticCategory(nextCategory);
      setIsPending(true);
      router.push(query ? `/?${query}` : "/");
    });
  }

  return (
    // data-pending lets an ancestor dim the results via CSS alone, without
    // lifting this transition's state up to the server-rendered page.
    <div
      className="mb-7 flex flex-wrap items-center gap-4"
      data-pending={isPending ? "" : undefined}
    >
      <div className="flex rounded-lg border border-border bg-surface p-1">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => updateFilters({ sort: option.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              optimisticSort === option.value
                ? "bg-accent text-white"
                : "text-text-dim hover:text-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex rounded-lg border border-border bg-surface p-1">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => updateFilters({ category: option.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              optimisticCategory === option.value
                ? "bg-accent-soft text-accent-text"
                : "text-text-dim hover:text-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Always rendered and toggled by opacity, so it never shifts layout. */}
      <span
        className={`flex items-center gap-2 text-sm text-text-dim transition-opacity ${
          isPending ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!isPending}
      >
        <Spinner />
        Loading games…
      </span>
    </div>
  );
}
