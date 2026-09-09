require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const { getSteamId } = require("../api/v1/services/gamesService");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const games = await prisma.game.findMany({
    where: { steamId: null },
    select: { id: true, rId: true, name: true },
  });
  console.log(`Backfilling steamId for ${games.length} games...`);

  let updated = 0;
  let noSteamRelease = 0;

  for (const game of games) {
    try {
      const steamId = await getSteamId(game.rId, game.name);
      if (steamId) {
        await prisma.game.update({
          where: { id: game.id },
          data: { steamId: Number(steamId) },
        });
        updated++;
        console.log(`✔ ${game.name} -> steamId ${steamId}`);
      } else {
        noSteamRelease++;
        console.log(`- ${game.name} -> no Steam release`);
      }
    } catch (e) {
      console.error(`✘ ${game.name} -> error: ${e.message}`);
    }
    await sleep(250);
  }

  console.log(`Done. Updated: ${updated}, no Steam release: ${noSteamRelease}, total: ${games.length}`);
  await prisma.$disconnect();
}

main();
