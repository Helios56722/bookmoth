import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEvidenceLockedPack,
  learningPackToMarkdown,
  normalizeLearningPack,
  sampleLearningPack,
  validateSources,
} from "../src/lib/bookmoth.js";

test("source validation rejects an empty set", () => {
  assert.equal(validateSources([]), "Add at least one screenshot or image.");
});

test("source validation accepts a valid PNG data URL", () => {
  assert.equal(validateSources([{ type: "image/png", dataUrl: "data:image/png;base64,AAAA" }]), null);
});

test("normalization preserves source links and fills safe defaults", () => {
  const pack = normalizeLearningPack({
    title: "Joinery",
    concepts: [{ term: "Mortise", explanation: "A recess.", sourceIds: ["S1"] }],
  });
  assert.equal(pack.title, "Joinery");
  assert.deepEqual(pack.concepts[0].sourceIds, ["S1"]);
  assert.deepEqual(pack.practice, []);
});

test("sample pack contains all public output types", () => {
  const pack = sampleLearningPack();
  assert.ok(pack.concepts.length > 0);
  assert.ok(pack.reportSections.length > 0);
  assert.ok(pack.flashcards.length > 0);
  assert.ok(pack.practice.length > 0);
  assert.ok(pack.collage.callouts.length > 0);
  assert.ok(pack.trailMap.glowPoints.length > 0);
  assert.ok(pack.trailMap.threads.every((thread) => thread.fromId && thread.toId));
  assert.ok(pack.trailMap.blindSpots.length > 0);
  assert.ok(pack.trailMap.recallLoop.length > 0);
});

test("markdown export includes verification language and citations", () => {
  const markdown = learningPackToMarkdown(sampleLearningPack());
  assert.match(markdown, /Sources: S1/);
  assert.match(markdown, /Verify the result against the cited source images/);
  assert.match(markdown, /## Lantern trail/);
  assert.match(markdown, /### Blind spots/);
});

test("local evidence lock keeps factual answers in extracted source wording", () => {
  const sourceText = [
    "Photosynthesis Study Notes",
    "Photosynthesis converts light energy into chemical energy.",
    "Products: glucose and oxygen.",
  ].join("\n");
  const pack = buildEvidenceLockedPack([{
    sourceId: "S1",
    extractedText: sourceText,
    confidence: "high",
    unclearText: [],
  }]);

  assert.equal(pack.concepts.length, 2);
  assert.equal(pack.reportSections.length, 2);
  assert.equal(pack.flashcards.length, 2);
  assert.equal(pack.practice.length, 2);
  for (const item of [...pack.concepts.map((entry) => entry.explanation), ...pack.flashcards.map((entry) => entry.back)]) {
    assert.ok(sourceText.includes(item));
  }
  assert.equal(pack.trailMap.threads.length, 0);
  assert.ok(pack.trailMap.blindSpots[0].reason.includes("does not prove a sequence"));
});

test("evidence lock does not discard a colon-led first fact as a heading", () => {
  const pack = buildEvidenceLockedPack([{
    sourceId: "S1",
    extractedText: "Reactants: carbon dioxide and water\nProducts: glucose and oxygen",
    confidence: "high",
    unclearText: [],
  }]);

  assert.equal(pack.concepts.length, 2);
  assert.equal(pack.concepts[0].term, "Reactants");
  assert.equal(pack.concepts[0].explanation, "Reactants: carbon dioxide and water");
});
