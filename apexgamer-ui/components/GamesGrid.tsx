"use client";

import { useState } from "react";
import { Game, GameCategory, GamesPage, GameSort } from "@/lib/types";
import GameCard from "./GameCard";

const PAGE_SIZE = 24;

export default function GamesGrid({
  initialPage,
  sort,
  category,
}: {
  initialPage: GamesPage;
  sort: GameSort;
  category: GameCategory | "ALL";
}) {
  const [games, setGames] = useState<Game[]>(initialPage.data);
  const [paging, setPaging] = useState(initialPage.paging);
  const [loading, setLoading] = useState(false);
  // A short page is already the last one, so don't offer "Load more" for it.
  const [done, setDone] = useState(initialPage.data.length < PAGE_SIZE);

  async function loadMore() {
    // `after` may legitimately be null (the last row's sort value was null),
    // so only afterId decides whether there is a cursor to continue from.
    if (paging.afterId === undefined) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        afterId: String(paging.afterId),
        sort,
      });
      if (paging.after !== undefined && paging.after !== null) {
        query.set("after", String(paging.after));
      }
      if (category !== "ALL") query.set("category", category);
      const res = await fetch(`/api/games?${query.toString()}`);
      const nextPage: GamesPage = await res.json();
      setGames((prev) => [...prev, ...nextPage.data]);
      if (nextPage.data.length > 0) setPaging(nextPage.paging);
      if (nextPage.data.length < PAGE_SIZE) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {!done && (
        <div className="flex justify-center mt-9 mb-3">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
