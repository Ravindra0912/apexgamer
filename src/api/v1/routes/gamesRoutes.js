const express = require("express");
const { getPopularGamesAndSummarize } = require("../controller/gamesController");

const router = express.Router();

router.get("/getCurrentPopularGames", getPopularGamesAndSummarize);

module.exports = router;
