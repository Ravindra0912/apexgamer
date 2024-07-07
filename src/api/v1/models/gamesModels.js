const mongoose = require("mongoose");
const {
  reviewDataSchema,
  reviewSummaryDataSchema,
} = require("./reviewDataModel");

const gamesListSchema = new mongoose.Schema({
  rId: Number,
  rating: Number,
  steamId: Number,
  ratings: [[{ metacritic: Number, rawg: Number }]],
  backgroundImage: String,
  reviews: [reviewDataSchema],
  dominantColor: String,
  screenShots: [[{ id: Number, image: String }]],
  releaseDate: String,
  reviewSummary: [reviewSummaryDataSchema],
  tags: [
    {
      id: Number,
      name: String,
      slug: String,
      language: String,
      games_count: Number,
      image_background: String,
    },
  ],
});

const GameModel = mongoose.model("Games", gamesListSchema);

module.exports = GameModel;
