import { fetchGames } from "@/lib/api";
import GamesGrid from "@/components/GamesGrid";
import FilterBar from "@/components/FilterBar";
import { GameCategory, GameSort } from "@/lib/types";

const SORTS: GameSort[] = ["trending", "popular", "newest"];
const CATEGORIES: GameCategory[] = ["AAA", "INDIE", "UNCLASSIFIED"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string }>;
}) {
  const params = await searchParams;
  const sort: GameSort = SORTS.includes(params.sort as GameSort) ? (params.sort as GameSort) : "newest";
  const category: GameCategory | "ALL" = CATEGORIES.includes(params.category as GameCategory)
    ? (params.category as GameCategory)
    : "ALL";

  const initialPage = await fetchGames({
    limit: 24,
    sort,
    category: category === "ALL" ? undefined : category,
  });

  return (
    <main className="mx-auto max-w-[1280px] px-8 py-8 w-full">
      <h1 className="mb-1 text-2xl font-bold">Games</h1>
      <p className="mb-7 text-sm text-text-dim">
        Browse tracked games. Click a card for full details.
      </p>
      <FilterBar sort={sort} category={category} />
      <GamesGrid key={`${sort}-${category}`} initialPage={initialPage} sort={sort} category={category} />
    </main>
  );
}
