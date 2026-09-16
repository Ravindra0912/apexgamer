const prisma = require("../../../config/prismaClient");

// Queries that let each daily-pipeline stage find its own work from database
// state (null / stale timestamps) rather than relying on earlier stages having
// run. Oldest-or-never-done work is always ordered first.

// ---- Video guides -----------------------------------------------------------

// Newest games first, so a game added today gets its videos before older
// backlog. Categories are compared in the service.
const findGamesDueVideoGapCheck = async ({ checkedBefore }) => {
  return prisma.game.findMany({
    where: {
      OR: [{ videoGuidesCheckedAt: null }, { videoGuidesCheckedAt: { lt: checkedBefore } }],
    },
    select: { id: true, name: true, videoGuides: { select: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
};

const stampVideoGuidesChecked = async (gameId) => {
  await prisma.game.update({ where: { id: gameId }, data: { videoGuidesCheckedAt: new Date() } });
};

const findStaleVideoGuides = async ({ staleBefore, limit }) => {
  return prisma.videoGuide.findMany({
    where: { OR: [{ metadataRefreshedAt: null }, { metadataRefreshedAt: { lt: staleBefore } }] },
    select: { id: true, youtubeId: true },
    orderBy: { metadataRefreshedAt: { sort: "asc", nulls: "first" } },
    take: limit,
  });
};

const updateVideoGuideMetadata = async (updates) => {
  if (!updates.length) return;
  await prisma.$transaction(
    updates.map(({ id, ...data }) =>
      prisma.videoGuide.update({ where: { id }, data: { ...data, metadataRefreshedAt: new Date() } }),
    ),
  );
};

// Comments cascade with the guide.
const deleteVideoGuides = async (ids) => {
  if (!ids.length) return;
  await prisma.videoGuide.deleteMany({ where: { id: { in: ids } } });
};

// ---- Review comments --------------------------------------------------------

// Stale after `staleBefore`, or sooner (`recentStaleBefore`) for games released
// since `recentReleaseSince` — opinions on a new release move quickly. Release
// dates are "YYYY-MM-DD" strings, so string comparison orders them correctly.
const findGamesDueCommentRefresh = async ({ staleBefore, recentStaleBefore, recentReleaseSince }) => {
  return prisma.game.findMany({
    where: {
      videoGuides: { some: { category: "REVIEW" } },
      OR: [
        { reviewCommentsUpdatedAt: null },
        { reviewCommentsUpdatedAt: { lt: staleBefore } },
        {
          AND: [
            { releaseDate: { gte: recentReleaseSince } },
            { reviewCommentsUpdatedAt: { lt: recentStaleBefore } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      _count: { select: { videoGuides: { where: { category: "REVIEW" } } } },
    },
    orderBy: { reviewCommentsUpdatedAt: { sort: "asc", nulls: "first" } },
  });
};

// ---- RAWG metadata ----------------------------------------------------------

const findGamesDueRawgRefresh = async ({ limit }) => {
  return prisma.game.findMany({
    select: { id: true, rId: true, name: true, _count: { select: { tags: true } } },
    orderBy: { rawgSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
  });
};

// Brand-new releases often reach RAWG before they're tagged (Marvel's
// Wolverine had none the day after launch), so a game ingested with no tags
// picks them up on a later refresh. Existing tags are left alone.
const addTagsToUntaggedGame = async (gameId, tags) => {
  if (!tags.length) return;
  await prisma.game.update({
    where: { id: gameId },
    data: {
      tags: {
        create: tags.map((tag) => ({
          tag: { connectOrCreate: { where: { id: tag.id }, create: tag } },
        })),
      },
    },
  });
};

const updateRawgMetadata = async (gameId, data) => {
  await prisma.game.update({ where: { id: gameId }, data: { ...data, rawgSyncedAt: new Date() } });
};

// ---- Steam reviews ----------------------------------------------------------

const findGamesDueSteamReviewRefresh = async ({ staleBefore, limit }) => {
  return prisma.game.findMany({
    where: {
      steamId: { not: null },
      OR: [{ steamReviewsSyncedAt: null }, { steamReviewsSyncedAt: { lt: staleBefore } }],
    },
    select: { id: true, name: true, steamId: true },
    orderBy: { steamReviewsSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
  });
};

// Reviews and the pros/cons derived from them are swapped together, so the
// page never shows a summary of reviews it no longer has.
const replaceSteamReviews = async (gameId, { reviews, pros, cons }) => {
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { gameId } }),
    prisma.review.createMany({ data: reviews.map((review) => ({ ...review, gameId })) }),
    prisma.game.update({
      where: { id: gameId },
      data: { pros, cons, steamReviewsSyncedAt: new Date() },
    }),
  ]);
};

const stampSteamReviewsSynced = async (gameId) => {
  await prisma.game.update({ where: { id: gameId }, data: { steamReviewsSyncedAt: new Date() } });
};

// ---- Pipeline runs ----------------------------------------------------------

const findRunningPipelineRun = async ({ startedAfter }) => {
  return prisma.pipelineRun.findFirst({
    where: { status: "RUNNING", startedAt: { gt: startedAfter } },
    orderBy: { startedAt: "desc" },
  });
};

const createPipelineRun = async () => prisma.pipelineRun.create({ data: {} });

const finishPipelineRun = async (id, { status, stats, youtubeUnitsUsed }) => {
  await prisma.pipelineRun.update({
    where: { id },
    data: { status, stats, youtubeUnitsUsed, finishedAt: new Date() },
  });
};

module.exports = {
  findGamesDueVideoGapCheck,
  stampVideoGuidesChecked,
  findStaleVideoGuides,
  updateVideoGuideMetadata,
  deleteVideoGuides,
  findGamesDueCommentRefresh,
  findGamesDueRawgRefresh,
  updateRawgMetadata,
  addTagsToUntaggedGame,
  findGamesDueSteamReviewRefresh,
  replaceSteamReviews,
  stampSteamReviewsSynced,
  findRunningPipelineRun,
  createPipelineRun,
  finishPipelineRun,
};
