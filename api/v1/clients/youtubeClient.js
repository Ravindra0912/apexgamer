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

// Top-level comments ranked by YouTube's "relevance" order. The API has no
// most-liked ordering (only relevance or time), so callers re-rank by likes
// themselves. 1 quota unit per call for up to 100 comments. Videos with
// comments disabled return 403 "commentsDisabled".
const fetchCommentThreads = (videoId, maxResults = 100) =>
  axios({
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

module.exports = {
  searchVideos,
  fetchVideoDetails,
  fetchCommentThreads,
};
