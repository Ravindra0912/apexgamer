const express = require("express");
const {
  saveNewGames,
  getGames,
  getGame,
  deleteAll,
} = require("../controller/gamesController");

const router = express.Router();

// router.get("/getGames", get);

router.get("/saveNewGames", saveNewGames);

router.delete("/deleteAll", deleteAll);

router.get("/all", getGames);

router.post("/", getGame);

module.exports = router;
