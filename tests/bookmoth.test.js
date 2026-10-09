import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEvidenceLockedPack,
  buildSourceLockedDeepLesson,
  findUnsupportedLessonVocabulary,
  learningPackToMarkdown,
  normalizeLearningPack,
  sampleLearningPack,
  validateDeepLessons,
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

test("normalization preserves complete translations and traceable research links", () => {
  const pack = normalizeLearningPack({
    sources: [{
      sourceId: "S1",
      sourceType: "upload",
      sourceTitle: "课堂笔记.png",
      extractedText: "光合作用把光能转化为化学能。",
      confidence: "high",
      unclearText: [],
      detectedLanguage: "Simplified Chinese",
      translatedText: "Photosynthesis converts light energy into chemical energy.",
      translationLanguage: "English",
      translationConfidence: "high",
    }],
    languageProfile: {
      detectedLanguages: ["Simplified Chinese"],
      outputLanguage: "English",
      fullSourceTranslation: true,
      translationNotice: "Machine translation requires review.",
    },
    researchProfile: { requested: true, performed: true, sourceCount: 1, note: "Cross-checked." },
    researchSources: [{ id: "R1", title: "Primary source", url: "https://example.edu/source", publisher: "example.edu" }],
  });

  assert.equal(pack.sources[0].translatedText, "Photosynthesis converts light energy into chemical energy.");
  assert.equal(pack.languageProfile.fullSourceTranslation, true);
  assert.equal(pack.researchProfile.performed, true);
  assert.equal(pack.researchSources[0].url, "https://example.edu/source");
  const markdown = learningPackToMarkdown(pack);
  assert.match(markdown, /Full English translation/);
  assert.match(markdown, /\[Primary source\]\(https:\/\/example\.edu\/source\)/);
});

test("sample pack contains all public output types", () => {
  const pack = sampleLearningPack();
  assert.ok(pack.concepts.length > 0);
  assert.ok(pack.deepLessons.length > 0);
  assert.ok(pack.deepLessons.every((lesson) => lesson.steps.length >= 3));
  assert.ok(pack.deepLessons.every((lesson) => lesson.commonMistakes.length >= 2));
  assert.equal(pack.evidenceReview.status, "source-checked");
  assert.equal(validateDeepLessons(pack.deepLessons, pack.sources).accepted.length, pack.deepLessons.length);
  assert.equal(validateDeepLessons(
    pack.deepLessons,
    pack.sources,
    null,
    { requireSourceVocabulary: true },
  ).accepted.length, pack.deepLessons.length);
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
  assert.match(markdown, /## Deep lessons/);
  assert.match(markdown, /#### Step by step/);
  assert.match(markdown, /#### Common mistakes/);
  assert.match(markdown, /Evidence:/);
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
  assert.equal(pack.deepLessons.length, 2);
  assert.equal(pack.deepLessons[0].evidenceQuotes[0], pack.concepts[0].explanation);
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

test("deep lesson gate accepts exact evidence and rejects unsupported quotes", () => {
  const sources = [{
    sourceId: "S1",
    extractedText: "Faster: less light, freezes motion.",
  }];
  const validLesson = {
    term: "Faster shutter",
    learningObjective: "Explain the stated light and motion result.",
    directAnswer: "A faster setting uses less light and freezes motion.",
    explanation: "The source connects the faster setting with two outcomes: less light and frozen motion.",
    steps: [
      { title: "Read", explanation: "Locate the faster-setting statement in the source." },
      { title: "Connect", explanation: "Link less light with the stated frozen-motion result." },
    ],
    whyItMatters: "The two outcomes must be considered together.",
    example: "Choose the faster setting when frozen motion is the stated priority.",
    commonMistakes: [{
      mistake: "Remembering only one outcome.",
      correction: "Recall both less light and frozen motion.",
    }],
    check: {
      question: "What two outcomes are stated?",
      hint: "One concerns light and one concerns motion.",
      answer: "Less light and frozen motion.",
    },
    sourceIds: ["S1"],
    evidenceQuotes: ["Faster: less light, freezes motion."],
    verification: "needs-review",
  };
  const review = [{ term: "Faster shutter", supported: true, unsupportedClaims: [] }];
  const valid = validateDeepLessons([validLesson], sources, review);
  assert.equal(valid.accepted.length, 1);
  assert.equal(valid.accepted[0].verification, "source-checked");

  const invalid = validateDeepLessons([
    { ...validLesson, evidenceQuotes: ["A fast shutter always produces perfect sharpness."] },
  ], sources, review);
  assert.equal(invalid.accepted.length, 0);
  assert.equal(invalid.rejectedCount, 1);
  assert.equal(invalid.issues[0].quotesValid, false);
});

test("source-lock recovery keeps detailed structure without unsupported subject vocabulary", () => {
  const sources = [{
    sourceId: "S1",
    extractedText: [
      "Aperture",
      "Wider: more light, shallower depth.",
      "Narrower: less light, deeper depth.",
    ].join("\n"),
  }];
  const locked = buildSourceLockedDeepLesson({
    term: "Aperture",
    sourceIds: ["S1"],
    evidenceQuotes: [
      "Wider: more light, shallower depth.",
      "Narrower: less light, deeper depth.",
    ],
  }, sources);

  assert.ok(locked);
  assert.equal(locked.steps.length, 5);
  assert.equal(locked.commonMistakes.length, 2);
  assert.deepEqual(findUnsupportedLessonVocabulary(locked, sources), []);
  assert.equal(validateDeepLessons(
    [locked],
    sources,
    null,
    { requireSourceVocabulary: true },
  ).accepted.length, 1);

  const unsafe = {
    ...locked,
    explanation: `${locked.explanation} A camera sensor guarantees proper exposure.`,
  };
  const unsupported = findUnsupportedLessonVocabulary(unsafe, sources);
  assert.ok(unsupported.includes("camera"));
  assert.ok(unsupported.includes("sensor"));
  const rejected = validateDeepLessons(
    [unsafe],
    sources,
    null,
    { requireSourceVocabulary: true },
  );
  assert.equal(rejected.accepted.length, 0);
  assert.equal(rejected.issues[0].vocabularyValid, false);
});
