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

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const stripTags = (html) =>
  decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

// Steam returns requirements as a blob of store HTML. Parsing it into plain
// label/value pairs here means nothing downstream has to render third-party
// markup. Two layouts are in the wild: most pages bold only the label
// ("<strong>OS:</strong> Windows 10"), older ones bold the whole pair
// ("<strong>OS: Windows 10</strong>") — both are handled below.
const parseRequirementsHtml = (html) => {
  if (typeof html !== "string" || !html.trim()) return [];

  const listItems = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  const chunks =
    listItems && listItems.length
      ? listItems
      : html.replace(/^[\s\S]*?<\/strong>/i, "").split(/<br\s*\/?>/i);

  return chunks
    .map((chunk) => {
      const labelMatch = chunk.match(/<strong>([\s\S]*?)<\/strong>/i);
      let label = labelMatch ? stripTags(labelMatch[1]) : null;
      let value = stripTags(labelMatch ? chunk.replace(labelMatch[0], " ") : chunk);

      if (label && !value) {
        const colon = label.indexOf(":");
        if (colon > -1) {
          value = label.slice(colon + 1).trim();
          label = label.slice(0, colon);
        } else {
          value = label;
          label = null;
        }
      }

      // Steam marks legacy-OS footnotes with a trailing asterisk ("OS *").
      label = label ? label.replace(/[:\s*]+$/, "").trim() : null;
      if (!value) return null;
      return { label: label || null, value };
    })
    .filter(Boolean);
};

const STEAM_REQUIREMENT_FIELDS = [
  { key: "windows", field: "pc_requirements" },
  { key: "mac", field: "mac_requirements" },
  { key: "linux", field: "linux_requirements" },
];

// Returns null rather than an empty object when Steam has nothing usable, so
// callers can store null and the UI can skip the section outright.
//
// `platforms` is the authority on what a game actually ships on: Steam happily
// returns populated mac/linux requirement blobs for Windows-only games
// (confirmed live on GTA V), so those are dropped here.
const parseSteamRequirements = (appDetails) => {
  if (!appDetails) return null;
  const supported = appDetails.platforms || {};
  const result = {};

  for (const { key, field } of STEAM_REQUIREMENT_FIELDS) {
    if (!supported[key]) continue;
    const blob = appDetails[field];
    if (!blob || Array.isArray(blob)) continue;

    const minimum = parseRequirementsHtml(blob.minimum);
    const recommended = parseRequirementsHtml(blob.recommended);
    if (!minimum.length && !recommended.length) continue;

    result[key] = {};
    if (minimum.length) result[key].minimum = minimum;
    if (recommended.length) result[key].recommended = recommended;
  }

  return Object.keys(result).length ? result : null;
};

const getPlatformNames = (rawgGame) =>
  (rawgGame?.platforms || [])
    .map((entry) => entry?.platform?.name)
    .filter((name) => typeof name === "string" && name.length > 0);

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

module.exports = {
  formatSearchResults,
  getIdFromSteamUrl,
  classifyGameCategory,
  parseSteamRequirements,
  getPlatformNames,
};
