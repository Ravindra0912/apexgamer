require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const gamesRepository = require("../api/v1/repositories/gamesRepository");
const { refreshReviewCommentsForGame } = require("../api/v1/services/gamesService");

// Fetches top comments on each game's review videos, keeps only genuine
// opinions of the game, and stores them with a per-game summary.
//
// Costs per game: 1 YouTube quota unit per review video (usually 3) and two
// Gemini calls (classify + summarize). The Gemini client paces itself to the
// free tier's per-minute limit, so a full catalog run takes a while.
//
// YouTube API data may only be kept ~30 days before being refreshed, so by
// default this picks up games never processed or last refreshed 30+ days ago —
// re-running it periodically is the refresh mechanism.
//
//   --limit=N          process at most N games
//   --stale-days=N     treat data older than N days as stale (default 30)
//   --game-ids=1,2,3   process exactly these games, regardless of staleness

const readArg = (name) => {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : undefined;
};

const DEFAULT_STALE_DAYS = 30;

// Failures are safe (nothing is written, so the game is retried next run), but
// a spent daily quota fails every remaining game identically — and each Gemini
// failure burns ~36s in retries first. Several in a row means stop, not push on.
const MAX_CONSECUTIVE_FAILURES = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

async function selectGames() {
  const gameIdsArg = readArg("game-ids");
  if (gameIdsArg) {
    const ids = gameIdsArg.split(",").map(Number).filter(Number.isInteger);
    return prisma.game.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  }

  const staleDays = Number(readArg("stale-days") ?? DEFAULT_STALE_DAYS);
  const limitArg = readArg("limit");
  return gamesRepository.findGamesNeedingCommentRefresh({
    staleBefore: new Date(Date.now() - staleDays * DAY_MS),
    limit: limitArg ? Number(limitArg) : undefined,
  });
}

async function main() {
  const games = await selectGames();
  console.log(`Refreshing review comments for ${games.length} games...`);

  let summarized = 0;
  let belowThreshold = 0;
  let unreleased = 0;
  let skipped = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  for (const game of games) {
    try {
      const result = await refreshReviewCommentsForGame(game.id);
      consecutiveFailures = 0;
      if (!result) {
        skipped++;
        console.log(`- ${game.name} -> no review videos`);
        continue;
      }

      if (result.unreleased) {
        unreleased++;
        console.log(`○ ${game.name} -> not released yet, nothing shown`);
        continue;
      }

      const funnel = `${result.fetched} fetched -> ${result.candidates} after rules -> ${result.opinions} opinions`;
      if (result.summary) {
        summarized++;
        const { sentiment, stanceCounts } = result.summary;
        console.log(
          `✔ ${game.name} -> ${funnel} | ${sentiment} ` +
            `(+${stanceCounts.positive} / -${stanceCounts.negative} / ~${stanceCounts.mixed})`,
        );
      } else {
        belowThreshold++;
        console.log(`○ ${game.name} -> ${funnel} | too few opinions, nothing shown`);
      }
    } catch (e) {
      failed++;
      consecutiveFailures++;
      const reason = e?.response?.data?.error?.errors?.[0]?.reason;
      console.error(`✘ ${game.name} -> ${reason || e.message || e.code || e.name}`);
      // A spent YouTube quota fails every remaining game identically, so stop
      // rather than burn through the list logging the same error.
      if (reason === "quotaExceeded") {
        console.error("YouTube quota exhausted — stopping. Re-run after the daily reset.");
        break;
      }
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`${MAX_CONSECUTIVE_FAILURES} failures in a row — stopping. Likely a spent daily quota; re-run later to resume.`);
        break;
      }
    }
  }

  console.log(
    `Done. ${summarized} summarized, ${belowThreshold} below threshold, ` +
      `${unreleased} unreleased, ${skipped} without review videos, ${failed} failed.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
