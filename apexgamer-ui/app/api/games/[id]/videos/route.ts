import { NextResponse } from "next/server";
import { fetchVideoGuides, refreshVideoGuides } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const videos = await fetchVideoGuides(Number(id));
    return NextResponse.json({ data: videos });
  } catch {
    return NextResponse.json({ error: "Failed to fetch video guides" }, { status: 502 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const videos = await refreshVideoGuides(Number(id));
    return NextResponse.json({ data: videos });
  } catch {
    return NextResponse.json({ error: "Failed to refresh video guides" }, { status: 502 });
  }
}
