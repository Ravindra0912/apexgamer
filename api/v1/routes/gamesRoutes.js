const express = require("express");
const {
  getLatestGamesAndSave,
  getRecentGamesAndSave,
  getAllGames,
  removeAllGames,
  refreshTrending,
  getVideoGuides,
  refreshVideoGuides,
} = require("../controller/gamesController");

const router = express.Router();

router.post("/", getLatestGamesAndSave);

router.get("/", getAllGames);

router.delete("/", removeAllGames);

router.post("/trending/refresh", refreshTrending);

router.post("/recent", getRecentGamesAndSave);

router.get("/:id/videos", getVideoGuides);

router.post("/:id/videos/refresh", refreshVideoGuides);

module.exports = router;
