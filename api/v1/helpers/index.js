const formatSearchResults = (data) => {
  return data;
};

const integerRegex = /^-?\d+$/;

const isIntegerNumber = (str) => integerRegex.test(str);

const getIdFromSteamUrl = (steamUrl) => {
  const splitUrl = steamUrl?.split("/");
  let i = splitUrl?.length - 1;
  if (typeof i !== "undefined") {
    while (i >= 0 && !isIntegerNumber(splitUrl[i])) {
      i--;
    }
    if (i >= 0) {
      return splitUrl[i];
    }
  }
  return null;
};

module.exports = { formatSearchResults, getIdFromSteamUrl };
