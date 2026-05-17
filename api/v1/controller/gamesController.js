const GameModel = require("../models/gamesModels");
const gamesQueue = require("../queues/gamesQueue");

const getLatestGamesAndSave = async (req, res, next) => {
  try {
    const { count } = req.body;

    if (count === undefined || count === null) {
      return res.status(400).json({ error: "count is required" });
    }
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: "count must be an integer between 1 and 100" });
    }

    const job = await gamesQueue.add("fetchAndSave", { count });
    res.status(202).json({ jobId: job.id, message: "Job added to queue successfully" });
  } catch (e) {
    next(e);
  }
};

const getAllGames = async (req, res, next) => {
  try {
    const response = await GameModel.find({});
    res.status(200).json(response);
  } catch (e) {
    next(e);
  }
};

const removeAllGames = async (req, res, next) => {
  try {
    await GameModel.deleteMany({});
    res.status(200).json({ message: "All games deleted successfully" });
  } catch (e) {
    next(e);
  }
};


module.exports = {
  getLatestGamesAndSave,
  getAllGames,
  removeAllGames,
};
