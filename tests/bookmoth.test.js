import test from "node:test";
import assert from "node:assert/strict";
import {
  applySubjectQualityGate,
  auditLearningPackConsistency,
  buildEvidenceLockedPack,
  buildVerifiedActivePassiveLesson,
  buildVerifiedBasicMathLesson,
  buildSourceLockedDeepLesson,
  buildVerifiedLinearEquationLesson,
  buildVerifiedPythonAccumulatorLesson,
  buildVerifiedScienceCalculationLesson,
  findUnsupportedLessonVocabulary,
  inferSubjectProfile,
  learningPackToMarkdown,
  normalizeLearningPack,
  sampleLearningPack,
  solveSupportedLinearEquation,
  validateDeepLessons,
  validateSources,
} from "../src/lib/bookmoth.js";
import {
  fetchOpenRouterFreeModels,
  openRouterModelRequest,
  requestOpenRouterChatCompletion,
  selectOpenRouterFreeModels,
} from "../src/lib/openrouter.js";

function freeVisionModel(id, overrides = {}) {
  return {
    id,
    architecture: { input_modalities: ["text", "image"] },
    supported_parameters: ["temperature", "structured_outputs"],
    pricing: { prompt: "0", completion: "0" },
    expiration_date: null,
    ...overrides,
  };
}

test("OpenRouter fallback catalog keeps only active free vision models with structured output", () => {
  const models = [
    freeVisionModel("best:free"),
    freeVisionModel("preferred:free"),
    freeVisionModel("paid/vision:free", { pricing: { prompt: "0.000001", completion: "0" } }),
    freeVisionModel("text-only:free", { architecture: { input_modalities: ["text"] } }),
    freeVisionModel("no-json:free", { supported_parameters: ["temperature"] }),
    freeVisionModel("expired:free", { expiration_date: "2026-01-01T00:00:00Z" }),
  ];

  assert.deepEqual(
    selectOpenRouterFreeModels(models, "preferred:free", Date.parse("2026-10-29T12:00:00Z")),
    ["preferred:free", "best:free", "openrouter/free"],
  );
});

test("OpenRouter model list always retains a dynamic free router after ranked fallbacks", () => {
  const models = Array.from({ length: 8 }, (_, index) => freeVisionModel(`model-${index}:free`));
  const candidates = selectOpenRouterFreeModels(models, "model-5:free", Date.parse("2026-10-29T12:00:00Z"));

  assert.deepEqual(candidates, [
    "model-5:free",
    "model-0:free",
    "model-1:free",
    "model-2:free",
    "openrouter/free",
  ]);
});

test("OpenRouter request encodes a native model fallback chain and reports the serving model", async () => {
  assert.deepEqual(openRouterModelRequest(["primary:free", "backup:free", "openrouter/free"]), {
    model: "primary:free",
    models: ["backup:free", "openrouter/free"],
  });
  let requestBody;
  let requestHeaders;
  const result = await requestOpenRouterChatCompletion({
    apiKey: "test-key",
    modelCandidates: ["primary:free", "backup:free", "openrouter/free"],
    payload: { messages: [{ role: "user", content: "Read this source." }] },
    fetchImpl: async (_url, options) => {
      requestHeaders = options.headers;
      requestBody = JSON.parse(options.body);
      return Response.json({ model: "backup:free", choices: [{ message: { content: "ok" } }] });
    },
  });

  assert.equal(requestHeaders.Authorization, "Bearer test-key");
  assert.equal(requestBody.model, "primary:free");
  assert.deepEqual(requestBody.models, ["backup:free", "openrouter/free"]);
  assert.equal(result.model, "backup:free");
});

test("OpenRouter model catalog uses the authenticated, capability-filtered index", async () => {
  let requestedUrl;
  let authHeader;
  const result = await fetchOpenRouterFreeModels("private-test-key", async (url, options) => {
    requestedUrl = new URL(url);
    authHeader = options.headers.Authorization;
    return Response.json({ data: [freeVisionModel("vision:free")] });
  });

  assert.equal(authHeader, "Bearer private-test-key");
  assert.equal(requestedUrl.searchParams.get("input_modalities"), "image");
  assert.equal(requestedUrl.searchParams.get("supported_parameters"), "structured_outputs");
  assert.equal(requestedUrl.searchParams.get("sort"), "intelligence-high-to-low");
  assert.equal(requestedUrl.searchParams.get("max_price"), "0");
  assert.equal(result[0].id, "vision:free");
});

test("OpenRouter keeps provider errors inspectable for retry messaging", async () => {
  await assert.rejects(
    requestOpenRouterChatCompletion({
      apiKey: "test-key",
      modelCandidates: ["primary:free", "openrouter/free"],
      payload: { messages: [] },
      fetchImpl: async () => Response.json({ error: { message: "Rate limit reached" } }, { status: 429 }),
    }),
    (error) => error.status === 429 && error.message === "Rate limit reached",
  );
});

test("OpenRouter network failures return a retryable service error without leaking credentials", async () => {
  await assert.rejects(
    requestOpenRouterChatCompletion({
      apiKey: "private-test-key",
      modelCandidates: ["primary:free", "openrouter/free"],
      payload: { messages: [] },
      fetchImpl: async () => { throw new TypeError("network offline"); },
    }),
    (error) => error.status === 503
      && error.message.includes("could not reach OpenRouter")
      && !error.message.includes("private-test-key"),
  );
});

test("source validation rejects an empty set", () => {
  assert.equal(validateSources([]), "Add at least one screenshot or image.");
});

test("source validation accepts a valid PNG data URL", () => {
  assert.equal(validateSources([{ type: "image/png", dataUrl: "data:image/png;base64,AAAA" }]), null);
});

test("source validation rejects mismatched image metadata and unsafe content", () => {
  assert.equal(
    validateSources([{ type: "image/png", dataUrl: "data:image/jpeg;base64,AAAA" }]),
    "One or more image files could not be read safely.",
  );
  assert.equal(
    validateSources([{ type: "image/svg+xml", dataUrl: "data:image/svg+xml;base64,AAAA" }]),
    "Bookmoth accepts PNG, JPG, and WebP images.",
  );
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

test("normalization keeps evidence formatting while cleaning display labels", () => {
  const pack = normalizeLearningPack({
    title: "Manual\n  exposure",
    sources: [{ sourceTitle: "Class\n notes", extractedText: "Aperture\nWider: more light." }],
    deepLessons: [{ term: "Aperture\nLens opening\nWider", evidenceQuotes: ["Aperture\nWider: more light."] }],
  });
  assert.equal(pack.title, "Manual exposure");
  assert.equal(pack.sources[0].sourceTitle, "Class notes");
  assert.equal(pack.deepLessons[0].term, "Aperture Lens opening Wider");
  assert.equal(pack.sources[0].extractedText, "Aperture\nWider: more light.");
  assert.equal(pack.deepLessons[0].evidenceQuotes[0], "Aperture\nWider: more light.");
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

test("normalization drops non-web research links", () => {
  const pack = normalizeLearningPack({
    researchSources: [
      { id: "R1", title: "Trusted", url: "https://example.edu/source" },
      { id: "R2", title: "Unsafe", url: "javascript:alert(1)" },
    ],
  });
  assert.deepEqual(pack.researchSources.map((source) => source.id), ["R1"]);
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
  assert.deepEqual(pack.flashcards.map((card) => card.sourceIds), [["S1"], ["S1"], ["S1"]]);
  assert.deepEqual(pack.practice.map((item) => item.sourceIds), [["S1"], ["S1"], ["S1"]]);
  assert.equal(pack.practice.length, 3);
  assert.match(pack.practice[0].question, /deeper depth/i);
  assert.match(pack.practice[1].question, /freeze motion/i);
  assert.match(pack.practice[2].question, /less visible noise/i);
  assert.ok(pack.deepLessons.every((lesson) => lesson.steps.length >= 4));
  assert.ok(pack.flashcards.every((card) => !/source point/i.test(card.front)));
  assert.ok(pack.practice.every((item) => !/source point/i.test(item.question)));
  assert.ok(pack.collage.callouts.length > 0);
  assert.equal(pack.trailMap.glowPoints.length, 3);
  assert.ok(pack.trailMap.glowPoints.every((point) => point.label.includes("follow the tradeoff")));
  assert.ok(pack.trailMap.threads.every((thread) => thread.fromId && thread.toId));
  assert.ok(pack.trailMap.blindSpots.length > 0);
  assert.ok(pack.trailMap.recallLoop.length > 0);
  assert.equal(pack.consistencyReview.status, "passed");
  assert.equal(auditLearningPackConsistency(pack).status, "passed");
  assert.match(pack.consistencyReview.note, /not independent factual correctness/i);
});

test("pack-wide consistency audit catches broken citations and research totals", () => {
  const pack = sampleLearningPack();
  pack.deepLessons[0].sourceIds = ["S404"];
  pack.researchProfile = { requested: true, performed: true, sourceCount: 3, note: "Cross-checked." };
  pack.researchSources = [{ id: "R1", title: "One source", url: "https://example.edu/one" }];

  const audit = auditLearningPackConsistency(pack);
  assert.equal(audit.status, "needs-review");
  assert.deepEqual(audit.invalidSourceIds, ["S404"]);
  assert.equal(audit.checks.referencesValid, false);
  assert.equal(audit.checks.researchCountMatches, false);
  assert.match(audit.note, /does not independently verify factual correctness/i);
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

  const conciseValid = validateDeepLessons([{
    ...validLesson,
    directAnswer: "Less light.",
    check: { ...validLesson.check, answer: "Less light." },
  }], sources, review);
  assert.equal(conciseValid.accepted.length, 1, "correct concise answers must not fail a character-count gate");

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

  const multiline = buildSourceLockedDeepLesson({
    term: "Aperture\nLens opening\nWider",
    sourceIds: ["S1"],
    evidenceQuotes: ["Aperture\nWider: more light, shallower depth."],
  }, sources);
  assert.equal(multiline.term, "Aperture");

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

test("subject routing selects discipline-specific teaching methods", () => {
  const cases = [
    ["Solve 4x - 7 = 21 and show the algebra.", "mathematics", "Equation solving"],
    ["Identify the subject, predicate, adjective, and verb in this sentence.", "language-arts", "Grammar and sentence analysis"],
    ["Explain how photosynthesis converts light energy into chemical energy.", "science", "Process and mechanism explanation"],
    ["Build a chronology of the treaty signed in 1919 and explain its effects.", "history", "Historical cause and consequence"],
    ["Translate this Spanish paragraph and explain the verb conjugation.", "world-language", "Translation and language structure"],
    ["Physics: use F = m × a with mass 6 kg and acceleration 2 m/s^2.", "science", "Calculation and scientific reasoning"],
    ["Explain why binary 1011 represents eleven using powers of two.", "computing", "Computational representation"],
  ];

  for (const [text, domain, taskType] of cases) {
    const profile = inferSubjectProfile([{ extractedText: text }]);
    assert.equal(profile.domain, domain, text);
    assert.equal(profile.taskType, taskType, text);
    assert.ok(profile.guidance.length > 40);
  }
});

test("subject routing prioritizes translation and avoids treating musical time signatures as arithmetic", () => {
  assert.equal(inferSubjectProfile([], "Beginner Japanese reading practice", "Translate this sentence into English.").domain, "world-language");
  assert.equal(inferSubjectProfile([], "Music theory: note values", "Compare whole, half, and quarter notes in 4/4 time.").domain, "general");
});

test("world-language quality gate flags an explicit translation request that only repeats its source", () => {
  const source = {
    sourceId: "S1",
    extractedText: "Sentence: 毎朝、水を飲みます。 Translate the sentence into English.",
    confidence: "high",
  };
  const base = buildEvidenceLockedPack([source], "Translate the sentence into English.");
  const gated = normalizeLearningPack(applySubjectQualityGate(base, [source], "Japanese", "Translate the sentence into English."));
  assert.equal(gated.subjectProfile.domain, "world-language");
  assert.equal(gated.subjectProfile.answerVerification.status, "needs-review");
  assert.match(gated.subjectProfile.answerVerification.note, /instead of showing a clear translation/);
  assert.ok(gated.cautions.some((item) => /translation was not completed/i.test(item)));
});

test("bounded deterministic math solvers explain and verify fractions and rectangle measures", () => {
  const fraction = buildVerifiedBasicMathLesson([{ sourceId: "S1", extractedText: "Solve 2/3 + 1/6. Rewrite the fractions with a common denominator." }]);
  assert.equal(fraction.verification.status, "verified");
  assert.match(fraction.lesson.explanation, /4\/6 \+ 1\/6 = 5\/6/);

  const rectangle = buildVerifiedBasicMathLesson([{ sourceId: "S1", extractedText: "A rectangle is 8 cm long and 5 cm wide. Find its area and perimeter." }]);
  assert.equal(rectangle.verification.expectedAnswer, "Area = 40 cm²; perimeter = 26 cm");
});

test("bounded science solvers independently check common formula calculations and units", () => {
  const cases = [
    ["Density = mass / volume\nA sample has a mass of 24 g and a volume of 8 cm^3.", "3 g/cm³"],
    ["Molarity = moles of solute / liters of solution.\nA solution contains 0.5 mol of solute in 2 L of solution.", "0.25 mol/L"],
    ["Average speed = distance / time.\nA cyclist travels 150 m in 30 s.", "5 m/s"],
    ["Newton's second law: F = m × a\nMass = 6 kg\nAcceleration = 2 m/s^2", "12 N"],
  ];
  for (const [extractedText, expectedAnswer] of cases) {
    const result = buildVerifiedScienceCalculationLesson([{ sourceId: "S1", extractedText }]);
    assert.equal(result.verification.status, "verified", extractedText);
    assert.equal(result.verification.expectedAnswer, expectedAnswer, extractedText);
  }
});

test("bounded Python loop tracer and regular past-tense passive transform verify supported patterns", () => {
  const code = buildVerifiedPythonAccumulatorLesson([{
    sourceId: "S1",
    extractedText: "total = 0\nfor value in [2, 3, 4]:\n    total += value\nprint(total)",
  }]);
  assert.equal(code.verification.expectedAnswer, "The program prints 9.");
  assert.match(code.lesson.explanation, /2, then 5, then 9/);

  const grammar = buildVerifiedActivePassiveLesson([{
    sourceId: "S1",
    extractedText: "Active sentence: The librarian cataloged the new books.\nRewrite it in passive voice.",
  }]);
  assert.equal(grammar.verification.expectedAnswer, "The new books were cataloged by the librarian.");
});

test("deterministic linear solver handles equivalent common equation forms", () => {
  const cases = [
    ["Solve 4x - 7 = 21.", 7],
    ["Solve 3(x + 2) = 18.", 4],
    ["Find x: x / 4 + 2 = 5.", 12],
    ["Solve 2x + 3 = x + 9.", 6],
    ["Solve -2x + 4 = 10.", -3],
  ];

  for (const [problem, expected] of cases) {
    const result = solveSupportedLinearEquation(problem);
    assert.ok(result, problem);
    assert.equal(result.solution, expected, problem);
    assert.ok(Math.abs((result.left.a * expected + result.left.b) - (result.right.a * expected + result.right.b)) < 1e-10);
  }
  assert.equal(solveSupportedLinearEquation("Solve x^2 - 5x + 6 = 0."), null);
});

test("linear solver preserves a leading variable and passes generated substitution checks", () => {
  const promptCases = [
    ["Solve x - 16 = 9x + 27.", -43 / 8],
    ["Solve x + 4 = -7.", -11],
    ["Find x: x + 11 = -8x + 8.", -1 / 3],
    ["Solve for x: 2x + 3 = x + 9.", 6],
  ];
  for (const [problem, expected] of promptCases) {
    const result = solveSupportedLinearEquation(problem);
    assert.ok(result, problem);
    assert.ok(Math.abs(result.solution - expected) < 1e-9, problem);
    assert.ok(Math.abs(result.left.a * result.solution + result.left.b - (result.right.a * result.solution + result.right.b)) < 1e-9, problem);
  }

  let seed = 73917;
  const random = (limit) => {
    seed = (seed * 48271) % 2147483647;
    return seed % limit;
  };
  const term = (coefficient, constant) => {
    let result = coefficient === 0 ? "" : `${coefficient === 1 ? "" : coefficient === -1 ? "-" : coefficient}x`;
    if (constant !== 0) result += `${constant > 0 && result ? "+" : ""}${constant}`;
    return result || "0";
  };

  let checked = 0;
  for (let index = 0; index < 500; index += 1) {
    const leftCoefficient = random(31) - 15;
    const rightCoefficient = random(31) - 15;
    if (leftCoefficient === rightCoefficient) continue;
    const leftConstant = random(61) - 30;
    const rightConstant = random(61) - 30;
    const problem = `Solve ${term(leftCoefficient, leftConstant)} = ${term(rightCoefficient, rightConstant)}.`;
    const expected = (rightConstant - leftConstant) / (leftCoefficient - rightCoefficient);
    const result = solveSupportedLinearEquation(problem);
    assert.ok(result, problem);
    assert.ok(Math.abs(result.solution - expected) < 1e-9, problem);
    assert.ok(Math.abs(result.left.a * result.solution + result.left.b - (result.right.a * result.solution + result.right.b)) < 1e-9, problem);
    checked += 1;
  }
  assert.ok(checked > 450, `Expected broad generated coverage, checked ${checked} equations.`);
});

test("verified math lesson shows the equation, derivation, answer, and substitution check", () => {
  const sources = [{
    sourceId: "S1",
    extractedText: "Algebra practice\nSolve 4x - 7 = 21. Show every step.",
    confidence: "high",
  }];
  const verified = buildVerifiedLinearEquationLesson(sources);
  assert.ok(verified);
  assert.equal(verified.lesson.directAnswer, "x = 7");
  assert.equal(verified.lesson.steps.length, 4);
  assert.match(verified.lesson.steps[3].explanation, /21 = 21/);
  assert.equal(verified.verification.status, "verified");
  assert.equal(verified.verification.expectedAnswer, "x = 7");
});

test("verified math answers preserve simple exact fractions and label rounded decimals", () => {
  const oneThird = buildVerifiedLinearEquationLesson([{
    sourceId: "S1",
    extractedText: "Solve 3x = 1.",
    confidence: "high",
  }]);
  assert.equal(oneThird.lesson.directAnswer, "x = 1/3");
  assert.match(oneThird.lesson.steps[3].explanation, /1 = 1/);

  const negativeFraction = buildVerifiedLinearEquationLesson([{
    sourceId: "S1",
    extractedText: "Solve 3x = -2.",
    confidence: "high",
  }]);
  assert.equal(negativeFraction.lesson.directAnswer, "x = -2/3");

  const rounded = buildVerifiedLinearEquationLesson([{
    sourceId: "S1",
    extractedText: "Solve 10001x = 1.",
    confidence: "high",
  }]);
  assert.equal(rounded.lesson.directAnswer, "x = approximately 0.00009999");
});

test("subject quality gate replaces a model math answer with deterministic verified work", () => {
  const sources = [{ sourceId: "S1", extractedText: "Solve 2x + 3 = x + 9.", confidence: "high" }];
  const base = buildEvidenceLockedPack(sources, "Solve and check the equation.");
  base.deepLessons[0].directAnswer = "x = 99";
  const gated = normalizeLearningPack(applySubjectQualityGate(base, sources, "Algebra", "Solve the equation"));
  assert.equal(gated.subjectProfile.domain, "mathematics");
  assert.equal(gated.subjectProfile.answerVerification.status, "verified");
  assert.equal(gated.deepLessons[0].directAnswer, "x = 6");
  assert.equal(gated.evidenceReview.acceptedLessons, 1);
  gated.consistencyReview = auditLearningPackConsistency(gated);
  assert.equal(gated.consistencyReview.status, "passed");
  assert.equal(gated.consistencyReview.checks.subjectAnalysisComplete, true);
});

test("unsupported math types are labeled for review instead of falsely verified", () => {
  const sources = [{ sourceId: "S1", extractedText: "Solve x^2 - 5x + 6 = 0.", confidence: "high" }];
  const base = buildEvidenceLockedPack(sources, "Solve the quadratic.");
  const gated = normalizeLearningPack(applySubjectQualityGate(base, sources, "Quadratic algebra", "Solve the equation"));
  assert.equal(gated.subjectProfile.domain, "mathematics");
  assert.equal(gated.subjectProfile.answerVerification.status, "needs-review");
  assert.match(gated.subjectProfile.answerVerification.note, /outside Bookmoth's current deterministic/);
});
