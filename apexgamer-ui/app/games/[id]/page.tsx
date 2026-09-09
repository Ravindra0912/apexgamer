import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchGameById, fetchVideoGuides } from "@/lib/api";
import { stripBBCode } from "@/lib/utils";
import VideoGuides from "@/components/VideoGuides";

export default async function GameDetailsPage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = await fetchGameById(Number(id));

  if (!game) notFound();

  const videoGuides = await fetchVideoGuides(game.id).catch(() => []);

  return (
    <>
      <div className="px-8 pt-3">
        <Link href="/" className="text-sm text-text-dim transition-colors hover:text-text">
          &larr; Back to games
        </Link>
      </div>

      <div className="relative mt-3 h-[380px] w-full overflow-hidden">
        {game.backgroundImage && (
          <Image
            src={game.backgroundImage}
            alt={game.name ?? "Game"}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-bg/0 via-bg/40 to-bg" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[1120px] px-8 pb-7">
          <h1 className="mb-2.5 text-[2.4rem] font-extrabold tracking-tight">
            {game.name ?? "Untitled"}
          </h1>
          <div className="flex flex-wrap items-center gap-4.5 text-sm text-text-dim">
            {game.ratingMetacritic != null && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-bold text-metacritic">
                ★ {game.ratingMetacritic}
              </span>
            )}
            {game.ratingRawg != null && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-bold text-[#ffb400]">
                ★ {game.ratingRawg}
              </span>
            )}
            {game.releaseDate && <span>Released {game.releaseDate}</span>}
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1120px] grid-cols-1 gap-8 px-8 py-8 md:grid-cols-[2fr_1fr]">
        <div>
          {game.tags.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3.5 text-[1.1rem] font-bold">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-accent-soft px-3 py-1 text-[0.76rem] font-semibold text-accent-text"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {(game.pros.length > 0 || game.cons.length > 0) && (
            <section className="mb-8">
              <h2 className="mb-3.5 text-[1.1rem] font-bold">Pros &amp; Cons</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-good">Pros</h3>
                  <ul className="list-disc space-y-1.5 pl-4.5 text-sm leading-relaxed text-text-dim">
                    {game.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-bad">Cons</h3>
                  <ul className="list-disc space-y-1.5 pl-4.5 text-sm leading-relaxed text-text-dim">
                    {game.cons.map((con, i) => (
                      <li key={i}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {game.screenshots.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3.5 text-[1.1rem] font-bold">Screenshots</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {game.screenshots.map((shot) =>
                  shot.image ? (
                    <div key={shot.id} className="relative aspect-video overflow-hidden rounded-[10px] border border-border">
                      <Image src={shot.image} alt="" fill sizes="33vw" className="object-cover" />
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          <VideoGuides gameId={game.id} initialVideos={videoGuides} />

          {game.reviews.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3.5 text-[1.1rem] font-bold">Reviews</h2>
              {game.reviews.map((review) => (
                <div key={review.id} className="mb-2.5 rounded-xl border border-border bg-surface px-4 py-3.5">
                  <div className="mb-1.5 flex justify-between text-xs text-text-dim">
                    {review.votesUp != null && (
                      <span className="font-bold text-good">👍 {review.votesUp} helpful</span>
                    )}
                    {review.recommendationId && <span>Recommended</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-text line-clamp-6">
                    {stripBBCode(review.reviewText)}
                  </p>
                </div>
              ))}
            </section>
          )}
        </div>

        <div>
          <section>
            <h2 className="mb-3.5 text-[1.1rem] font-bold">Details</h2>
            <div className="rounded-xl border border-border bg-surface p-4.5">
              {game.steamId != null && <DetailRow label="Steam ID" value={String(game.steamId)} />}
              {game.ratingMetacritic != null && (
                <DetailRow label="Metacritic" value={String(game.ratingMetacritic)} />
              )}
              {game.ratingRawg != null && <DetailRow label="RAWG Rating" value={`${game.ratingRawg} / 5`} />}
              {game.releaseDate && <DetailRow label="Release Date" value={game.releaseDate} last />}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2.5 text-sm ${last ? "" : "border-b border-border"}`}>
      <span className="text-text-dim">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
