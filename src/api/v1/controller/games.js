const Game = require("../models/games");
const { getAllGames } = require("../services/games");

const saveNewGames = async (req, res) => {
  try {
    const response = await getAllGames(gamesList);
    const gameInstances = response.map(
      ({
        id,
        ratings,
        metacritic,
        background_image,
        dominant_color,
        short_screenshots,
        reviewSummary,
      }) => {
        return {
          rId: id,
          ratings,
          backgroundImage: background_image,
          metacritic,
          reviewSummary, // to have a separate API call
          dominantColor: dominant_color,
          screenShots: short_screenshots,
        };
      }
    );
    const insertedGames = await Game.insertMany(gameInstances);
    res.send({
      insertedGames,
    });
  } catch (e) {
    console.log("ERROR", e);
  }
};

const getGames = async (req, res) => {
  const data = await Game.find({});
  res.send(data);
};

const getGame = async (req, res) => {
  const games = await Game.find({ type: "AAA", releaseYear: 2023 });
  res.send({ games });
};

const deleteAll = async (req, res) => {
  await Game.deleteMany({});
  res.send("all games deleted");
};

module.exports = {
  saveNewGames,
  getGames,
  getGame,
  deleteAll,
};
