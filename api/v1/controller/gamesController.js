const gamesRepository = require("../repositories/gamesRepository");
const gamesQueue = require("../queues/gamesQueue");
const { refreshVideoGuidesForGame } = require("../services/gamesService");

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

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const getRecentGamesAndSave = async (req, res, next) => {
  try {
    const { count, sinceDate } = req.body;

    if (count === undefined || count === null) {
      return res.status(400).json({ error: "count is required" });
    }
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: "count must be an integer between 1 and 100" });
    }
    if (sinceDate !== undefined && (typeof sinceDate !== "string" || !ISO_DATE_REGEX.test(sinceDate))) {
      return res.status(400).json({ error: "sinceDate must be a YYYY-MM-DD string" });
    }

    const job = await gamesQueue.add("fetchRecent", { count, sinceDate });
    res.status(202).json({ jobId: job.id, message: "Job added to queue successfully" });
  } catch (e) {
    next(e);
  }
};

const ALLOWED_SORTS = new Set(["trending", "popular", "newest"]);
const ALLOWED_CATEGORIES = new Set(["AAA", "INDIE", "UNCLASSIFIED"]);

const getAllGames = async (req, res, next) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit)) || 10;
    const afterId = req.query.afterId || null;
    const after = req.query.after ?? null;

    const sort = ALLOWED_SORTS.has(req.query.sort) ? req.query.sort : "newest";
    if (req.query.sort && !ALLOWED_SORTS.has(req.query.sort)) {
      return res.status(400).json({ error: `sort must be one of: ${[...ALLOWED_SORTS].join(", ")}` });
    }
    if (req.query.category && !ALLOWED_CATEGORIES.has(req.query.category)) {
      return res.status(400).json({ error: `category must be one of: ${[...ALLOWED_CATEGORIES].join(", ")}` });
    }
    const category = req.query.category || undefined;

    const games = await gamesRepository.findGamesPaginated({
      limit,
      after,
      afterId,
      sort,
      category,
    });
    const last = games.at(-1);
    const response = {
      data: games,
      paging: {
        // Cursor must track the field the results are ordered by, otherwise
        // page 2+ filters on a different axis than it sorts on.
        after: last ? (last[gamesRepository.SORT_FIELDS[sort]] ?? null) : undefined,
        afterId: last?.id,
      },
    };
    res.status(200).json(response);
  } catch (e) {
    next(e);
  }
};

const refreshTrending = async (req, res, next) => {
  try {
    const job = await gamesQueue.add("refreshTrending", {});
    res.status(202).json({ jobId: job.id, message: "Trending refresh job added to queue successfully" });
  } catch (e) {
    next(e);
  }
};

const removeAllGames = async (req, res, next) => {
  try {
    await gamesRepository.deleteAllGames();
    res.status(200).json({ message: "All games deleted successfully" });
  } catch (e) {
    next(e);
  }
};

const getVideoGuides = async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId)) {
      return res.status(400).json({ error: "id must be an integer" });
    }
    const videos = await gamesRepository.findVideoGuidesByGameId(gameId);
    res.status(200).json({ data: videos });
  } catch (e) {
    next(e);
  }
};

// Separate from the GET above so a page view never silently spends YouTube
// quota — refreshing is an explicit action.
const refreshVideoGuides = async (req, res, next) => {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId)) {
      return res.status(400).json({ error: "id must be an integer" });
    }
    const game = await gamesRepository.findGameById(gameId);
    if (!game) {
      return res.status(404).json({ error: "game not found" });
    }
    const videos = await refreshVideoGuidesForGame(gameId);
    res.status(200).json({ data: videos });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getLatestGamesAndSave,
  getRecentGamesAndSave,
  getAllGames,
  removeAllGames,
  refreshTrending,
  getVideoGuides,
  refreshVideoGuides,
};
