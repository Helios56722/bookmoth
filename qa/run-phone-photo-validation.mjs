import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(root, "phone-photo-2026-10-07.png");
const output = path.join(root, "phone-photo-validation-2026-10-07.json");
const baseUrl = process.env.BOOKMOTH_URL || "http://127.0.0.1:4342";
const bytes = await readFile(fixture);
const source = {
  id: "phone-photo-water-cycle",
  name: path.basename(fixture),
  type: "image/png",
  size: bytes.length,
  dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
};

const started = Date.now();
const response = await fetch(`${baseUrl}/api/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sources: [source],
    context: "Phone photo of a water-cycle study sheet",
    goal: "Explain the sequence and the role of the Sun, then make practice material.",
    referenceUrl: "",
    studyUseAccepted: true,
  }),
});
const payload = await response.json();
const extracted = payload?.pack?.sources?.map((item) => item.extractedText || "").join("\n").toLowerCase() || "";
const requiredTerms = ["evaporation", "condensation", "precipitation", "collection", "sun"];
const missingTerms = requiredTerms.filter((term) => !extracted.includes(term));
const citedGroups = [payload?.pack?.concepts, payload?.pack?.flashcards, payload?.pack?.practice, payload?.pack?.reportSections]
  .filter(Array.isArray)
  .flat();
const invalidCitationCount = citedGroups.filter((item) => !item.sourceIds?.includes("S1")).length;
const result = {
  checkedAt: new Date().toISOString(),
  elapsedSeconds: Math.round((Date.now() - started) / 100) / 10,
  httpStatus: response.status,
  provider: payload?.provider || null,
  sourceCount: payload?.pack?.sources?.length || 0,
  conceptCount: payload?.pack?.concepts?.length || 0,
  missingTerms,
  invalidCitationCount,
  unclearText: payload?.pack?.sources?.flatMap((item) => item.unclearText || []) || [],
  extractedText: payload?.pack?.sources?.[0]?.extractedText || "",
  passed: response.ok && payload?.pack?.sources?.length === 1 && missingTerms.length === 0 && invalidCitationCount === 0,
  payload,
};

await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  passed: result.passed,
  httpStatus: result.httpStatus,
  elapsedSeconds: result.elapsedSeconds,
  provider: result.provider,
  sourceCount: result.sourceCount,
  conceptCount: result.conceptCount,
  missingTerms: result.missingTerms,
  invalidCitationCount: result.invalidCitationCount,
  unclearText: result.unclearText,
}, null, 2));
if (!result.passed) process.exitCode = 1;
