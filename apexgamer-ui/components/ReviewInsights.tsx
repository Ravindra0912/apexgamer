"use client";

import { useState } from "react";
import { CommentStance, ReviewCommentSummary, VideoComment } from "@/lib/types";

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const SENTIMENT_STYLES: Record<ReviewCommentSummary["sentiment"], { label: string; className: string }> = {
  positive: { label: "Mostly positive", className: "border-good/40 bg-good/10 text-good" },
  negative: { label: "Mostly negative", className: "border-bad/40 bg-bad/10 text-bad" },
  mixed: { label: "Mixed", className: "border-border bg-surface-hover text-text-dim" },
};

const STANCE_STYLES: Record<CommentStance, { label: string; className: string }> = {
  POSITIVE: { label: "Positive", className: "text-good" },
  NEGATIVE: { label: "Negative", className: "text-bad" },
  MIXED: { label: "Mixed", className: "text-text-dim" },
};

// Framed as viewer opinion throughout, not as a verdict on the game: these are
// commenters on review videos, a self-selected audience that skews toward the
// reviewer's own take.
export function ReviewSummaryCard({ summary }: { summary: ReviewCommentSummary }) {
  const sentiment = SENTIMENT_STYLES[summary.sentiment];
  const { positive, negative, mixed } = summary.stanceCounts;

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold">What viewers are saying</h4>
        <span className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${sentiment.className}`}>
          {sentiment.label}
        </span>
      </div>

      <p className="mb-3.5 text-sm leading-relaxed">{summary.verdict}</p>

      {(summary.praised.length > 0 || summary.criticized.length > 0) && (
        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summary.praised.length > 0 && (
            <PointList title="Praised" points={summary.praised} className="text-good" />
          )}
          {summary.criticized.length > 0 && (
            <PointList title="Criticized" points={summary.criticized} className="text-bad" />
          )}
        </div>
      )}

      <p className="border-t border-border pt-2.5 text-[0.7rem] leading-relaxed text-text-dim">
        AI summary of {summary.opinionCount} viewer opinions from comments on {summary.videoCount} review{" "}
        {summary.videoCount === 1 ? "video" : "videos"} · {positive} positive · {negative} negative · {mixed} mixed
      </p>
    </div>
  );
}

function PointList({ title, points, className }: { title: string; points: string[]; className: string }) {
  return (
    <div>
      <h5 className={`mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide ${className}`}>{title}</h5>
      <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-text-dim">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

// A video can carry 80+ filtered comments, so the list opens with the best few
// and grows in steps instead of dumping everything at once.
const INITIAL_COMMENTS = 3;
const COMMENTS_PER_STEP = 10;

// Collapsed by default so the video grid stays scannable. Comments arrive
// already ranked (specificity, then likes). Text is rendered as a plain text
// node — never as HTML — since it's third-party input.
export function TopComments({ youtubeId, comments }: { youtubeId: string; comments: VideoComment[] }) {
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENTS);
  if (!comments.length) return null;

  const toggle = () => {
    setOpen((value) => !value);
    // Re-opening starts from the top few again rather than a long expanded list.
    setVisibleCount(INITIAL_COMMENTS);
  };

  const visible = comments.slice(0, visibleCount);
  const remaining = comments.length - visible.length;

  return (
    <div className="border-t border-border px-3 pb-3 pt-2">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="text-xs font-semibold text-text-dim transition-colors hover:text-text"
      >
        {open ? "Hide" : "Viewer"} comments ({comments.length}) {open ? "▴" : "▾"}
      </button>

      {open && (
        <>
        <ul className="mt-2.5 space-y-2.5">
          {visible.map((comment) => {
            const stance = STANCE_STYLES[comment.stance];
            return (
              <li key={comment.id} className="rounded-lg bg-surface-hover px-3 py-2.5">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.7rem]">
                  {comment.authorChannelUrl ? (
                    <a
                      href={comment.authorChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-text hover:underline"
                    >
                      {comment.authorName ?? "YouTube viewer"}
                    </a>
                  ) : (
                    <span className="font-semibold text-text">{comment.authorName ?? "YouTube viewer"}</span>
                  )}
                  <span className={`font-semibold ${stance.className}`}>{stance.label}</span>
                  <span className="text-text-dim">👍 {compactNumber.format(comment.likeCount)}</span>
                </div>
                <p className="mb-1 line-clamp-4 whitespace-pre-line text-xs leading-relaxed">{comment.text}</p>
                <a
                  href={`https://www.youtube.com/watch?v=${youtubeId}&lc=${comment.youtubeCommentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.7rem] text-text-dim hover:text-text hover:underline"
                >
                  View on YouTube
                </a>
              </li>
            );
          })}
        </ul>
        {remaining > 0 && (
          <button
            onClick={() => setVisibleCount((count) => count + COMMENTS_PER_STEP)}
            className="mt-2.5 w-full rounded-lg border border-border py-1.5 text-xs font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          >
            Show {Math.min(COMMENTS_PER_STEP, remaining)} more ({remaining} remaining)
          </button>
        )}
        </>
      )}
    </div>
  );
}
