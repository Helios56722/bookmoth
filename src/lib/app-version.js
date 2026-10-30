export const APP_VERSION = "0.2.0";

export const VERSION_SOURCES = [
  "https://bookmoth.vercel.app/version.json",
  "https://raw.githubusercontent.com/Helios56722/bookmoth/main/public/version.json",
  "/version.json",
];

export function compareVersions(left, right) {
  const parse = (value) => String(value || "0.0.0")
    .replace(/^v/i, "")
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}
