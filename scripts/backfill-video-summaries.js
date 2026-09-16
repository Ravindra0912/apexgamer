require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const { backfillVideoSummaries } = require("../api/v1/services/gamesService");

async function main() {
  const { total, updated, failed } = await backfillVideoSummaries();
  console.log(`Done. ${total} guides missing a summary, ${updated} updated, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
