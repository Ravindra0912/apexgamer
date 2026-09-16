import Image from "next/image";
import Link from "next/link";
import { Game } from "@/lib/types";
import { initials, summarizePlatforms } from "@/lib/utils";

const MAX_PLATFORM_CHIPS = 4;

export default function GameCard({ game }: { game: Game }) {
  const platforms = summarizePlatforms(game.platforms ?? []);
  const shownPlatforms = platforms.slice(0, MAX_PLATFORM_CHIPS);
  const hiddenPlatformCount = platforms.length - shownPlatforms.length;

  return (
    <Link
      href={`/games/${game.id}`}
      className="block rounded-[14px] overflow-hidden border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-[#3a4256] hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] group"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-surface">
        {game.backgroundImage ? (
          <Image
            src={game.backgroundImage}
            alt={game.name ?? "Game"}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-white/35"
            style={{ background: game.dominantColor ? `#${game.dominantColor.replace("#", "")}` : "#2a1216" }}
          >
            {initials(game.name)}
          </div>
        )}
        {game.ratingMetacritic != null && (
          <div className="absolute top-2.5 right-2.5 rounded-md bg-bg/85 backdrop-blur-sm px-2 py-0.5 text-xs font-bold text-metacritic">
            ★ {game.ratingMetacritic}
          </div>
        )}
      </div>
      <div className="px-4 pt-3.5 pb-4">
        <h3 className="mb-1.5 truncate text-[0.98rem] font-semibold">{game.name ?? "Untitled"}</h3>
        <div className="mb-2.5 flex items-center justify-between text-xs text-text-dim">
          {/* A null date means RAWG marks the game "to be announced". */}
          <span>{game.releaseDate ?? "TBA"}</span>
          {game.ratingRawg != null && <span>RAWG {game.ratingRawg}</span>}
        </div>
        {shownPlatforms.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5" title={game.platforms?.join(", ")}>
            {shownPlatforms.map((platform) => (
              <span
                key={platform}
                className="rounded border border-border px-1.5 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wide text-text-dim"
              >
                {platform}
              </span>
            ))}
            {hiddenPlatformCount > 0 && (
              <span className="px-0.5 py-0.5 text-[0.66rem] font-semibold text-text-dim">
                +{hiddenPlatformCount}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {game.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.7rem] font-semibold text-accent-text"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
