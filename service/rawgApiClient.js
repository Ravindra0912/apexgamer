const axios = require("axios");

const getRawgData = (path, params = {}) =>
  axios({
    method: "get",
    url: `https://api.rawg.io/api/${path}`,
    params: {
      key: process.env.RAWG_API_KEY,
      ...params,
    },
  });

module.exports = { getRawgData };
