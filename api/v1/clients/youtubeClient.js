const axios = require("axios");

// Quota units charged per call, per YouTube Data API v3 pricing.
const QUOTA_COST = { search: 100, videos: 1, commentThreads: 1 };

// Units spent by this process. Google charges a call whether it succeeds or
// fails, so usage is counted before the request goes out. The daily pipeline
// reads this to split its budget between stages; it's per-process, so it
// can't see quota spent elsewhere (another script, the site's "Find videos"
// button) — callers keep a safety margin for that.
let unitsUsed = 0;

const charge = (endpoint) => {
  unitsUsed += QUOTA_COST[endpoint];
};

const getQuotaUnitsUsed = () => unitsUsed;

// Official YouTube Data API v3 search — 100 quota units per call against a
// 10,000/day free quota (no billing tier). Returns metadata only (title,
// channel, thumbnail, description) — never transcripts, which the official
// API doesn't expose for videos you don't own.
const searchVideos = (query, maxResults = 5) => {
  charge("search");
  return axios({
    method: "get",
    url: "https://www.googleapis.com/youtube/v3/search",
    params: {
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      type: "video",
      maxResults,
      q: query,
    },
  });
};

// Fetches snippets for videos already known by id. Costs 1 quota unit per
// call regardless of how many ids are passed (max 50), versus 100 for a
// search — so re-reading metadata for stored videos is effectively free.
const fetchVideoDetails = (videoIds) => {
  charge("videos");
  return axios({
    method: "get",
    url: "https://www.googleapis.com/youtube/v3/videos",
    params: {
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      id: videoIds.join(","),
    },
  });
};

// Top-level comments ranked by YouTube's "relevance" order. The API has no
// most-liked ordering (only relevance or time), so callers re-rank by likes
// themselves. 1 quota unit per call for up to 100 comments. Videos with
// comments disabled return 403 "commentsDisabled".
const fetchCommentThreads = (videoId, maxResults = 100) => {
  charge("commentThreads");
  return axios({
    method: "get",
    url: "https://www.googleapis.com/youtube/v3/commentThreads",
    params: {
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      videoId,
      order: "relevance",
      maxResults,
      textFormat: "plainText",
    },
  });
};

// A spent daily quota comes back as 403 with this reason — distinct from
// per-video 403s like "commentsDisabled", which must not stop a run.
const isQuotaExceeded = (error) =>
  error?.response?.data?.error?.errors?.some((detail) => detail?.reason === "quotaExceeded") ?? false;

module.exports = {
  searchVideos,
  fetchVideoDetails,
  fetchCommentThreads,
  getQuotaUnitsUsed,
  isQuotaExceeded,
  QUOTA_COST,
};
