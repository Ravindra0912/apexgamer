const { getSummaryResponse } = require("../services/openAiService");
const { getRawgData } = require("../services/rawgService");
const { fetchSteamReviews } = require("../services/steamService");
const GameModel = require("../models/gamesModels");

const RAWG_STEAM_STORE_ID = 1;

const integerRegex = /^-?\d+$/;

function isIntegerNumber(str) {
  return integerRegex.test(str);
}

const getIdFromSteamUrl = (steamUrl) => {
  const splitUrl = steamUrl?.split("/");
  let i = splitUrl?.length;
  if (typeof i !== "undefined") {
    while (!isIntegerNumber(splitUrl[i])) {
      i--;
    }
    return splitUrl[i];
  }
  return null;
};

const getSteamId = async (id) => {
  const response = await getRawgData(`games/${id}/stores`);
  const steamUrl = response?.data?.results?.find(
    (storeItem) => storeItem.store_id === RAWG_STEAM_STORE_ID
  )?.url;
  if (steamUrl) {
    return getIdFromSteamUrl(steamUrl);
  }
  return null;
};

const getGamesWithSummarizedReviews = async (games) => {
  let reviewSummaryPromises = [];
  games.forEach(async (gameItem, i) => {
    const reviewArray = gameItem.reviews.map((item) => {
      return item.reviewText;
    });
    reviewSummaryPromises.push(
      reviewArray.length > 0
        ? getSummaryResponse(reviewArray)
        : Promise.resolve([])
    );
  });

  return Promise.all(reviewSummaryPromises).then((response) => {
    for (let i = 0; i < response.length; i++) {
      games[i].reviewSummary = response[i];
    }
    return games;
  });
};

const getFormattedResults = (results, popularGames) => {
  return results?.map((item, index) => {
    const currentGame = popularGames[index];
    const reviewsData = currentGame?.reviews;
    let reviews = [];
    let reviewString = "";
    if (reviewsData?.length) {
      reviews = reviewsData.map((item) => {
        reviewString = reviewString + item?.review;
        return {
          reviewText: item?.review,
          votes_up: item?.votes_up,
          recommendationid: item?.recommendationid,
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
      // reviewsSummary,
      tags: currentGame?.tags,
    };
  });
};
null;

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
      const response = await fetchSteamReviews(steamId);
      popularGame.reviews = response.data.reviews;
    } else return Promise.resolve({});
  });
  return Promise.all(promises)
    .then((results) => {
      const formattedResults = getFormattedResults(results, popularGames);
      return formattedResults;
    })
    .catch((e) => {
      console.log(e);
    });
};

const saveData = async (games, index, t, res) => {  
  if (index >= games.length || !games.length) {
    clearTimeout(t); // Ensure no dangling timeouts
    res("All Data Saved");
    return;
  }

  const gamesWithSummary = await getGamesWithSummarizedReviews(games[index]);
  const gameIds = gamesWithSummary.map((game) => game.rId);

  const existingGames = await GameModel.find(
    { rId: { $in: gameIds } },
    { rId: 1 }
  );

  const existingGameIds = new Set(existingGames.map((game) => game.rId));
  const newGames = gamesWithSummary.filter(
    (game) => !existingGameIds.has(game.rId) // Fix `_rId` typo
  );

  if (newGames.length > 0) {
    await GameModel.insertMany(newGames);
  }

  t = setTimeout(() => {
    saveData(games, index + 1, t, res);
  }, 5000);
};

const getLatestGamesAndSave = async (req, res) => {
  try {
    const { count } = req.body;
    const games = await getCurrentPopularGames(count);

    const gamesArray = Array.from({ length: count }, (_, i) => games.slice(i, i + 1));
    const gamesArrayIndex = 0;

    await new Promise((resolve) => {
      saveData(gamesArray, gamesArrayIndex, undefined, resolve);
    });

    res.send("All games processed successfully");
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
};

const getAllGames = async (req, res) => {
  try {
    const response = await GameModel.find({});
    res.send(response);
  } catch (e) {
    console.log(e);
    res.send("falied");
  }
};

const removeAllGames = async (req, res) => {
  try {
    await GameModel.deleteMany({});
    res.send("GAMES DELETED");
  } catch (e) {
    console.log(e);
  }
};

const getLatestGamesAndAppend = (req, res) => {
  // try{
  // }
};

module.exports = {
  getLatestGamesAndSave,
  getAllGames,
  removeAllGames,
  getLatestGamesAndAppend,
};
