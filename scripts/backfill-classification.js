require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const { getRawgData } = require("../api/v1/clients/rawgClient");
const { fetchSteamSpyAppDetails } = require("../api/v1/clients/steamClient");
const { classifyGameCategory } = require("../api/v1/helpers/index");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Backfills the fields the sort/filter experience depends on (addedCount for the
// "popular" sort, steamPublisher/steamOwnersLabel + category for the AAA/indie
// filter) onto rows ingested before those fields existed.
async function main() {
  const onlyMissing = !process.argv.includes("--all");
  const games = await prisma.game.findMany({
    where: onlyMissing ? { OR: [{ addedCount: null }, { category: "UNCLASSIFIED" }] } : {},
    select: { id: true, rId: true, steamId: true, name: true },
    orderBy: { id: "asc" },
  });

  console.log(`Backfilling classification for ${games.length} games...`);
  const counts = { AAA: 0, INDIE: 0, UNCLASSIFIED: 0, failed: 0 };

  for (const game of games) {
    try {
      const rawgDetails = await getRawgData(`games/${game.rId}`);

      let steamPublisher = null;
      let steamOwnersLabel = null;
      if (game.steamId) {
        const steamSpy = await fetchSteamSpyAppDetails(game.steamId).catch(() => null);
        steamPublisher = steamSpy?.data?.publisher || null;
        steamOwnersLabel = steamSpy?.data?.owners || null;
      }

      const category = classifyGameCategory({
        genres: rawgDetails?.data?.genres,
        steamPublisher,
      });

      await prisma.game.update({
        where: { id: game.id },
        data: {
          addedCount: rawgDetails?.data?.added ?? null,
          steamPublisher,
          steamOwnersLabel: steamOwnersLabel ?? undefined,
          category,
        },
      });

      counts[category]++;
      console.log(
        `✔ ${game.name} -> ${category} (added ${rawgDetails?.data?.added ?? "?"}, publisher: ${steamPublisher ?? "n/a"})`,
      );
    } catch (e) {
      counts.failed++;
      console.error(`✘ ${game.name} -> ${e.message}`);
    }
    await sleep(300);
  }

  console.log(
    `Done. AAA: ${counts.AAA}, INDIE: ${counts.INDIE}, UNCLASSIFIED: ${counts.UNCLASSIFIED}, failed: ${counts.failed}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
