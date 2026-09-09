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
