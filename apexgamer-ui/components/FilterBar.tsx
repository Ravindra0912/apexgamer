"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GameCategory, GameSort } from "@/lib/types";

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

  function updateFilters(next: { sort?: GameSort; category?: GameCategory | "ALL" }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextSort = next.sort ?? sort;
    const nextCategory = next.category ?? category;

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
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <div className="mb-7 flex flex-wrap items-center gap-4">
      <div className="flex rounded-lg border border-border bg-surface p-1">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => updateFilters({ sort: option.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              sort === option.value
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
              category === option.value
                ? "bg-accent-soft text-accent-text"
                : "text-text-dim hover:text-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
