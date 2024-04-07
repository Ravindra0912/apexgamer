const express = require("express");
const {
  saveNewGames,
  getGames,
  getGame,
  deleteAll,
  getGameByName,
  updateGameData,
} = require("../controller/gamesController");

const router = express.Router();

router.post("/saveNewGames", saveNewGames);

router.delete("/deleteAll", deleteAll);

router.get("/all", getGames);

router.post("/", getGame);

router.get("/name", getGameByName);

router.post("/update", updateGameData);

module.exports = router;
