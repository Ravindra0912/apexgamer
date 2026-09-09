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

module.exports = {
  searchVideos,
};
