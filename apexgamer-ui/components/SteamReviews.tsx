"use client";

import { useId, useState } from "react";
import { Review } from "@/lib/types";
import { stripBBCode } from "@/lib/utils";

// Raw Steam reviews run ~44 per game, which buried everything below them, so
// the section starts collapsed. The AI pros/cons above already summarize them.
//
// There's deliberately no "Recommended" label: the old one keyed off
// recommendationId, which is Steam's id for the review itself and is present
// on every review — so it showed "Recommended" on all 5,741, negative ones
// included. Steam's actual thumbs up/down (voted_up) isn't stored yet.
export default function SteamReviews({ reviews }: { reviews: Review[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  if (!reviews.length) return null;

  return (
    <section className="mb-8">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover"
      >
        <span>
          <span className="text-[1.1rem] font-bold">Steam Reviews</span>
          <span className="ml-2 text-sm text-text-dim">{reviews.length} reviews</span>
        </span>
        <span className="text-sm font-semibold text-text-dim">{open ? "Hide ▴" : "Show ▾"}</span>
      </button>

      {open && (
        <div id={listId} className="mt-2.5">
          {reviews.map((review) => (
            <div key={review.id} className="mb-2.5 rounded-xl border border-border bg-surface px-4 py-3.5">
              {review.votesUp != null && (
                <div className="mb-1.5 text-xs">
                  <span className="font-bold text-good">👍 {review.votesUp} helpful</span>
                </div>
              )}
              <p className="line-clamp-6 text-sm leading-relaxed text-text">{stripBBCode(review.reviewText)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
