const mongoose = require("mongoose");

const gamesListSchema = new mongoose.Schema({
    rId: Number,
    rating: Number,
    ratings: [[{ metacritic: Number, rawg: Number }]],
    backgroundImage: String,
    reviewSummary: [[String]], // to have a separate API call
    dominantColor: String, // dominant_color,
    screenShots: [[{ id: Number, image: String }]],
    releaseDate: Number,
  });
  
const Game = mongoose.model("Games", gamesListSchema);

module.exports = Game;