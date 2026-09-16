// Pulls production (Neon) data down into the local database. Copying rather
// than re-running ingestion costs no YouTube/Gemini quota. Re-run after a
// production backfill to bring local back in line.
// Matches games on rId (the RAWG id), never on primary key — the two databases
// were populated independently, so their autoincrement ids need not line up.
require("dotenv").config({ quiet: true });
const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const NEON_URL = process.argv[2];
if (!NEON_URL) {
  console.error("Usage: node scripts/sync-from-production.js <neon-database-url>");
  process.exit(1);
}

const localPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const neonPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: NEON_URL }) });

async function main() {
  const [neonGames, localGames] = await Promise.all([
    neonPrisma.game.findMany({
      select: { id: true, rId: true, name: true, steamId: true, platforms: true, systemRequirements: true, requirementsUpdatedAt: true },
    }),
    localPrisma.game.findMany({ select: { id: true, rId: true } }),
  ]);

  const localIdByRId = new Map(localGames.map((g) => [g.rId, g.id]));
  const rIdByNeonId = new Map(neonGames.map((g) => [g.id, g.rId]));

  const missingLocally = neonGames.filter((g) => !localIdByRId.has(g.rId));
  console.log(`neon games: ${neonGames.length} | local games: ${localGames.length} | in neon but not local: ${missingLocally.length}`);
  missingLocally.slice(0, 10).forEach((g) => console.log(`   (skipped, not in local) ${g.name}`));

  let updated = 0;
  for (const game of neonGames) {
    const localId = localIdByRId.get(game.rId);
    if (!localId) continue;
    await localPrisma.game.update({
      where: { id: localId },
      data: {
        steamId: game.steamId ?? undefined,
        platforms: game.platforms || [],
        systemRequirements: game.systemRequirements ?? Prisma.DbNull,
        requirementsUpdatedAt: game.requirementsUpdatedAt,
      },
    });
    updated++;
  }
  console.log(`requirements/platforms synced onto ${updated} local games`);

  const [neonGuides, localYoutubeIds] = await Promise.all([
    neonPrisma.videoGuide.findMany(),
    localPrisma.videoGuide.findMany({ select: { youtubeId: true } }),
  ]);
  const have = new Set(localYoutubeIds.map((v) => v.youtubeId));

  const toCreate = [];
  let unmappable = 0;
  for (const guide of neonGuides) {
    if (have.has(guide.youtubeId)) continue;
    const localGameId = localIdByRId.get(rIdByNeonId.get(guide.gameId));
    if (!localGameId) { unmappable++; continue; }
    const { id, gameId, ...rest } = guide;
    toCreate.push({ ...rest, gameId: localGameId });
  }

  if (toCreate.length) {
    await localPrisma.videoGuide.createMany({ data: toCreate, skipDuplicates: true });
  }
  console.log(`video guides -> neon: ${neonGuides.length}, already local: ${have.size}, inserted: ${toCreate.length}, unmappable: ${unmappable}`);

  await Promise.all([localPrisma.$disconnect(), neonPrisma.$disconnect()]);
}

main().catch((e) => { console.error(e); process.exit(1); });
