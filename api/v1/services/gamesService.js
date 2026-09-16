const { getSummaryResponse, getTextSummary, getJsonCompletion } = require("../clients/geminiClient");
const { getRawgData } = require("../clients/rawgClient");
const {
  fetchSteamAppDetails,
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
const { searchVideos, fetchVideoDetails, fetchCommentThreads } = require("../clients/youtubeClient");
const gamesRepository = require("../repositories/gamesRepository");
const {
  formatSearchResults,
  getIdFromSteamUrl,
  classifyGameCategory,
  parseSteamRequirements,
  getPlatformNames,
  rejectCommentByRules,
} = require("../helpers/index");

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

// Steam's appdetails response is keyed by the appid it was asked for, and
// reports per-app failure via `success` rather than an HTTP error — an unknown
// or delisted appid comes back 200 with success:false.
const getSteamRequirements = async (steamId) => {
  if (!steamId) return null;
  try {
    const response = await fetchSteamAppDetails(steamId);
    const entry = response?.data?.[String(steamId)];
    if (!entry?.success) return null;
    return parseSteamRequirements(entry.data);
  } catch (e) {
    console.error("Failed to fetch Steam requirements for", steamId, "Error:", e.message);
    return null;
  }
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
      platforms: getPlatformNames(currentGame),
      systemRequirements: item?.systemRequirements ?? null,
      requirementsUpdatedAt: new Date(),
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
    let systemRequirements = null;
    if (steamId) {
      const [reviewResponse, steamSpyResponse, requirements] = await Promise.all([
        fetchSteamReviews(steamId),
        fetchSteamSpyAppDetails(steamId).catch(() => null),
        getSteamRequirements(steamId),
      ]);
      rawgGame.reviews = reviewResponse.data.reviews;
      steamOwnersLabel = steamSpyResponse?.data?.owners ?? null;
      steamPublisher = steamSpyResponse?.data?.publisher ?? null;
      systemRequirements = requirements;
    }
    return { steamId, steamOwnersLabel, steamPublisher, systemRequirements };
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
// `categories` narrows which searches run — each one costs 100 YouTube quota
// units, so dropping one is the lever for fitting more games into a day.
// Omitted means all four.
const refreshVideoGuidesForGame = async (gameId, categories) => {
  const game = await gamesRepository.findGameById(gameId);
  if (!game?.name) return [];

  const queries = categories?.length
    ? VIDEO_SEARCH_QUERIES.filter((query) => categories.includes(query.category))
    : VIDEO_SEARCH_QUERIES;

  const candidates = [];
  for (const { category, suffix } of queries) {
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

// Repairs guides whose summary generation failed at ingest (a Gemini hiccup
// leaves the video stored with a null aiSummary). Descriptions aren't
// persisted, so they're re-read via videos.list — 1 quota unit per batch of
// 50, versus the 100 a search would cost.
const YOUTUBE_DETAILS_BATCH = 50;

const backfillVideoSummaries = async () => {
  const guides = await gamesRepository.findVideoGuidesMissingSummary();
  if (!guides.length) return { total: 0, updated: 0, failed: 0 };

  const snippetById = new Map();
  for (let i = 0; i < guides.length; i += YOUTUBE_DETAILS_BATCH) {
    const batch = guides.slice(i, i + YOUTUBE_DETAILS_BATCH);
    const response = await fetchVideoDetails(batch.map((guide) => guide.youtubeId));
    (response?.data?.items || []).forEach((item) => {
      if (item?.id) snippetById.set(item.id, item.snippet || {});
    });
  }

  let updated = 0;
  let failed = 0;
  for (const guide of guides) {
    const snippet = snippetById.get(guide.youtubeId);
    // A video pulled or made private since ingest returns no snippet; fall
    // back to the stored title rather than skipping the row entirely.
    const summary = await summarizeVideo({
      title: snippet?.title || guide.title,
      description: snippet?.description || "",
    });
    if (summary) {
      await gamesRepository.updateVideoGuideSummary(guide.id, summary);
      updated++;
      console.log(`✔ ${guide.title.slice(0, 60)}`);
    } else {
      failed++;
      console.error(`✘ ${guide.title.slice(0, 60)}`);
    }
  }

  return { total: guides.length, updated, failed };
};

// ---- Review video comments ----------------------------------------------
// Pipeline per game: fetch top comments on its review videos -> cheap rules ->
// one Gemini classification call (keep only opinions of the game itself) ->
// one Gemini summary call -> store. Prompt and thresholds were validated on
// real review videos, including badly received games, before being wired in.

const COMMENTS_PER_VIDEO = 100;
const MAX_COMMENT_CHARS = 400;
const MAX_OPINIONS_IN_SUMMARY_PROMPT = 80;

// Measured: real reviews of released games kept 10–41 opinions per video,
// while trailers and pre-release hype videos kept 2–4. Below this, there is
// too little genuine opinion to summarize honestly, so nothing is shown.
const MIN_OPINIONS_FOR_SUMMARY = 10;

// Sentiment is derived from the stance counts rather than asked of the model,
// so the label is reproducible and can't drift from the numbers shown beside
// it. One side must clearly dominate; anything closer reads as mixed.
const DOMINANT_STANCE_SHARE = 0.65;

const STANCE_BY_CODE = { pos: "POSITIVE", neg: "NEGATIVE", mixed: "MIXED" };

const commentClassificationPrompt = (gameName) => `These are YouTube comments on videos about the game "${gameName}". Each is prefixed with [index].
Keep ONLY comments expressing the commenter's own opinion or first-hand experience of "${gameName}" ITSELF: gameplay, story, characters, combat, performance, bugs, price/value, or a comparison that states a view on "${gameName}".
Reject:
- jokes and memes;
- reactions to the reviewer, channel or video, INCLUDING corrections or fact-checks of what the video said (e.g. "that's wrong, in the first game X worked like Y") — these are about the review, not an opinion of the game;
- comments whose opinion is only about an earlier entry, a different game, the company or the industry — praise or criticism of a previous game in the series does NOT count as an opinion of "${gameName}";
- reactions to a claim made in the video by someone who has not played it (e.g. "50 hours in the first area?!", "can't wait");
- questions, and hype or anticipation with no substance.
Negative and critical opinions are exactly as valuable as positive ones — apply the same standard to both.
For each kept comment give stance ("pos"|"neg"|"mixed") and specificity: 1 = vague ("great game"), 2 = one concrete point, 3 = several concrete points or a reasoned argument.
Return compact JSON only: {"keep":[[index,"stance",specificity], ...]}`;

const commentSummaryPrompt = (gameName) => `Each line above is one YouTube viewer's opinion of the game "${gameName}", prefixed with its stance.
Summarize them for someone deciding whether to play the game.
- Paraphrase. Never quote a comment verbatim, and never mention individual commenters, reviewers or videos.
- These are viewer opinions, not established facts — word them that way.
- Reflect real disagreement where it exists; do not overstate consensus.
Return JSON only:
{"verdict":"<one sentence, at most 25 words, on overall viewer opinion of the game>","praised":["<short phrase>"],"criticized":["<short phrase>"]}
List at most 4 points on each side, most common first. Use an empty array for a side viewers didn't raise.`;

// Comments disabled or the video gone are per-video conditions: skip that
// video and carry on. Anything else (quotaExceeded, a bad key) would fail on
// every remaining call too, so it's rethrown to stop the run.
const SKIPPABLE_COMMENT_ERRORS = new Set(["commentsDisabled", "videoNotFound"]);

const fetchVideoComments = async (video) => {
  try {
    const response = await fetchCommentThreads(video.youtubeId, COMMENTS_PER_VIDEO);
    return (response?.data?.items || []).map((item) => {
      const top = item?.snippet?.topLevelComment;
      const snippet = top?.snippet || {};
      return {
        youtubeCommentId: top?.id || item?.id,
        videoGuideId: video.id,
        authorName: snippet.authorDisplayName || null,
        authorChannelUrl: snippet.authorChannelUrl || null,
        text: snippet.textOriginal || snippet.textDisplay || "",
        likeCount: snippet.likeCount ?? 0,
        replyCount: item?.snippet?.totalReplyCount ?? 0,
        publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
      };
    });
  } catch (e) {
    const reason = e?.response?.data?.error?.errors?.[0]?.reason;
    if (SKIPPABLE_COMMENT_ERRORS.has(reason) || e?.response?.status === 404) return [];
    throw e;
  }
};

// Gemini occasionally returns an empty reply for a large, perfectly normal
// batch: a full run kept 0 opinions from 273 Ghost of Yotei comments, then 12
// on a straight retry. One retry separates that from a genuine absence without
// failing forever on a game that really has no opinions.
const SUSPICIOUS_EMPTY_CLASSIFICATION = 50;

// The model answers with indices into the list it was shown, so every entry is
// checked against that list — an invented index, unknown stance or out-of-range
// specificity is dropped rather than trusted.
const requestClassification = async (gameName, candidates) => {
  const numbered = candidates
    .map((comment, index) => `[${index}] ${comment.text.replace(/\s+/g, " ").slice(0, MAX_COMMENT_CHARS)}`)
    .join("\n");

  const result = await getJsonCompletion(
    [
      { role: "user", content: numbered },
      { role: "user", content: commentClassificationPrompt(gameName) },
    ],
    { temperature: 0, maxTokens: 4096 },
  );

  const usedIndices = new Set();
  return (Array.isArray(result?.keep) ? result.keep : []).flatMap((entry) => {
    if (!Array.isArray(entry)) return [];
    const [index, stanceCode, rawSpecificity] = entry;
    const candidate = candidates[index];
    const stance = STANCE_BY_CODE[stanceCode];
    const specificity = Number(rawSpecificity);
    if (!candidate || !stance || ![1, 2, 3].includes(specificity) || usedIndices.has(index)) return [];
    usedIndices.add(index);
    return [{ ...candidate, stance, specificity }];
  });
};

const classifyComments = async (gameName, candidates) => {
  if (!candidates.length) return [];
  const opinions = await requestClassification(gameName, candidates);
  if (opinions.length || candidates.length < SUSPICIOUS_EMPTY_CLASSIFICATION) return opinions;
  return requestClassification(gameName, candidates);
};

const countStances = (opinions) => ({
  positive: opinions.filter((opinion) => opinion.stance === "POSITIVE").length,
  negative: opinions.filter((opinion) => opinion.stance === "NEGATIVE").length,
  mixed: opinions.filter((opinion) => opinion.stance === "MIXED").length,
});

const deriveSentiment = (stanceCounts, total) => {
  if (stanceCounts.positive / total >= DOMINANT_STANCE_SHARE) return "positive";
  if (stanceCounts.negative / total >= DOMINANT_STANCE_SHARE) return "negative";
  return "mixed";
};

const cleanPoints = (points) =>
  (Array.isArray(points) ? points : [])
    .filter((point) => typeof point === "string" && point.trim())
    .map((point) => point.trim())
    .slice(0, 4);

const requestSummary = (gameName, promptLines) =>
  getJsonCompletion(
    [
      { role: "user", content: promptLines },
      { role: "user", content: commentSummaryPrompt(gameName) },
    ],
    { temperature: 0.2, maxTokens: 1024 },
  );

const readVerdict = (result) => (typeof result?.verdict === "string" ? result.verdict.trim() : "");

const summarizeOpinions = async (gameName, opinions) => {
  if (opinions.length < MIN_OPINIONS_FOR_SUMMARY) return null;

  const promptLines = [...opinions]
    .sort((a, b) => b.specificity - a.specificity || b.likeCount - a.likeCount)
    .slice(0, MAX_OPINIONS_IN_SUMMARY_PROMPT)
    .map((opinion) => `(${opinion.stance.toLowerCase()}) ${opinion.text.replace(/\s+/g, " ").slice(0, MAX_COMMENT_CHARS)}`)
    .join("\n");

  // A reply missing its verdict is an occasional glitch (seen on 2 of 134
  // games, both fine on retry), so it gets one more attempt before failing.
  let result = await requestSummary(gameName, promptLines);
  if (!readVerdict(result)) result = await requestSummary(gameName, promptLines);

  const verdict = readVerdict(result);
  if (!verdict) throw new Error("Gemini summary came back without a verdict");

  const stanceCounts = countStances(opinions);
  return {
    sentiment: deriveSentiment(stanceCounts, opinions.length),
    verdict,
    praised: cleanPoints(result.praised),
    criticized: cleanPoints(result.criticized),
    opinionCount: opinions.length,
    videoCount: new Set(opinions.map((opinion) => opinion.videoGuideId)).size,
    stanceCounts,
  };
};

// Comments on an unreleased game's "review" videos are speculation, not
// opinions — and the stored releaseDate can't gate that: RAWG gives games with
// no announced date a year-end placeholder that silently passes (The Wolf
// Among Us 2 is stored as 2025-12-31 while still unreleased). The live flags
// below were checked against released and unreleased titles and cost no
// YouTube quota. Steam is asked first when the game is on Steam; RAWG's tba
// flag covers everything else.
const isGameReleased = async (game) => {
  if (game.steamId) {
    try {
      const response = await fetchSteamAppDetails(game.steamId);
      const entry = response?.data?.[String(game.steamId)];
      if (entry?.success && entry.data?.release_date) {
        return !entry.data.release_date.coming_soon;
      }
    } catch {
      // Steam's storefront API is unofficial and flaky; fall back to RAWG.
    }
  }

  const response = await getRawgData(`games/${game.rId}`);
  const rawgGame = response?.data;
  if (!rawgGame?.released || rawgGame.tba) return false;
  return rawgGame.released <= new Date().toISOString().slice(0, 10);
};

// Throws on Gemini or quota failures without writing anything, so the game
// stays unstamped and the next run retries it.
const refreshReviewCommentsForGame = async (gameId) => {
  const game = await gamesRepository.findGameById(gameId);
  if (!game?.name) return null;

  const videos = await gamesRepository.findReviewVideosForGame(gameId);
  if (!videos.length) return null;

  // Checked before fetching comments, so unreleased games spend no quota. Any
  // previously stored comments/summary are cleared rather than left showing.
  if (!(await isGameReleased(game))) {
    await gamesRepository.replaceReviewComments(gameId, videos.map((video) => video.id), [], null);
    return { videos: videos.length, unreleased: true, fetched: 0, candidates: 0, opinions: 0, summary: null };
  }

  const fetched = [];
  for (const video of videos) {
    fetched.push(...(await fetchVideoComments(video)));
  }

  const seenText = new Set();
  const candidates = fetched.filter((comment) => {
    if (!comment.youtubeCommentId || rejectCommentByRules(comment.text)) return false;
    const key = comment.text.trim().toLowerCase();
    if (seenText.has(key)) return false;
    seenText.add(key);
    return true;
  });

  const opinions = await classifyComments(game.name, candidates);
  const summary = await summarizeOpinions(game.name, opinions);

  // Below the threshold nothing is stored: those few "opinions" are exactly the
  // low-signal cases (trailers, pre-release hype) the threshold exists to hide.
  await gamesRepository.replaceReviewComments(
    gameId,
    videos.map((video) => video.id),
    summary ? opinions : [],
    summary,
  );

  return {
    videos: videos.length,
    fetched: fetched.length,
    candidates: candidates.length,
    opinions: opinions.length,
    summary,
  };
};

// Backfills platforms + requirements for a game that predates those columns.
// Platforms come from RAWG (the only source here that knows about consoles)
// and requirements from Steam, so a game missing one can still get the other.
const refreshSystemRequirementsForGame = async (gameId) => {
  const game = await gamesRepository.findGameById(gameId);
  if (!game) return null;

  let platforms = game.platforms || [];
  try {
    const response = await getRawgData(`games/${game.rId}`);
    const fetched = getPlatformNames(response?.data);
    if (fetched.length) platforms = fetched;
  } catch (e) {
    console.error("Failed to fetch RAWG platforms for", game.name, "Error:", e.message);
  }

  const steamId = game.steamId ?? (await getSteamId(game.rId, game.name));
  const systemRequirements = await getSteamRequirements(steamId);

  return gamesRepository.updateSystemRequirements(gameId, {
    steamId: steamId ? Number(steamId) : null,
    platforms,
    systemRequirements,
  });
};

module.exports = {
  getSearchResults,
  getSteamId,
  refreshSystemRequirementsForGame,
  fetchAndSaveLatestGames,
  fetchAndSaveRecentGames,
  refreshTrendingScores,
  refreshVideoGuidesForGame,
  backfillVideoSummaries,
  refreshReviewCommentsForGame,
};
