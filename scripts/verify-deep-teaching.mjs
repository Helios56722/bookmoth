import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { learningPackToMarkdown, validateDeepLessons } from "../src/lib/bookmoth.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagePath = path.join(root, "public", "sample-notes.png");
const image = await fs.readFile(imagePath);
const startedAt = Date.now();
const baseUrl = process.env.BOOKMOTH_VERIFY_URL || "http://127.0.0.1:4342";
const response = await fetch(`${baseUrl}/api/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sources: [{
      name: "manual-exposure-guide.png",
      type: "image/png",
      dataUrl: `data:image/png;base64,${image.toString("base64")}`,
    }],
    context: "Photography fundamentals",
    goal: "Understand how aperture, shutter speed, and ISO change a photo",
    referenceUrl: "",
    studyUseAccepted: true,
  }),
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error || `API returned ${response.status}`);

const pack = payload.pack;
const deterministic = validateDeepLessons(
  pack.deepLessons,
  pack.sources,
  null,
  { requireSourceVocabulary: true },
);
const responsePath = path.join(root, "docs", "validation", "DEEP_TEACHING_LIVE_RESPONSE_2026-10-07.json");
const exportPath = path.join(root, "docs", "validation", "DEEP_TEACHING_LIVE_EXPORT_2026-10-07.md");
await fs.writeFile(responsePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await fs.writeFile(exportPath, learningPackToMarkdown(pack), "utf8");
const summary = {
  httpStatus: response.status,
  elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
  provider: payload.provider,
  title: pack.title,
  sourceCount: pack.sources.length,
  deepLessonCount: pack.deepLessons.length,
  acceptedByDeterministicGate: deterministic.accepted.length,
  evidenceReview: pack.evidenceReview,
  savedResponse: path.relative(root, responsePath),
  savedMarkdownExport: path.relative(root, exportPath),
  lessonStructure: pack.deepLessons.map((lesson) => ({
    term: lesson.term,
    explanationCharacters: lesson.explanation.length,
    steps: lesson.steps.length,
    commonMistakes: lesson.commonMistakes.length,
    evidenceQuotes: lesson.evidenceQuotes.length,
    verification: lesson.verification,
  })),
};

console.log(JSON.stringify(summary, null, 2));

if (deterministic.accepted.length !== pack.deepLessons.length) {
  throw new Error(`Live response failed deterministic recheck: ${JSON.stringify(deterministic.issues)}`);
}
if (pack.deepLessons.some((lesson) => lesson.steps.length < 2 || lesson.commonMistakes.length < 1)) {
  throw new Error("Live response did not contain the required teaching structure.");
}
