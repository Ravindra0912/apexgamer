const { getRawgData } = require("./rawgService");
const { formatSearchResults } = require("../helpers/index");

const getSearchResults = async (searchString) => {
  const data = await getRawgData("games", { search: searchString });
  return formatSearchResults(data?.data?.results);
};

module.exports = {
  getSearchResults,
};
