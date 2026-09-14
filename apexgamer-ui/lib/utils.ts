export function stripBBCode(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/\[\/?[a-z0-9]+(=[^\]]*)?\]/gi, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/[\s:]+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// RAWG lists every generation a game ever shipped on — GTA V alone returns
// seven entries, and one game in the catalog returns thirteen. A card only has
// room for a handful, so each console family collapses to the newest
// generation present: a game on PS3/PS4/PS5 reads "PS5", one that never left
// the PS4 reads "PS4". The detail page still shows the full, unabbreviated list.
const PLATFORM_FAMILIES: [string, string][][] = [
  [["PC", "PC"]],
  [
    ["PlayStation 5", "PS5"],
    ["PlayStation 4", "PS4"],
    ["PlayStation 3", "PS3"],
    ["PlayStation 2", "PS2"],
    ["PS Vita", "PS Vita"],
  ],
  [
    ["Xbox Series S/X", "Xbox Series"],
    ["Xbox One", "Xbox One"],
    ["Xbox 360", "Xbox 360"],
    ["Xbox", "Xbox"],
  ],
  [
    ["Nintendo Switch", "Switch"],
    ["Wii U", "Wii U"],
    ["Nintendo 3DS", "3DS"],
  ],
  [["macOS", "Mac"]],
  [["Linux", "Linux"]],
  [["iOS", "iOS"]],
  [["Android", "Android"]],
  [["Web", "Web"]],
];

export function summarizePlatforms(platforms: string[]): string[] {
  const owned = new Set(platforms);
  const summary: string[] = [];

  for (const family of PLATFORM_FAMILIES) {
    const newest = family.find(([name]) => owned.has(name));
    if (newest) summary.push(newest[1]);
  }

  // Anything RAWG adds that isn't mapped yet still shows, rather than silently
  // disappearing from the card.
  const mapped = new Set(PLATFORM_FAMILIES.flat().map(([name]) => name));
  platforms.filter((name) => !mapped.has(name)).forEach((name) => summary.push(name));

  return summary;
}
