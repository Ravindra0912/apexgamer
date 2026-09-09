require("dotenv").config({ quiet: true });
const prisma = require("../config/prismaClient");
const { getRawgData } = require("../api/v1/clients/rawgClient");
const { fetchSteamReviews } = require("../api/v1/clients/steamClient");
const { getSummaryResponse } = require("../api/v1/clients/geminiClient");
const gamesRepository = require("../api/v1/repositories/gamesRepository");

const rId = Number(process.argv[2]);
if (!rId) {
  console.error("Usage: node scripts/backfill-game-content.js <rId>");
  process.exit(1);
}

async function main() {
  const game = await prisma.game.findUnique({ where: { rId } });
  if (!game) {
    console.error(`No game found with rId ${rId}`);
    process.exit(1);
  }
  if (!game.steamId) {
    console.error(`Game "${game.name}" has no steamId — cannot fetch Steam reviews`);
    process.exit(1);
  }

  console.log(`Backfilling content for "${game.name}" (id ${game.id}, steamId ${game.steamId})...`);

  const [rawgDetails, rawgScreenshots, reviewResponse] = await Promise.all([
    getRawgData(`games/${rId}`),
    getRawgData(`games/${rId}/screenshots`),
    fetchSteamReviews(game.steamId),
  ]);

  const steamReviews = reviewResponse?.data?.reviews || [];
  const reviews = steamReviews.map((reviewItem) => ({
    reviewText: reviewItem?.review,
    votesUp: reviewItem?.votes_up,
    recommendationId: reviewItem?.recommendationid,
  }));

  let pros = [];
  let cons = [];
  if (reviews.length) {
    try {
      const summary = await getSummaryResponse(reviews.map((r) => r.reviewText));
      pros = summary.pros;
      cons = summary.cons;
    } catch (e) {
      // Still worth persisting the reviews/screenshots/tags we already fetched.
      console.error(`Summary failed, continuing without pros/cons: ${e.message}`);
    }
  }

  const screenshots = (rawgScreenshots?.data?.results || []).map((screenshot) => ({
    remoteId: screenshot?.id,
    image: screenshot?.image,
  }));

  const tags = (rawgDetails?.data?.tags || []).map((tag) => ({
    id: tag?.id,
    name: tag?.name,
    slug: tag?.slug,
    language: tag?.language,
    gamesCount: tag?.games_count,
    imageBackground: tag?.image_background,
  }));

  await gamesRepository.backfillGameContent(game.id, { pros, cons, reviews, screenshots, tags });

  console.log(
    `Done. reviews: ${reviews.length}, pros: ${pros.length}, cons: ${cons.length}, screenshots: ${screenshots.length}, tags: ${tags.length}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
