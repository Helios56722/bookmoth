import test from "node:test";
import assert from "node:assert/strict";
import {
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
