const express = require("express");
const {
  getLatestGamesAndSave,
  getAllGames,
  removeAllGames,
  getLatestGamesAndAppend,
} = require("../controller/gamesController");

const router = express.Router();

router.post("/getLatestGamesAndSave", getLatestGamesAndSave);

router.post("/getGamesAndAppend", getLatestGamesAndAppend);

router.get("/getGames", getAllGames);

router.delete("/removeAllGames", removeAllGames);

module.exports = router;
