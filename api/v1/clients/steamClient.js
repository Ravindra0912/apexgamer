const axios = require("axios");

// Steam's storefront search (unofficial, no key/auth) — used to recover a
// steamId when RAWG hasn't linked a game to its Steam store page yet, which
// is common for newly-added catalog entries. Not to be confused with
// ISteamApps/GetAppList, which Valve has decommissioned (confirmed live:
// "Method 'GetAppList' not found in interface 'ISteamApps'").
const searchSteamStore = (term) => {
  return axios({
    method: "get",
    url: "https://store.steampowered.com/api/storesearch/",
    params: { term, cc: "us", l: "en" },
  });
};

const fetchSteamReviews = (id, params = {}) => {
  return axios({
    method: "get",
    url: `https://store.steampowered.com/appreviews/${id}`,
    params: {
      num_per_page: 50,
      json: 10,
      ...params,
    },
  });
};

const fetchSteamSpyTop100InTwoWeeks = () =>
  axios({
    method: "get",
    url: "https://steamspy.com/api.php",
    params: { request: "top100in2weeks" },
  });

const fetchSteamSpyAppDetails = (appid) =>
  axios({
    method: "get",
    url: "https://steamspy.com/api.php",
    params: { request: "appdetails", appid },
  });

module.exports = {
  searchSteamStore,
  fetchSteamReviews,
  fetchSteamSpyTop100InTwoWeeks,
  fetchSteamSpyAppDetails,
};
