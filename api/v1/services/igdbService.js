const axios = require("axios");

const getIgdbServiceAccessToken = () =>
  axios({
    method: "post",
    url: `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
  });

module.exports = {
  getIgdbServiceAccessToken,
};
