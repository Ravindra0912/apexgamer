const { getSummaryResponse } = require("./openAiService");
const { getRawgData } = require("./rawgService");
const { fetchSteamReviews } = require("./steamService");
const GameModel = require("../models/gamesModels");
const { formatSearchResults, getIdFromSteamUrl } = require("../helpers/index");

const RAWG_STEAM_STORE_ID = 1;

const getSearchResults = async (searchString) => {
  const data = await getRawgData("games", { search: searchString });
  return formatSearchResults(data?.data?.results);
};

const getSteamId = async (id) => {
  const response = await getRawgData(`games/${id}/stores`);
  const steamUrl = response?.data?.results?.find(
    (storeItem) => storeItem.store_id === RAWG_STEAM_STORE_ID,
  )?.url;
  if (steamUrl) {
    return getIdFromSteamUrl(steamUrl);
  }
  return null;
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
    let reviewString = "";
    if (reviewsData?.length) {
      reviews = reviewsData.map((reviewItem) => {
        reviewString = reviewString + reviewItem?.review;
        return {
          reviewText: reviewItem?.review,
          votes_up: reviewItem?.votes_up,
          recommendationid: reviewItem?.recommendationid,
        };
      });
    }
    return {
      ...currentGame,
      rId: currentGame?.id,
      rawRating: currentGame?.rating,
      steamId: getIdFromSteamUrl(item?.config?.url),
      ratings: {
        metacritic: currentGame?.metacritic,
        rawg: currentGame?.rating,
      },
      reviews,
      dominantColor: currentGame?.dominant_color,
      screenShots: currentGame?.short_screenshots,
      releaseDate: currentGame?.released,
      tags: currentGame?.tags,
    };
  });
};

const getCurrentPopularGames = async (count) => {
  const response = await getRawgData("games", {
    discover: true,
    ordering: "-added",
    page_size: count,
    page: 1,
  });
  const popularGames = response?.data?.results;
  const promises = popularGames.map(async (popularGame) => {
    const steamId = await getSteamId(popularGame?.id);
    if (steamId) {
      const reviewResponse = await fetchSteamReviews(steamId);
      popularGame.reviews = reviewResponse.data.reviews;
    } else return Promise.resolve({});
  });
  return Promise.all(promises)
    .then((results) => getFormattedResults(results, popularGames))
    .catch((e) => { console.log(e); });
};

const processGamesSequentially = async (games, delayMs = 5000) => {
  for (const gamesBatch of games) {
    try {
      const gamesWithSummary = await getGamesWithSummarizedReviews(gamesBatch);
      const gameIds = gamesWithSummary.map((game) => game.rId);
      const existingGames = await GameModel.find({ rId: { $in: gameIds } }, { rId: 1 });
      const existingGameIds = new Set(existingGames.map((game) => game.rId));
      const newGames = gamesWithSummary.filter((game) => !existingGameIds.has(game.rId));
      if (newGames.length > 0) {
        await GameModel.insertMany(newGames);
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

module.exports = {
  getSearchResults,
  fetchAndSaveLatestGames,
};
