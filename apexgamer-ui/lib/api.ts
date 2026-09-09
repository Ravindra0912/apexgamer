import { Game, GameCategory, GamesPage, GameSort, VideoGuide } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:7000";

export async function fetchGames(params?: {
  limit?: number;
  after?: string | number | null;
  afterId?: number;
  sort?: GameSort;
  category?: GameCategory;
}): Promise<GamesPage> {
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 24));
  if (params?.afterId !== undefined) query.set("afterId", String(params.afterId));
  // A null `after` is meaningful (the last row's sort value was null), so it is
  // sent as an absent param alongside afterId rather than the string "null".
  if (params?.after !== undefined && params?.after !== null) {
    query.set("after", String(params.after));
  }
  if (params?.sort) query.set("sort", params.sort);
  if (params?.category) query.set("category", params.category);

  const res = await fetch(`${API_URL}/games?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
  return res.json();
}

// No single-game endpoint on the backend yet, so we pull a large page and
// find the match. Fine while the dataset is small (dozens of rows).
export async function fetchGameById(id: number): Promise<Game | null> {
  const { data } = await fetchGames({ limit: 500 });
  return data.find((game) => game.id === id) ?? null;
}

export async function fetchVideoGuides(gameId: number): Promise<VideoGuide[]> {
  const res = await fetch(`${API_URL}/games/${gameId}/videos`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch video guides: ${res.status}`);
  const { data } = await res.json();
  return data;
}

// Separate from fetchVideoGuides so a page view never silently spends
// YouTube search quota — refreshing is an explicit user action.
export async function refreshVideoGuides(gameId: number): Promise<VideoGuide[]> {
  const res = await fetch(`${API_URL}/games/${gameId}/videos/refresh`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to refresh video guides: ${res.status}`);
  const { data } = await res.json();
  return data;
}
