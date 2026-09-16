require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const { refreshVideoGuidesForGame } = require("../api/v1/services/gamesService");

// Each category is one YouTube search at 100 quota units, against a 10,000/day
// free budget. The daily game budget therefore falls out of how many
// categories are requested — 4 categories -> 24 games, 3 -> 33 — with a
// 100-unit margin left for a retried call.
const ALL_CATEGORIES = ["REVIEW", "BEFORE_YOU_BUY", "GAMEPLAY", "NEW_PLAYER_GUIDE"];
const UNITS_PER_SEARCH = 100;
const DAILY_QUOTA = 10000;
const QUOTA_MARGIN = 100;

const readArg = (name) => {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : undefined;
};

const categoriesArg = readArg("categories");
const categories = categoriesArg ? categoriesArg.split(",").map((c) => c.trim()) : ALL_CATEGORIES;

const unknown = categories.filter((category) => !ALL_CATEGORIES.includes(category));
if (unknown.length) {
  console.error(`Unknown categories: ${unknown.join(", ")}. Valid: ${ALL_CATEGORIES.join(", ")}`);
  process.exit(1);
}

const unitsPerGame = categories.length * UNITS_PER_SEARCH;
const defaultBudget = Math.floor((DAILY_QUOTA - QUOTA_MARGIN) / unitsPerGame);
const limitArg = readArg("limit");
const maxGames = limitArg ? Number(limitArg) : defaultBudget;

// --fill-gaps: instead of only games with zero guides, target every game
// missing any requested category, and search just the categories it lacks.
// Budgeted by quota units rather than game count, since per-game cost varies.
const fillGaps = process.argv.includes("--fill-gaps");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fillCategoryGaps() {
  const games = await prisma.game.findMany({
    select: { id: true, name: true, videoGuides: { select: { category: true } } },
    orderBy: { id: "asc" },
  });

  const plan = games
    .map((game) => {
      const present = new Set(game.videoGuides.map((guide) => guide.category));
      return { ...game, missing: categories.filter((category) => !present.has(category)) };
    })
    .filter((game) => game.missing.length > 0);

  const budget = DAILY_QUOTA - QUOTA_MARGIN;
  let plannedUnits = 0;
  const batch = [];
  for (const game of plan) {
    const cost = game.missing.length * UNITS_PER_SEARCH;
    if (plannedUnits + cost > budget) break;
    plannedUnits += cost;
    batch.push(game);
  }

  console.log(
    `Filling gaps for ${batch.length} of ${plan.length} games (~${plannedUnits} of the ${DAILY_QUOTA} daily quota units)`,
  );

  let succeeded = 0;
  let failed = 0;
  for (const game of batch) {
    try {
      await refreshVideoGuidesForGame(game.id, game.missing);
      succeeded++;
      console.log(`✔ ${game.name} -> filled ${game.missing.join(", ")}`);
    } catch (e) {
      failed++;
      console.error(`✘ ${game.name} -> ${e.message}`);
    }
    await sleep(500);
  }

  console.log(`Done. Succeeded: ${succeeded}, failed: ${failed}. ${plan.length - succeeded} games still have gaps.`);
  await prisma.$disconnect();
}

async function main() {
  if (fillGaps) return fillCategoryGaps();

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
      `(~${games.length * unitsPerGame} of the ${DAILY_QUOTA} daily quota units)\n` +
      `Categories: ${categories.join(", ")}`,
  );

  let succeeded = 0;
  let failed = 0;

  for (const game of games) {
    try {
      const videos = await refreshVideoGuidesForGame(game.id, categories);
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
    `Done. Succeeded: ${succeeded}, failed: ${failed}. ${stillRemaining} games still need video guides.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
