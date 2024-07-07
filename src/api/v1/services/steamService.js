const axios = require("axios");

const fetchAllSteamGames = () => {
  axios({
    method: "get",
    url: `https://api.steampowered.com/ISteamApps/GetAppList/v0002`,
    params: {
      key: process.env.STEAM_API_KEY,
      format: "json",
    },
  });
};

const fetchSteamReviews = (id, params = {}) => {
  return axios({
    method: "get",
    url: `https://store.steampowered.com/appreviews/${id}`,
    params: {
      num_per_page: 50,
      json: 1,
      ...params,
    },
  });
};

module.exports = {
  fetchAllSteamGames,
  fetchSteamReviews,
};
