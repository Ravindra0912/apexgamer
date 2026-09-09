const { MAJOR_PUBLISHERS } = require("../constants/majorPublishers");

const formatSearchResults = (data) => {
  return data;
};

const integerRegex = /^-?\d+$/;

const isIntegerNumber = (str) => integerRegex.test(str);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matched on word boundaries rather than raw substrings: a publisher listed as
// just "2K" has to match the "2k" entry, while "H2K" must not.
const MAJOR_PUBLISHER_PATTERNS = MAJOR_PUBLISHERS.map(
  (publisher) => new RegExp(`\\b${escapeRegex(publisher)}\\b`),
);

const isMajorPublisher = (publisherLabel) => {
  const publishers = (publisherLabel || "").toLowerCase().split(",").map((p) => p.trim());
  return publishers.some((publisher) =>
    MAJOR_PUBLISHER_PATTERNS.some((pattern) => pattern.test(publisher)),
  );
};

const classifyGameCategory = ({ genres, steamPublisher }) => {
  const isIndieGenre = (genres || []).some((genre) => genre?.slug === "indie");
  if (isIndieGenre) {
    return "INDIE";
  }

  return isMajorPublisher(steamPublisher) ? "AAA" : "UNCLASSIFIED";
};

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

module.exports = { formatSearchResults, getIdFromSteamUrl, classifyGameCategory };
