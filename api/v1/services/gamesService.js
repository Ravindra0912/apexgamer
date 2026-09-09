const { getSummaryResponse, getTextSummary } = require("../clients/geminiClient");
const { getRawgData } = require("../clients/rawgClient");
const {
  fetchSteamReviews,
  fetchSteamSpyAppDetails,
  fetchSteamSpyTop100InTwoWeeks,
  searchSteamStore,
} = require("../clients/steamClient");
const {
  findIgdbGameIdsBySteamIds,
  getPopularityTypes,
  getPopularityPrimitives,
  EXTERNAL_GAME_SOURCE_STEAM,
} = require("../clients/igdbClient");
const { searchVideos } = require("../clients/youtubeClient");
const gamesRepository = require("../repositories/gamesRepository");
const { formatSearchResults, getIdFromSteamUrl, classifyGameCategory } = require("../helpers/index");

const RAWG_STEAM_STORE_ID = 1;

const getSearchResults = async (searchString) => {
  const data = await getRawgData("games", { search: searchString });
  return formatSearchResults(data?.data?.results);
};

// RAWG hasn't linked every game to its Steam store page yet — this is common
// for newly-added catalog entries, not a lookup bug (confirmed by checking
// RAWG's own /stores response directly: it comes back an empty array, not a
// missing Steam entry). Falls back to Steam's own store search by name, but
// only accepts an exact case-insensitive title match — a fuzzy match risks
// attaching a different edition's (or a different game's) reviews to this
// row, which is worse than just having no review data.
const findSteamIdByName = async (name) => {
  if (!name) return null;
  try {
    const response = await searchSteamStore(name);
    const exactMatch = response?.data?.items?.find(
      (item) => item?.name?.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    return exactMatch?.id ?? null;
  } catch {
    return null;
  }
};

const getSteamId = async (id, name) => {
  const response = await getRawgData(`games/${id}/stores`);
  const steamUrl = response?.data?.results?.find(
    (storeItem) => storeItem.store_id === RAWG_STEAM_STORE_ID,
  )?.url;
  if (steamUrl) {
    return getIdFromSteamUrl(steamUrl);
  }
  return findSteamIdByName(name);
};

const getGamesWithSummarizedReviews = async (games) => {
  const reviewSummaryPromises = games.map(async (gameItem) => {
    try {
      console.log("summarizing reviews for", gameItem?.name);
      const reviewArray = gameItem.reviews.map((item) => item.reviewText);
      const summary = await getSummaryResponse(reviewArray);
      console.log("summarizing complete for", gameItem?.name);
      return { ...gameItem, reviewSummary: summary };
    } catch (e) {
      console.error("Failed to summarize reviews for", gameItem?.name, "Error:", e.message);
      return { ...gameItem, reviewSummary: [] };
    }
  });
  return Promise.all(reviewSummaryPromises);
};

const getFormattedResults = (results, popularGames) => {
  return results?.map((item, index) => {
    const currentGame = popularGames[index];
    const reviewsData = currentGame?.reviews;
    let reviews = [];
    if (reviewsData?.length) {
      reviews = reviewsData.map((reviewItem) => ({
        reviewText: reviewItem?.review,
        votesUp: reviewItem?.votes_up,
        recommendationId: reviewItem?.recommendationid,
      }));
    }
    return {
      rId: currentGame?.id,
      steamId: item?.steamId ? Number(item.steamId) : null,
      name: currentGame?.name,
      backgroundImage: currentGame?.background_image,
      dominantColor: currentGame?.dominant_color,
      releaseDate: currentGame?.released,
      ratingMetacritic: currentGame?.metacritic ?? null,
      ratingRawg: currentGame?.rating ?? null,
      addedCount: currentGame?.added ?? null,
      steamOwnersLabel: item?.steamOwnersLabel ?? null,
      steamPublisher: item?.steamPublisher ?? null,
      category: classifyGameCategory({
        genres: currentGame?.genres,
        steamPublisher: item?.steamPublisher,
      }),
      reviews,
      screenshots: (currentGame?.short_screenshots || []).map((screenshot) => ({
        remoteId: screenshot?.id,
        image: screenshot?.image,
      })),
      tags: (currentGame?.tags || []).map((tag) => ({
        id: tag?.id,
        name: tag?.name,
        slug: tag?.slug,
        language: tag?.language,
        gamesCount: tag?.games_count,
        imageBackground: tag?.image_background,
      })),
    };
  });
};

// RAWG caps page_size at 40 regardless of what's requested, and a fixed
// ordering returns the same ranked list on every call — so getting past the
// same ~40 games requires walking `page`, not raising page_size.
const RAWG_MAX_PAGE_SIZE = 40;
const MAX_PAGES_TO_SCAN = 25;

// Dedupes against the DB per-page, before any enrichment, so re-running
// ingestion doesn't burn Steam/SteamSpy/Gemini calls on games we already have.
// `rawgParams` lets callers pick which RAWG ranking/window to walk (all-time
// "-added" popularity vs. a recent-releases date window), sharing the same
// paging + dedup behavior either way.
const getNewGamesFromRawg = async (count, rawgParams) => {
  const collected = [];
  let page = 1;

  while (collected.length < count && page <= MAX_PAGES_TO_SCAN) {
    const response = await getRawgData("games", {
      ...rawgParams,
      page_size: RAWG_MAX_PAGE_SIZE,
      page,
    });
    const pageResults = response?.data?.results || [];
    if (!pageResults.length) break;

    const existingRIds = new Set(
      await gamesRepository.findExistingRIds(pageResults.map((game) => game.id)),
    );
    const newOnPage = pageResults.filter((game) => !existingRIds.has(game.id));

    collected.push(...newOnPage.slice(0, count - collected.length));
    page++;
  }

  return collected;
};

// Steam reviews + SteamSpy publisher/owners lookup, then the shared formatting
// step — the part of the pipeline that's identical regardless of which RAWG
// ranking supplied the candidate games.
const enrichAndFormatGames = async (rawgGames) => {
  if (!rawgGames.length) return [];

  const promises = rawgGames.map(async (rawgGame) => {
    const steamId = await getSteamId(rawgGame?.id, rawgGame?.name);
    let steamOwnersLabel = null;
    let steamPublisher = null;
    if (steamId) {
      const [reviewResponse, steamSpyResponse] = await Promise.all([
        fetchSteamReviews(steamId),
        fetchSteamSpyAppDetails(steamId).catch(() => null),
      ]);
      rawgGame.reviews = reviewResponse.data.reviews;
      steamOwnersLabel = steamSpyResponse?.data?.owners ?? null;
      steamPublisher = steamSpyResponse?.data?.publisher ?? null;
    }
    return { steamId, steamOwnersLabel, steamPublisher };
  });
  return Promise.all(promises)
    .then((results) => getFormattedResults(results, rawgGames))
    .catch((e) => { console.log(e); });
};

const getCurrentPopularGames = async (count) => {
  const popularGames = await getNewGamesFromRawg(count, { discover: true, ordering: "-added" });
  return enrichAndFormatGames(popularGames);
};

// Recent releases ranked by "-added" *within* the date window, rather than
// raw "-released" — a plain release-date sort surfaces obscure/zero-interest
// releases (asset flips, visual novels nobody added) ahead of anything
// notable. Filtering by date first, then ranking by add-count within that
// window, keeps results both recent and worth having.
const getRecentGames = async (count, sinceDate) => {
  const today = new Date().toISOString().slice(0, 10);
  const recentGames = await getNewGamesFromRawg(count, {
    dates: `${sinceDate},${today}`,
    ordering: "-added",
  });
  return enrichAndFormatGames(recentGames);
};

const normalize = (valuesById) => {
  const max = Math.max(0, ...Object.values(valuesById));
  if (max <= 0) return {};
  return Object.fromEntries(
    Object.entries(valuesById).map(([id, value]) => [id, value / max]),
  );
};

const getSteamTrendingSignals = async () => {
  const response = await fetchSteamSpyTop100InTwoWeeks();
  const apps = Object.values(response?.data || {});
  const ccuBySteamId = {};
  const ownersBySteamId = {};
  apps.forEach((app) => {
    if (app?.appid) {
      ccuBySteamId[app.appid] = app.ccu ?? 0;
      ownersBySteamId[app.appid] = app.owners ?? null;
    }
  });
  return { ccuBySteamId, ownersBySteamId };
};

const getIgdbTrendingSignals = async (steamIds) => {
  if (!steamIds.length) return {};
  try {
    const externalGames = await findIgdbGameIdsBySteamIds(steamIds);
    const igdbIdBySteamId = {};
    externalGames.forEach((externalGame) => {
      if (externalGame?.uid && externalGame?.game) {
        igdbIdBySteamId[Number(externalGame.uid)] = externalGame.game;
      }
    });
    const igdbIds = Object.values(igdbIdBySteamId);
    if (!igdbIds.length) return {};

    const popularityTypes = await getPopularityTypes();
    const steamSourcedTypes = popularityTypes.filter(
      (type) => type?.external_popularity_source === EXTERNAL_GAME_SOURCE_STEAM,
    );
    const peakPlayersType = steamSourcedTypes.find((type) => type?.name === "24hr Peak Players");
    const typeId = peakPlayersType?.id ?? steamSourcedTypes[0]?.id;
    if (!typeId) return {};

    const primitives = await getPopularityPrimitives(igdbIds, typeId);
    const valueByIgdbId = Object.fromEntries(primitives.map((p) => [p.game_id, p.value]));

    return Object.fromEntries(
      Object.entries(igdbIdBySteamId)
        .filter(([, igdbId]) => valueByIgdbId[igdbId] !== undefined)
        .map(([steamId, igdbId]) => [steamId, valueByIgdbId[igdbId]]),
    );
  } catch (e) {
    console.error("Failed to fetch IGDB popularity signals:", e.message);
    return {};
  }
};

const refreshTrendingScores = async () => {
  const gamesWithSteamId = await gamesRepository.findGamesWithSteamId();
  const steamIds = gamesWithSteamId.map((game) => game.steamId);
  if (!steamIds.length) return;

  const { ccuBySteamId, ownersBySteamId } = await getSteamTrendingSignals();
  const igdbPopularityBySteamId = await getIgdbTrendingSignals(steamIds);

  const normalizedCcu = normalize(ccuBySteamId);
  const normalizedIgdb = normalize(igdbPopularityBySteamId);

  const updates = gamesWithSteamId
    .map((game) => {
      const signals = [normalizedCcu[game.steamId], normalizedIgdb[game.steamId]].filter(
        (value) => value !== undefined,
      );
      if (!signals.length) return null;

      const trendingScore = signals.reduce((sum, value) => sum + value, 0) / signals.length;
      return {
        id: game.id,
        steamCcu: ccuBySteamId[game.steamId] ?? null,
        steamOwnersLabel: ownersBySteamId[game.steamId] ?? game.steamOwnersLabel,
        igdbPopularity: igdbPopularityBySteamId[game.steamId] ?? null,
        trendingScore,
      };
    })
    .filter(Boolean);

  await gamesRepository.updateTrendingData(updates);
};

const processGamesSequentially = async (games, delayMs = 5000) => {
  for (const gamesBatch of games) {
    try {
      const gamesWithSummary = await getGamesWithSummarizedReviews(gamesBatch);
      const gameIds = gamesWithSummary.map((game) => game.rId);
      const existingGameIds = new Set(await gamesRepository.findExistingRIds(gameIds));
      const newGames = gamesWithSummary
        .filter((game) => !existingGameIds.has(game.rId))
        .map((game) => ({
          ...game,
          pros: game.reviewSummary?.pros || [],
          cons: game.reviewSummary?.cons || [],
        }));
      if (newGames.length > 0) {
        await gamesRepository.createGames(newGames);
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error("Error processing game batch:", error);
      throw error;
    }
  }
};

const saveGamesSequentially = async (games) => {
  const gamesArray = Array.from({ length: games.length }, (_, i) => games.slice(i, i + 1));
  await processGamesSequentially(gamesArray, 5000);
};

const fetchAndSaveLatestGames = async (count = 10) => {
  const games = await getCurrentPopularGames(count);
  await saveGamesSequentially(games);
};

// sinceDate defaults to the start of the current year, not "1 year back" —
// `added` is cumulative, so a rolling window spanning two years lets the
// older year's games (which have had more months to accumulate adds)
// systematically outrank the newer year's, crowding it out of the results
// entirely even though that's not the intent of "recent". Confirmed live:
// a 1-year-back window put 25/40 top-ranked results in the prior year vs.
// 15/40 in the current one.
const fetchAndSaveRecentGames = async (count = 10, sinceDate) => {
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const games = await getRecentGames(count, sinceDate || startOfYear);
  await saveGamesSequentially(games);
};

const VIDEO_SEARCH_QUERIES = [
  { category: "REVIEW", suffix: "review" },
  { category: "BEFORE_YOU_BUY", suffix: "before you buy" },
  { category: "GAMEPLAY", suffix: "gameplay" },
  { category: "NEW_PLAYER_GUIDE", suffix: "new player guide" },
];
const VIDEOS_PER_CATEGORY = 3;

const SUMMARY_PROMPT =
  "Write a one-sentence summary of what this video likely covers, based only on its title and description. Do not invent details not implied by them.";

// Summarizes from the video's title/description metadata only — never a
// transcript, so this never reproduces a creator's spoken content.
const summarizeVideo = async (video) => {
  try {
    const content = `Title: ${video.title}\nDescription: ${video.description || ""}`;
    return await getTextSummary(content, SUMMARY_PROMPT);
  } catch (e) {
    console.error("Failed to summarize video", video.title, "Error:", e.message);
    return null;
  }
};

// Searches YouTube for review / before-you-buy videos for a game, dedupes
// against what's already stored (youtubeId is unique across the whole
// table), summarizes only the new ones, and persists. Kept separate from any
// GET so page views never silently spend YouTube quota.
const refreshVideoGuidesForGame = async (gameId) => {
  const game = await gamesRepository.findGameById(gameId);
  if (!game?.name) return [];

  const candidates = [];
  for (const { category, suffix } of VIDEO_SEARCH_QUERIES) {
    const response = await searchVideos(`${game.name} ${suffix}`, VIDEOS_PER_CATEGORY);
    (response?.data?.items || []).forEach((item) => {
      if (!item?.id?.videoId) return;
      candidates.push({
        category,
        youtubeId: item.id.videoId,
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        channelName: item.snippet?.channelTitle || null,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
      });
    });
  }
  if (!candidates.length) return gamesRepository.findVideoGuidesByGameId(gameId);

  // The same video can rank for more than one query (e.g. a review also
  // surfacing under "gameplay") — dedupe within this batch first, keeping
  // whichever category found it first, or createMany fails atomically on the
  // unique constraint and the whole game's results (plus the quota/Gemini
  // calls already spent on it) are lost.
  const seenYoutubeIds = new Set();
  const uniqueCandidates = candidates.filter((video) => {
    if (seenYoutubeIds.has(video.youtubeId)) return false;
    seenYoutubeIds.add(video.youtubeId);
    return true;
  });

  const existingIds = new Set(
    await gamesRepository.findExistingYoutubeIds(uniqueCandidates.map((video) => video.youtubeId)),
  );
  const newCandidates = uniqueCandidates.filter((video) => !existingIds.has(video.youtubeId));
  if (!newCandidates.length) return gamesRepository.findVideoGuidesByGameId(gameId);

  const videosToCreate = [];
  for (const candidate of newCandidates) {
    const aiSummary = await summarizeVideo(candidate);
    videosToCreate.push({
      category: candidate.category,
      youtubeId: candidate.youtubeId,
      title: candidate.title,
      channelName: candidate.channelName,
      thumbnail: candidate.thumbnail,
      publishedAt: candidate.publishedAt,
      aiSummary,
    });
  }

  return gamesRepository.createVideoGuides(gameId, videosToCreate);
};

module.exports = {
  getSearchResults,
  getSteamId,
  fetchAndSaveLatestGames,
  fetchAndSaveRecentGames,
  refreshTrendingScores,
  refreshVideoGuidesForGame,
};
