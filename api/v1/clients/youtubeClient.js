const axios = require("axios");

// Official YouTube Data API v3 search — 100 quota units per call against a
// 10,000/day free quota (no billing tier). Returns metadata only (title,
// channel, thumbnail, description) — never transcripts, which the official
// API doesn't expose for videos you don't own.
const searchVideos = (query, maxResults = 5) =>
  axios({
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

// Fetches snippets for videos already known by id. Costs 1 quota unit per
// call regardless of how many ids are passed (max 50), versus 100 for a
// search — so re-reading metadata for stored videos is effectively free.
const fetchVideoDetails = (videoIds) =>
  axios({
    method: "get",
    url: "https://www.googleapis.com/youtube/v3/videos",
    params: {
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      id: videoIds.join(","),
    },
  });

module.exports = {
  searchVideos,
  fetchVideoDetails,
};
