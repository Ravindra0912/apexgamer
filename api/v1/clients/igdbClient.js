const axios = require("axios");

const getIgdbServiceAccessToken = () =>
  axios({
    method: "post",
    url: `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
  });

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const getCachedAccessToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }
  const response = await getIgdbServiceAccessToken();
  cachedToken = response.data.access_token;
  cachedTokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  return cachedToken;
};

const igdbQuery = async (endpoint, body) => {
  const accessToken = await getCachedAccessToken();
  const response = await axios({
    method: "post",
    url: `https://api.igdb.com/v4/${endpoint}`,
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    data: body,
  });
  return response.data;
};

const EXTERNAL_GAME_SOURCE_STEAM = 1;

const findIgdbGameIdsBySteamIds = (steamIds) =>
  igdbQuery(
    "external_games",
    `fields uid,game; where external_game_source = ${EXTERNAL_GAME_SOURCE_STEAM} & uid = (${steamIds
      .map((id) => `"${id}"`)
      .join(",")}); limit ${steamIds.length};`,
  );

const getPopularityTypes = () =>
  igdbQuery("popularity_types", "fields id,name,external_popularity_source; limit 50;");

const getPopularityPrimitives = (igdbGameIds, popularityTypeId) =>
  igdbQuery(
    "popularity_primitives",
    `fields game_id,value,popularity_type; where game_id = (${igdbGameIds.join(",")}) & popularity_type = ${popularityTypeId}; limit ${igdbGameIds.length};`,
  );

module.exports = {
  getIgdbServiceAccessToken,
  findIgdbGameIdsBySteamIds,
  getPopularityTypes,
  getPopularityPrimitives,
  EXTERNAL_GAME_SOURCE_STEAM,
};
