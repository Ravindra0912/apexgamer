"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";

type Shot = { id: number; image: string };

// Horizontal travel (px) before a touch drag counts as a swipe rather than a tap.
const SWIPE_THRESHOLD = 50;

export default function ScreenshotGallery({
  screenshots,
  gameName,
}: {
  screenshots: Shot[];
  gameName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  const count = screenshots.length;
  const isOpen = index !== null;

  // The native <dialog> in modal mode supplies the hard parts for free: focus is
  // trapped inside, Escape closes it, it renders above the sticky header, and
  // focus returns to the thumbnail that opened it. It doesn't stop the page
  // behind from scrolling, so that's locked here while it's open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();

    if (!isOpen) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Keep the current slide's thumbnail visible in the strip as you navigate.
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index]);

  const wrap = (value: number) => ((value % count) + count) % count;
  const show = (target: number) => setIndex(wrap(target));
  // Stepping uses the updater form so rapid presses (or a held arrow key)
  // each advance one slide — reading `index` from the render would make two
  // presses before a re-render land on the same slide.
  const step = (delta: number) => setIndex((current) => (current === null ? current : wrap(current + delta)));
  const previous = () => step(-1);
  const nextSlide = () => step(1);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nextSlide();
    }
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX > 0) previous();
    else nextSlide();
  };

  const current = index !== null ? screenshots[index] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {screenshots.map((shot, i) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Open screenshot ${i + 1} of ${count}`}
            className="group/shot relative aspect-video cursor-zoom-in overflow-hidden rounded-[10px] border border-border focus-visible:outline-2 focus-visible:outline-accent-text"
          >
            <Image
              src={shot.image}
              alt=""
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover/shot:scale-105"
            />
            <span className="absolute inset-0 bg-black/0 transition-colors group-hover/shot:bg-black/20" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${gameName} screenshots`}
        onClose={() => setIndex(null)}
        onKeyDown={onKeyDown}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-text backdrop:bg-black/90"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-sm text-text-dim">
                <span className="font-semibold text-text">{gameName}</span>
                <span aria-live="polite">
                  {" "}
                  · {index! + 1} / {count}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setIndex(null)}
                aria-label="Close screenshots"
                autoFocus
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-lg text-text transition-colors hover:bg-surface-hover"
              >
                ✕
              </button>
            </div>

            {/* Clicking the empty space around the image closes the viewer. */}
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
              onClick={(event) => event.target === event.currentTarget && setIndex(null)}
              onTouchStart={(event) => (touchStartX.current = event.touches[0].clientX)}
              onTouchEnd={onTouchEnd}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-text-dim">
                <Spinner className="h-6 w-6" />
              </div>
              <div className="relative h-full w-full max-w-[1600px]">
                <Image
                  key={current.id}
                  src={current.image}
                  alt={`${gameName} screenshot ${index! + 1} of ${count}`}
                  fill
                  sizes="100vw"
                  loading="eager"
                  className="object-contain"
                />
              </div>

              {count > 1 && (
                <>
                  <NavButton direction="previous" onClick={previous} />
                  <NavButton direction="next" onClick={nextSlide} />
                </>
              )}
            </div>

            {count > 1 && (
              // Centered via mx-auto on a w-max row, not justify-center on the
              // scroller: flex centering pushes overflowing thumbnails past the
              // left edge, where they can no longer be scrolled into view.
              <div className="overflow-x-auto px-4 py-3">
                <div className="mx-auto flex w-max gap-2">
                  {screenshots.map((shot, i) => (
                    <button
                      key={shot.id}
                      ref={i === index ? activeThumbRef : undefined}
                      type="button"
                      onClick={() => show(i)}
                      aria-label={`Show screenshot ${i + 1}`}
                      aria-current={i === index}
                      className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-opacity sm:h-14 sm:w-24 ${
                        i === index ? "border-accent-text opacity-100" : "border-transparent opacity-50 hover:opacity-90"
                      }`}
                    >
                      <Image src={shot.image} alt="" fill sizes="96px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}

function NavButton({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrevious ? "Previous screenshot" : "Next screenshot"}
      className={`absolute top-1/2 -translate-y-1/2 ${
        isPrevious ? "left-2 sm:left-4" : "right-2 sm:right-4"
      } flex h-11 w-11 items-center justify-center rounded-full bg-surface/80 text-xl text-text transition-colors hover:bg-surface-hover`}
    >
      {isPrevious ? "‹" : "›"}
    </button>
  );
}
