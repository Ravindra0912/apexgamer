require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const { refreshVideoGuidesForGame } = require("../api/v1/services/gamesService");

// 4 categories x 100 quota units/search = 400 units/game against YouTube's
// 10,000/day free budget -> 25 games/day. Defaulting to 24 to leave a little
// headroom for a retried call.
const UNITS_PER_GAME = 400;
const DEFAULT_DAILY_BUDGET = 24;

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const maxGames = limitArg ? Number(limitArg.split("=")[1]) : DEFAULT_DAILY_BUDGET;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // Games with zero video guides — already-processed games are naturally
  // skipped, so re-running this script tomorrow picks up where it left off.
  const games = await prisma.game.findMany({
    where: { videoGuides: { none: {} } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
    take: maxGames,
  });

  const totalRemaining = await prisma.game.count({ where: { videoGuides: { none: {} } } });
  console.log(
    `Processing ${games.length} of ${totalRemaining} games without video guides ` +
      `(~${games.length * UNITS_PER_GAME} of the 10,000 daily quota units)...`,
  );

  let succeeded = 0;
  let failed = 0;

  for (const game of games) {
    try {
      const videos = await refreshVideoGuidesForGame(game.id);
      succeeded++;
      console.log(`✔ ${game.name} -> ${videos.length} videos`);
    } catch (e) {
      failed++;
      console.error(`✘ ${game.name} -> ${e.message}`);
    }
    await sleep(500);
  }

  const stillRemaining = totalRemaining - succeeded;
  console.log(
    `Done. Succeeded: ${succeeded}, failed: ${failed}. ${stillRemaining} games still need video guides ` +
      `— re-run this script (tomorrow, once quota resets) to continue.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
