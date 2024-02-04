const { getRawgData } = require("./service/rawgApiClient");

const getAllGames = async (gamesList) => {
  const gamesPromises = [];
  for (let i = 0; i < gamesList.length; i++) {
    gamesPromises.push(
      getRawgData("games", {
        search: gamesList[i].name,
      })
    );
  }
  const result = [];
  return Promise.all(gamesPromises).then((response) => {
    console.log("respnse", response);
    return response.map((item, index) => {
      const game = item.data.results[0];
      return {
        ...game,
        reviewSummary: gamesList[index].summary,
      };
    });
    console.log("response.data", response.data);
    return result.push(response.data);
  });
};

module.exports = {
  getAllGames,
};
