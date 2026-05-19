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
    const limit = Math.max(1, parseInt(req.query.limit)) || 10;
    const after = req.query.after || null;

    const query = after ? {_id: {$gt:after}}: {}
    const games = await GameModel.find(query).sort({updatedAt: -1, _id:-1}).limit(limit)
    const last = games.at(-1);
    const response = {
      data: games,
      paging: {
        after: last?._id
      }
    }
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
