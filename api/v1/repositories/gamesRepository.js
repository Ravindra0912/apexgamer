const prisma = require("../../../config/prismaClient");

const findExistingRIds = async (rIds) => {
  const existing = await prisma.game.findMany({
    where: { rId: { in: rIds } },
    select: { rId: true },
  });
  return existing.map((game) => game.rId);
};

const createGame = async (game) => {
  const {
    rId,
    steamId,
    name,
    backgroundImage,
    dominantColor,
    releaseDate,
    ratingMetacritic,
    ratingRawg,
    pros,
    cons,
    addedCount,
    steamOwnersLabel,
    steamPublisher,
    category,
    reviews,
    screenshots,
    tags,
    createdAt,
    updatedAt,
  } = game;

  return prisma.game.create({
    data: {
      rId,
      steamId,
      name,
      backgroundImage,
      dominantColor,
      releaseDate,
      ratingMetacritic,
      ratingRawg,
      pros,
      cons,
      addedCount,
      steamOwnersLabel,
      steamPublisher,
      category,
      createdAt,
      updatedAt,
      reviews: reviews?.length ? { create: reviews } : undefined,
      screenshots: screenshots?.length ? { create: screenshots } : undefined,
      tags: tags?.length
        ? {
            create: tags.map((tag) => ({
              tag: {
                connectOrCreate: {
                  where: { id: tag.id },
                  create: {
                    id: tag.id,
                    name: tag.name,
                    slug: tag.slug,
                    language: tag.language,
                    gamesCount: tag.gamesCount,
                    imageBackground: tag.imageBackground,
                  },
                },
              },
            })),
          }
        : undefined,
    },
  });
};

const backfillGameContent = async (gameId, { pros, cons, reviews, screenshots, tags }) => {
  return prisma.game.update({
    where: { id: gameId },
    data: {
      pros: pros || [],
      cons: cons || [],
      reviews: reviews?.length ? { create: reviews } : undefined,
      screenshots: screenshots?.length ? { create: screenshots } : undefined,
      tags: tags?.length
        ? {
            create: tags.map((tag) => ({
              tag: {
                connectOrCreate: {
                  where: { id: tag.id },
                  create: {
                    id: tag.id,
                    name: tag.name,
                    slug: tag.slug,
                    language: tag.language,
                    gamesCount: tag.gamesCount,
                    imageBackground: tag.imageBackground,
                  },
                },
              },
            })),
          }
        : undefined,
    },
  });
};

const createGames = async (games) => {
  const created = [];
  for (const game of games) {
    created.push(await createGame(game));
  }
  return created;
};

const SORT_FIELDS = {
  trending: "trendingScore",
  popular: "addedCount",
  newest: "releaseDate",
};

const SORT_ORDER_BY = {
  trending: [{ trendingScore: { sort: "desc", nulls: "last" } }, { id: "desc" }],
  popular: [{ addedCount: { sort: "desc", nulls: "last" } }, { id: "desc" }],
  newest: [{ releaseDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
};

const coerceCursorValue = (sortField, after) => {
  if (after === null || after === undefined || after === "") return null;
  return sortField === "releaseDate" ? String(after) : Number(after);
};

// Rows are ordered by <sortField> desc with nulls last, then id desc. To continue
// after (value, id) we take everything ordered strictly after that pair: lower
// values, the same value with a lower id, and — since nulls trail every non-null
// value — the whole null block. A null cursor value means we are already inside
// that null block, so only id decides.
const buildCursorFilter = (sortField, after, afterId) => {
  if (afterId === null || afterId === undefined) return {};
  const id = Number(afterId);
  const value = coerceCursorValue(sortField, after);

  if (value === null) {
    return { AND: [{ [sortField]: null }, { id: { lt: id } }] };
  }

  return {
    OR: [
      { [sortField]: { lt: value } },
      { AND: [{ [sortField]: value }, { id: { lt: id } }] },
      { [sortField]: null },
    ],
  };
};

const findGamesPaginated = async ({ limit, after, afterId, sort = "newest", category }) => {
  const sortKey = SORT_ORDER_BY[sort] ? sort : "newest";
  const sortField = SORT_FIELDS[sortKey];
  const cursorFilter = buildCursorFilter(sortField, after, afterId);

  const where = category ? { AND: [cursorFilter, { category }] } : cursorFilter;

  const games = await prisma.game.findMany({
    where,
    orderBy: SORT_ORDER_BY[sortKey],
    take: limit,
    include: { reviews: true, screenshots: true, tags: { include: { tag: true } } },
  });

  return games.map((game) => ({
    ...game,
    tags: game.tags.map((gameTag) => gameTag.tag),
  }));
};

const findGamesWithSteamId = async () => {
  return prisma.game.findMany({
    where: { steamId: { not: null } },
    select: { id: true, steamId: true, steamOwnersLabel: true },
  });
};

const updateTrendingData = async (updates) => {
  if (!updates.length) return;
  await prisma.$transaction(
    updates.map((update) =>
      prisma.game.update({
        where: { id: update.id },
        data: {
          steamCcu: update.steamCcu,
          steamOwnersLabel: update.steamOwnersLabel,
          igdbPopularity: update.igdbPopularity,
          trendingScore: update.trendingScore,
          popularityUpdatedAt: new Date(),
        },
      }),
    ),
  );
};

const deleteAllGames = async () => {
  await prisma.game.deleteMany({});
};

const findGameById = async (id) => {
  return prisma.game.findUnique({ where: { id } });
};

const findVideoGuidesByGameId = async (gameId) => {
  return prisma.videoGuide.findMany({
    where: { gameId },
    orderBy: [{ category: "asc" }, { publishedAt: "desc" }],
  });
};

const findExistingYoutubeIds = async (youtubeIds) => {
  const existing = await prisma.videoGuide.findMany({
    where: { youtubeId: { in: youtubeIds } },
    select: { youtubeId: true },
  });
  return existing.map((video) => video.youtubeId);
};

const createVideoGuides = async (gameId, videos) => {
  if (!videos.length) return [];
  await prisma.videoGuide.createMany({
    data: videos.map((video) => ({ ...video, gameId })),
  });
  return findVideoGuidesByGameId(gameId);
};

module.exports = {
  findExistingRIds,
  createGame,
  createGames,
  backfillGameContent,
  findGamesPaginated,
  findGamesWithSteamId,
  updateTrendingData,
  deleteAllGames,
  findGameById,
  findVideoGuidesByGameId,
  findExistingYoutubeIds,
  createVideoGuides,
  SORT_FIELDS,
};
