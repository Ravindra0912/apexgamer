const Game = require("../models/gamesModels");
const {
  getAllGames,
  getGameDetailsByName,
} = require("../services/gamesService");
const dayjs = require("dayjs");

const saveMultipleGames = async (gameInstances) => {
  const insertedGames = await Game.insertMany(gameInstances);
  res.send({
    insertedGames,
  });
};

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
        released,
      }) => {
        return {
          rId: id,
          ratings,
          backgroundImage: background_image,
          metacritic,
          reviewSummary, // to have a separate API call
          dominantColor: dominant_color,
          screenShots: short_screenshots,
          releaseDate: dayjs.unix(released),
        };
      }
    );
    await saveMultipleGames(gameInstances);
  } catch (e) {
    console.log("ERROR", e);
    res.status(500).send("Internal Server Error");
  }
};

const getGameByName = async (req, res) => {
  try {
    console.log("REQ", req);
    const name = req?.query?.name;
    // console.log("name", name);
    const response = await getGameDetailsByName(name);
    res.send(response);
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
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

const updateGameData = async (req, res) => {
  try {
    // const { summary, id } = req.body;
    const updatedGame = await Game.findByIdAndUpdate(
      id,
      { $set: { ...req.body } }, // update the summary field
      { new: true } // return the updated document
    );

    if (!updatedGame) {
      return res.status(404).send("Game not found");
    }

    res.send(updatedGame);
  } catch (error) {
    console.error("Error updating game summary:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  saveNewGames,
  getGames,
  getGame,
  deleteAll,
  getGameByName,
  updateGameData,
};
