const { getSummaryResponse } = require("../services/openAiService");
const { getRawgData } = require("../services/rawgService");
const { fetchSteamReviews } = require("../services/steamService");

const RAWG_STEAM_STORE_ID = 1;

const integerRegex = /^-?\d+$/;

function isIntegerNumber(str) {
  return integerRegex.test(str);
}

const getIdFromSteamUrl = (steamUrl) => {
  const splitUrl = steamUrl?.split("/");
  console.log("splitUrl", splitUrl);
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
  console.log("ID", id);
  const response = await getRawgData(`games/${id}/stores`);
  console.log("STORE DATA response", response);
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
  games.forEach(async (gameItem) => {
    const reviewArray = gameItem.reviews.map((item) => {
      return item.reviewText;
    });
    reviewSummaryPromises.push(reviewArray.length? getSummaryResponse(reviewArray): Promise.resolve([]));
  });

  return Promise.all(reviewSummaryPromises).then((response) => {
    console.log("reviewSummaryPromises response", response);
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
    // const reviewsSummary = await getSummarisedReviews(reviews);
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
  console.log("RESPONSE", response);
  const popularGames = response?.data?.results;
  console.log("popularGames", popularGames);
  const promises = popularGames.map(async (popularGame) => {
    const steamId = await getSteamId(popularGame?.id);
    if (steamId) return fetchSteamReviews(steamId);
    else return Promise.resolve({});
  });
  return Promise.all(promises)
    .then((results) => {
      const formattedResults = getFormattedResults(results, popularGames);
      console.log("formattedResults", formattedResults);
      // console.log("results", results);
      // return formattedResults
      // res.send(formattedResults)
      return formattedResults;
    })
    .catch((e) => {
      console.log(e);
    });
  // res.send(response?.data);
};

const getPopularGamesAndSummarize = async (req, res) => {
  const games = await getCurrentPopularGames();
  const gamesWithSummary = await getGamesWithSummarizedReviews(games);
  console.log("gamesWithSummary", gamesWithSummary);
  res.send();
};

module.exports = { getPopularGamesAndSummarize };
