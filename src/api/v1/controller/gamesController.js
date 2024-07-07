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
    // return New Promise((res,))
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

    const data = item?.data;
    const reviewsData = data?.reviews;
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

const getCurrentPopularGames = async () => {
  const response = await getRawgData("games/lists/greatest", {
    discover: true,
    ordering: "-added",
    page_size: 5,
    page: 1,
  });
  const popularGames = response?.data?.results;
  const promises = popularGames.map(async (popularGame) => {
    const steamId = await getSteamId(popularGame?.id);
    if (steamId) return fetchSteamReviews(steamId);
    else return Promise.resolve({});
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

const getLatestGamesAndSave = async (req, res) => {
  try {
    const games = await getCurrentPopularGames();
    const gamesWithSummary = await getGamesWithSummarizedReviews(games);
    GameModel.insertMany(gamesWithSummary);
    res.send(gamesWithSummary);
  } catch (e) {
    res.send(e);
  }
};

const getAllGames = async (req, res) => {
  try {
    const response = await GameModel.find({});
    res.send(response);
  } catch (e) {
    console.log(e);
    res.send("falied");
    // res.status()
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

module.exports = { getLatestGamesAndSave, getAllGames, removeAllGames };
