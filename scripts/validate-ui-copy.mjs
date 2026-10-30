import fs from "node:fs/promises";

const source = await fs.readFile("src/app/page.js", "utf8");
const checks = {
  noEmDashInPageCopy: !source.includes("—") && !source.includes("–"),
  imageOutputBoundaryIsExplicit: source.includes("Source-grounded board.") && source.includes("does not create replacement artwork."),
  exportStatusIsAccessible: source.includes('role="status"') && source.includes('aria-live="polite"'),
};
const report = {
  status: Object.values(checks).every(Boolean) ? "PASS" : "REJECTED",
  checks,
  note: "Static copy gate for visible Bookmoth UI strings. It complements rendered browser review and does not replace it.",
};
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
