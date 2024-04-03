const { getRawgData } = require("./rawgService");

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
      const { metacritic, rating: rawg } = game;
      return {
        ...game,
        reviewSummary: gamesList[index].summary,
        ratings: [
          {
            metacritic,
            rawg,
            ign: null,
          },
        ],
      };
    });
  });
};

module.exports = {
  getAllGames,
};
