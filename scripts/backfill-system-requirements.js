require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const gamesRepository = require("../api/v1/repositories/gamesRepository");
const { refreshSystemRequirementsForGame } = require("../api/v1/services/gamesService");

// Steam's storefront API is unofficial and rate limited at roughly 200 requests
// per 5 minutes. Each game here costs one appdetails call (plus a RAWG call,
// which is not the constraint), so ~1.5s between games keeps us well under it.
const DELAY_MS = 1500;

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const maxGames = limitArg ? Number(limitArg.split("=")[1]) : undefined;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const totalRemaining = await gamesRepository.countGamesNeedingRequirements();
  const games = await gamesRepository.findGamesNeedingRequirements(maxGames ?? totalRemaining);

  console.log(`Processing ${games.length} of ${totalRemaining} games without requirements data...`);

  let withRequirements = 0;
  let platformsOnly = 0;
  let empty = 0;
  let failed = 0;

  for (const game of games) {
    try {
      const updated = await refreshSystemRequirementsForGame(game.id);
      const platformCount = updated?.platforms?.length ?? 0;
      const osCount = updated?.systemRequirements
        ? Object.keys(updated.systemRequirements).length
        : 0;

      if (osCount > 0) withRequirements++;
      else if (platformCount > 0) platformsOnly++;
      else empty++;

      console.log(
        `✔ ${game.name} -> ${platformCount} platforms, requirements for ${osCount} OS`,
      );
    } catch (e) {
      failed++;
      console.error(`✘ ${game.name} -> ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `Done. ${withRequirements} with requirements, ${platformsOnly} platforms only, ` +
      `${empty} with neither, ${failed} failed.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
