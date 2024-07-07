const express = require("express");
const {
  getLatestGamesAndSave,
  getAllGames,
  removeAllGames,
} = require("../controller/gamesController");

const router = express.Router();

router.post("/getLatestGamesAndSave", getLatestGamesAndSave);

router.get("/getGames", getAllGames);

router.delete("/removeAllGames", removeAllGames);

module.exports = router;
