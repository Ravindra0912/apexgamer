const express = require("express");
const {
  getLatestGamesAndSave,
  getAllGames,
  removeAllGames,
} = require("../controller/gamesController");

const router = express.Router();

router.post("/", getLatestGamesAndSave);

router.get("/", getAllGames);

router.delete("/", removeAllGames);

module.exports = router;
