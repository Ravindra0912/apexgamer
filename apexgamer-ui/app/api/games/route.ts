import { NextRequest, NextResponse } from "next/server";
import { fetchGames } from "@/lib/api";
import { GameCategory, GameSort } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || undefined;
  const after = searchParams.get("after") ?? undefined;
  const afterIdRaw = searchParams.get("afterId");
  const afterId = afterIdRaw ? Number(afterIdRaw) : undefined;
  const sort = (searchParams.get("sort") as GameSort | null) ?? undefined;
  const category = (searchParams.get("category") as GameCategory | null) ?? undefined;

  try {
    const page = await fetchGames({ limit, after, afterId, sort, category });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 502 });
  }
}
