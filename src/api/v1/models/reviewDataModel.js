const mongoose = require("mongoose");

const reviewDataSchema = new mongoose.Schema({
  reviewText: String,
  votes_up: Number,
});

const reviewSummaryDataSchema = new mongoose.Schema({
  pros: [String],
  cons: [String],
});

const ReviewData = mongoose.model("reviewData", reviewDataSchema);

module.exports = { reviewDataSchema, ReviewData, reviewSummaryDataSchema };
