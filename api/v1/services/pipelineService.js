const { getRawgData } = require("../clients/rawgClient");
const { fetchSteamReviews } = require("../clients/steamClient");
const { getSummaryResponse } = require("../clients/geminiClient");
const {
  fetchVideoDetails,
  getQuotaUnitsUsed,
  isQuotaExceeded,
  QUOTA_COST,
} = require("../clients/youtubeClient");
const pipelineRepository = require("../repositories/pipelineRepository");
const {
  getNewGamesFromRawg,
  ingestGame,
  refreshVideoGuidesForGame,
  refreshReviewCommentsForGame,
  refreshTrendingScores,
  backfillVideoSummaries,
} = require("./gamesService");
const { getPlatformNames, decodeEntities } = require("../helpers/index");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);
const isoDate = (date) => date.toISOString().slice(0, 10);

const ALL_VIDEO_CATEGORIES = ["REVIEW", "BEFORE_YOU_BUY", "GAMEPLAY", "NEW_PLAYER_GUIDE"];

// Several failures in a row almost always mean something shared is down (a
// spent Gemini quota, an unreachable API) rather than bad luck per game, and
// each Gemini failure costs ~36s of retries first — so a stage stops early.
const MAX_CONSECUTIVE_FAILURES = 3;

// Thrown when YouTube reports the daily quota spent, so the orchestrator can
// skip the remaining YouTube stages while still running the others.
class QuotaExhaustedError extends Error {
  constructor() {
    super("YouTube daily quota exhausted");
    this.name = "QuotaExhaustedError";
  }
}

const describeError = (error) =>
  error?.response?.data?.error?.errors?.[0]?.reason || error?.message || error?.code || error?.name;

// Runs `work` for each item with per-item isolation: one failure is logged and
// counted, never fatal. A spent YouTube quota is re-thrown as fatal to the
// stage; so is a run of consecutive failures.
const forEachIsolated = async (items, label, stats, work) => {
  let consecutiveFailures = 0;
  for (const item of items) {
    try {
      const shouldStop = await work(item);
      consecutiveFailures = 0;
      if (shouldStop === false) break;
    } catch (error) {
      if (isQuotaExceeded(error)) throw new QuotaExhaustedError();
      stats.failed = (stats.failed || 0) + 1;
      consecutiveFailures++;
      console.error(`  ✘ ${label(item)} -> ${describeError(error)}`);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        stats.stoppedAfterConsecutiveFailures = true;
        console.error(`  ${MAX_CONSECUTIVE_FAILURES} failures in a row — stopping this stage.`);
        break;
      }
    }
  }
};

// ---- 1. Discover and ingest new games ---------------------------------------

// Mostly this year's releases (ranked by player adds within the year, so they
// are both recent and notable), plus a few all-time popular games not yet in
// the catalog. RAWG candidates are already filtered to unseen rIds.
const discoverNewGames = async ({ recentCount, popularCount }) => {
  const today = isoDate(new Date());
  const startOfYear = `${new Date().getFullYear()}-01-01`;

  const recent = recentCount
    ? await getNewGamesFromRawg(recentCount, { dates: `${startOfYear},${today}`, ordering: "-added" })
    : [];
  const popular = popularCount
    ? await getNewGamesFromRawg(popularCount, { discover: true, ordering: "-added" })
    : [];

  const seenRIds = new Set();
  const candidates = [...recent, ...popular].filter((game) => {
    if (seenRIds.has(game.id)) return false;
    seenRIds.add(game.id);
    return true;
  });

  const stats = { candidates: candidates.length, added: 0, duplicates: 0, summaryPending: 0, addedNames: [] };
  const claimedSteamIds = new Set();

  await forEachIsolated(candidates, (game) => game.name, stats, async (rawgGame) => {
    const result = await ingestGame(rawgGame, claimedSteamIds);
    if (result.status === "duplicate") {
      stats.duplicates++;
      console.log(`  = ${rawgGame.name} -> duplicate of an existing game (steamId ${result.steamId})`);
      return;
    }
    stats.added++;
    stats.addedNames.push(result.game.name);
    if (!result.summarized) stats.summaryPending++;
    console.log(`  + ${result.game.name}${result.summarized ? "" : " (pros/cons queued for retry)"}`);
  });

  return stats;
};

// ---- 2. Refresh RAWG metadata -----------------------------------------------

// A rotating slice of the least recently synced games: ratings, popularity and
// release dates drift, and a placeholder release date gets corrected once RAWG
// marks the game tba. Tags are only filled in for games that have none yet
// (typically ingested on launch day, before RAWG tagged them); existing tags
// and screenshots are left as ingested.
const refreshRawgMetadata = async ({ limit }) => {
  const games = await pipelineRepository.findGamesDueRawgRefresh({ limit });
  const stats = { checked: 0, updated: 0, notFound: 0, releaseDatesCleared: 0, tagsFilled: 0 };

  await forEachIsolated(games, (game) => game.name, stats, async (game) => {
    stats.checked++;
    let rawgGame;
    try {
      rawgGame = (await getRawgData(`games/${game.rId}`)).data;
    } catch (error) {
      if (error?.response?.status === 404) {
        // Removed from RAWG. Keep the row, but don't re-check it every day.
        stats.notFound++;
        await pipelineRepository.updateRawgMetadata(game.id, {});
        return;
      }
      throw error;
    }

    const releaseDate = rawgGame.tba ? null : rawgGame.released ?? null;
    if (releaseDate === null && rawgGame.tba) stats.releaseDatesCleared++;

    await pipelineRepository.updateRawgMetadata(game.id, {
      name: rawgGame.name ?? undefined,
      backgroundImage: rawgGame.background_image ?? undefined,
      dominantColor: rawgGame.dominant_color ?? undefined,
      releaseDate,
      ratingMetacritic: rawgGame.metacritic ?? null,
      ratingRawg: rawgGame.rating ?? null,
      addedCount: rawgGame.added ?? null,
      platforms: getPlatformNames(rawgGame),
    });

    if (game._count.tags === 0 && rawgGame.tags?.length) {
      await pipelineRepository.addTagsToUntaggedGame(
        game.id,
        rawgGame.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          language: tag.language,
          gamesCount: tag.games_count,
          imageBackground: tag.image_background,
        })),
      );
      stats.tagsFilled++;
    }
    stats.updated++;
  });

  return stats;
};

// ---- 3. Refresh Steam reviews and AI pros/cons ------------------------------

const refreshSteamReviews = async ({ staleDays, limit }) => {
  const games = await pipelineRepository.findGamesDueSteamReviewRefresh({
    staleBefore: daysAgo(staleDays),
    limit,
  });
  const stats = { checked: 0, updated: 0, noReviews: 0 };

  await forEachIsolated(games, (game) => game.name, stats, async (game) => {
    stats.checked++;
    const response = await fetchSteamReviews(game.steamId);
    const reviews = (response?.data?.reviews || [])
      .map((review) => ({
        reviewText: review?.review,
        votesUp: review?.votes_up,
        recommendationId: review?.recommendationid,
      }))
      .filter((review) => review.reviewText);

    // An empty response shouldn't wipe reviews the game already has.
    if (!reviews.length) {
      stats.noReviews++;
      await pipelineRepository.stampSteamReviewsSynced(game.id);
      return;
    }

    // Throws on failure, which leaves the game unstamped for the next run
    // rather than replacing good pros/cons with nothing.
    const { pros, cons } = await getSummaryResponse(reviews.map((review) => review.reviewText));
    await pipelineRepository.replaceSteamReviews(game.id, { reviews, pros, cons });
    stats.updated++;
  });

  return stats;
};

// ---- 4. Refresh stored video metadata ---------------------------------------

// YouTube API data may only be kept ~30 days unrefreshed. videos.list costs 1
// unit per 50 ids, so the whole catalog refreshes for a few dozen units.
// Videos YouTube no longer returns (deleted or made private) are removed,
// since they can't be refreshed and shouldn't be linked to.
const VIDEO_DETAILS_BATCH = 50;

const refreshVideoMetadata = async ({ staleDays, limit, unitBudget }) => {
  const guides = await pipelineRepository.findStaleVideoGuides({ staleBefore: daysAgo(staleDays), limit });
  const stats = { checked: 0, updated: 0, removed: 0 };
  const startUnits = getQuotaUnitsUsed();

  const batches = [];
  for (let i = 0; i < guides.length; i += VIDEO_DETAILS_BATCH) {
    batches.push(guides.slice(i, i + VIDEO_DETAILS_BATCH));
  }

  await forEachIsolated(batches, (batch) => `batch of ${batch.length}`, stats, async (batch) => {
    if (getQuotaUnitsUsed() - startUnits + QUOTA_COST.videos > unitBudget) {
      stats.stoppedAtBudget = true;
      return false;
    }

    const response = await fetchVideoDetails(batch.map((guide) => guide.youtubeId));
    const items = response?.data?.items;
    if (!Array.isArray(items)) throw new Error("videos.list returned no items array");

    const snippetById = new Map(items.map((item) => [item.id, item.snippet || {}]));
    const updates = [];
    const missing = [];
    for (const guide of batch) {
      const snippet = snippetById.get(guide.youtubeId);
      if (!snippet) {
        missing.push(guide.id);
        continue;
      }
      updates.push({
        id: guide.id,
        title: decodeEntities(snippet.title || ""),
        channelName: snippet.channelTitle ? decodeEntities(snippet.channelTitle) : null,
        thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null,
      });
    }

    // A full batch coming back completely empty is far likelier to be an API
    // hiccup than every video vanishing at once, so nothing is deleted then.
    const suspiciousEmpty = items.length === 0 && batch.length > 5;
    await pipelineRepository.updateVideoGuideMetadata(updates);
    if (!suspiciousEmpty) {
      await pipelineRepository.deleteVideoGuides(missing);
      stats.removed += missing.length;
    }
    stats.checked += batch.length;
    stats.updated += updates.length;
  });

  stats.unitsUsed = getQuotaUnitsUsed() - startUnits;
  return stats;
};

// ---- 5. Fill missing video guide categories ---------------------------------

// Each missing category is one 100-unit search. Games are visited newest
// first, and a game is only started if the remaining budget covers all of its
// missing categories, so it's never left half-searched. A game that doesn't
// fit is skipped rather than ending the stage: a new game needing 400 units
// shouldn't block older games that each need 100. Every attempt is stamped,
// so a category that genuinely has no videos isn't re-searched for
// `recheckDays`.
const fillVideoGuideGaps = async ({ recheckDays, unitBudget }) => {
  const games = await pipelineRepository.findGamesDueVideoGapCheck({ checkedBefore: daysAgo(recheckDays) });
  const plan = games
    .map((game) => {
      const present = new Set(game.videoGuides.map((guide) => guide.category));
      return { ...game, missing: ALL_VIDEO_CATEGORIES.filter((category) => !present.has(category)) };
    })
    .filter((game) => game.missing.length > 0);

  const stats = { gamesWithGaps: plan.length, filled: 0 };
  const startUnits = getQuotaUnitsUsed();

  await forEachIsolated(plan, (game) => game.name, stats, async (game) => {
    const spent = getQuotaUnitsUsed() - startUnits;
    // Not even a single search fits, so no later game can either.
    if (spent + QUOTA_COST.search > unitBudget) return false;
    if (spent + game.missing.length * QUOTA_COST.search > unitBudget) return;
    const videos = await refreshVideoGuidesForGame(game.id, game.missing);
    await pipelineRepository.stampVideoGuidesChecked(game.id);
    stats.filled++;
    console.log(`  ▶ ${game.name} -> searched ${game.missing.join(", ")} (${videos.length} videos now)`);
  });

  // Anything not filled (skipped for budget, or failed) stays unstamped and is
  // picked up by the next run.
  stats.stillPending = plan.length - stats.filled;
  stats.unitsUsed = getQuotaUnitsUsed() - startUnits;
  return stats;
};

// ---- 6. Repair missing video blurbs -----------------------------------------

const repairVideoBlurbs = async () => {
  const startUnits = getQuotaUnitsUsed();
  const result = await backfillVideoSummaries();
  return { ...result, unitsUsed: getQuotaUnitsUsed() - startUnits };
};

// ---- 7. Refresh review video comments ---------------------------------------

// New games (never refreshed) first, then the stalest. Cost is ~1 unit per
// review video. Unreleased games and thin opinion counts are handled inside
// refreshReviewCommentsForGame.
const refreshReviewComments = async ({ staleDays, recentStaleDays, recentReleaseDays, unitBudget }) => {
  const games = await pipelineRepository.findGamesDueCommentRefresh({
    staleBefore: daysAgo(staleDays),
    recentStaleBefore: daysAgo(recentStaleDays),
    recentReleaseSince: isoDate(daysAgo(recentReleaseDays)),
  });

  const stats = { due: games.length, summarized: 0, belowThreshold: 0, unreleased: 0 };
  const startUnits = getQuotaUnitsUsed();

  await forEachIsolated(games, (game) => game.name, stats, async (game) => {
    const cost = game._count.videoGuides * QUOTA_COST.commentThreads;
    if (getQuotaUnitsUsed() - startUnits + cost > unitBudget) return false;
    const result = await refreshReviewCommentsForGame(game.id);
    if (!result) return;
    if (result.unreleased) stats.unreleased++;
    else if (result.summary) stats.summarized++;
    else stats.belowThreshold++;
  });

  stats.stillPending = games.length - stats.summarized - stats.belowThreshold - stats.unreleased;
  stats.unitsUsed = getQuotaUnitsUsed() - startUnits;
  return stats;
};

// ---- 8. Trending scores -----------------------------------------------------

const updateTrendingScores = async () => {
  await refreshTrendingScores();
  return { refreshed: true };
};

module.exports = {
  QuotaExhaustedError,
  discoverNewGames,
  refreshRawgMetadata,
  refreshSteamReviews,
  refreshVideoMetadata,
  fillVideoGuideGaps,
  repairVideoBlurbs,
  refreshReviewComments,
  updateTrendingScores,
};
