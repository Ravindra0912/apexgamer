"use client";

import Image from "next/image";
import { useState } from "react";
import { VideoGuide, VideoGuideCategory } from "@/lib/types";

const CATEGORY_ORDER: VideoGuideCategory[] = ["BEFORE_YOU_BUY", "REVIEW", "NEW_PLAYER_GUIDE", "GAMEPLAY"];

const CATEGORY_LABELS: Record<VideoGuideCategory, string> = {
  BEFORE_YOU_BUY: "Before You Buy",
  REVIEW: "Reviews",
  NEW_PLAYER_GUIDE: "New Player Guide",
  GAMEPLAY: "Gameplay",
};

export default function VideoGuides({
  gameId,
  initialVideos,
}: {
  gameId: number;
  initialVideos: VideoGuide[];
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/videos`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setVideos(data);
    } catch {
      setError("Couldn't fetch videos right now.");
    } finally {
      setLoading(false);
    }
  }

  const grouped: Record<VideoGuideCategory, VideoGuide[]> = {
    BEFORE_YOU_BUY: videos.filter((v) => v.category === "BEFORE_YOU_BUY"),
    REVIEW: videos.filter((v) => v.category === "REVIEW"),
    NEW_PLAYER_GUIDE: videos.filter((v) => v.category === "NEW_PLAYER_GUIDE"),
    GAMEPLAY: videos.filter((v) => v.category === "GAMEPLAY"),
  };

  return (
    <section className="mb-8">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[1.1rem] font-bold">Video Guides</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
        >
          {loading ? "Searching…" : videos.length ? "Refresh" : "Find videos"}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      {videos.length === 0 && !loading && !error && (
        <p className="text-sm text-text-dim">No video guides yet — click &ldquo;Find videos&rdquo; to search YouTube.</p>
      )}

      {CATEGORY_ORDER.map((category) =>
        grouped[category].length > 0 ? (
          <div key={category} className="mb-5 last:mb-0">
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-text-dim">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grouped[category].map((video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover"
                >
                  {video.thumbnail && (
                    <Image
                      src={video.thumbnail}
                      alt=""
                      width={120}
                      height={68}
                      className="h-[68px] w-[120px] shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p>
                    {video.channelName && (
                      <p className="mb-1 text-xs text-text-dim">{video.channelName}</p>
                    )}
                    {video.aiSummary && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-text-dim">{video.aiSummary}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </section>
  );
}
