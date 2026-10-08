export const MAX_SOURCES = 8;
export const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function estimateDataUrlBytes(dataUrl = "") {
  const encoded = dataUrl.split(",")[1] || "";
  return Math.floor((encoded.length * 3) / 4);
}

export function validateSources(sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "Add at least one screenshot or image.";
  }
  if (sources.length > MAX_SOURCES) {
    return `Use no more than ${MAX_SOURCES} images in one learning pack.`;
  }

  let totalBytes = 0;
  for (const source of sources) {
    if (!ACCEPTED_IMAGE_TYPES.includes(source.type)) {
      return "Bookmoth accepts PNG, JPG, and WebP images.";
    }
    if (!source.dataUrl?.startsWith(`data:${source.type};base64,`)) {
      return "One or more image files could not be read safely.";
    }
    totalBytes += estimateDataUrlBytes(source.dataUrl);
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    return "This set is over 18 MB. Remove an image or use smaller screenshots.";
  }
  return null;
}

export function normalizeLearningPack(value = {}) {
  const safeArray = (input) => (Array.isArray(input) ? input : []);
  const safeString = (input, fallback = "") =>
    typeof input === "string" && input.trim() ? input.trim() : fallback;

  return {
    title: safeString(value.title, "Untitled learning pack"),
    overview: safeString(value.overview, "No overview was generated."),
    sources: safeArray(value.sources).map((source, index) => ({
      sourceId: safeString(source?.sourceId, `S${index + 1}`),
      extractedText: safeString(source?.extractedText, "No readable text found."),
      confidence: ["high", "medium", "low"].includes(source?.confidence)
        ? source.confidence
        : "low",
      unclearText: safeArray(source?.unclearText).map((item) => safeString(item)).filter(Boolean),
    })),
    concepts: safeArray(value.concepts).map((concept) => ({
      term: safeString(concept?.term, "Concept"),
      explanation: safeString(concept?.explanation, "Explanation unavailable."),
      sourceIds: safeArray(concept?.sourceIds).map((item) => safeString(item)).filter(Boolean),
    })),
    depthSummary: safeString(
      value.depthSummary,
      "Each lesson separates the direct source answer from the explanation, practice, and evidence used to support it.",
    ),
    deepLessons: safeArray(value.deepLessons).map((lesson, lessonIndex) => ({
      term: safeString(lesson?.term, `Lesson ${lessonIndex + 1}`),
      learningObjective: safeString(lesson?.learningObjective, "Explain this idea using the supplied source."),
      directAnswer: safeString(lesson?.directAnswer, "The source does not provide a direct answer."),
      explanation: safeString(lesson?.explanation, "The source does not provide enough detail for a reliable explanation."),
      steps: safeArray(lesson?.steps).map((step, stepIndex) => ({
        title: safeString(step?.title, `Step ${stepIndex + 1}`),
        explanation: safeString(step?.explanation, "Review the cited source statement."),
      })),
      whyItMatters: safeString(lesson?.whyItMatters, "This point supports the learner's stated goal."),
      example: safeString(lesson?.example, "No source-supported example was available."),
      commonMistakes: safeArray(lesson?.commonMistakes).map((mistake) => ({
        mistake: safeString(mistake?.mistake, "Adding a detail that the source does not establish."),
        correction: safeString(mistake?.correction, "Return to the cited source and keep only supported details."),
      })),
      check: {
        question: safeString(lesson?.check?.question, "What does the cited source state?"),
        hint: safeString(lesson?.check?.hint, "Answer before reopening the evidence."),
        answer: safeString(lesson?.check?.answer, "Review the cited evidence quote."),
      },
      sourceIds: safeArray(lesson?.sourceIds).map((item) => safeString(item)).filter(Boolean),
      evidenceQuotes: safeArray(lesson?.evidenceQuotes).map((item) => safeString(item)).filter(Boolean),
      verification: ["source-checked", "needs-review"].includes(lesson?.verification)
        ? lesson.verification
        : "needs-review",
    })),
    evidenceReview: {
      status: ["source-checked", "partial", "needs-review"].includes(value.evidenceReview?.status)
        ? value.evidenceReview.status
        : "needs-review",
      acceptedLessons: Number.isInteger(value.evidenceReview?.acceptedLessons)
        ? value.evidenceReview.acceptedLessons
        : 0,
      rejectedLessons: Number.isInteger(value.evidenceReview?.rejectedLessons)
        ? value.evidenceReview.rejectedLessons
        : 0,
      note: safeString(
        value.evidenceReview?.note,
        "Verify the explanation against the supplied sources before relying on it.",
      ),
    },
    trailMap: {
      glowPoints: safeArray(value.trailMap?.glowPoints).map((point, index) => ({
        id: safeString(point?.id, `G${index + 1}`),
        label: safeString(point?.label, "Key idea"),
        whyItMatters: safeString(point?.whyItMatters, "Review this idea in its source context."),
        sourceIds: safeArray(point?.sourceIds).map((item) => safeString(item)).filter(Boolean),
      })),
      threads: safeArray(value.trailMap?.threads).map((thread) => ({
        fromId: safeString(thread?.fromId, "G1"),
        toId: safeString(thread?.toId, "G1"),
        relationship: safeString(thread?.relationship, "These ideas are related."),
      })),
      blindSpots: safeArray(value.trailMap?.blindSpots).map((spot) => ({
        question: safeString(spot?.question, "What still needs verification?"),
        reason: safeString(spot?.reason, "The supplied sources do not fully establish this detail."),
        sourceIds: safeArray(spot?.sourceIds).map((item) => safeString(item)).filter(Boolean),
      })),
      recallLoop: safeArray(value.trailMap?.recallLoop).map((step) => safeString(step)).filter(Boolean),
    },
    reportSections: safeArray(value.reportSections).map((section) => ({
      heading: safeString(section?.heading, "Finding"),
      body: safeString(section?.body, "No details generated."),
      sourceIds: safeArray(section?.sourceIds).map((item) => safeString(item)).filter(Boolean),
    })),
    flashcards: safeArray(value.flashcards).map((card) => ({
      front: safeString(card?.front, "Question unavailable."),
      back: safeString(card?.back, "Answer unavailable."),
      sourceIds: safeArray(card?.sourceIds).map((item) => safeString(item)).filter(Boolean),
    })),
    practice: safeArray(value.practice).map((item) => ({
      question: safeString(item?.question, "Practice question unavailable."),
      hint: safeString(item?.hint, "Review the cited source."),
      answer: safeString(item?.answer, "Answer unavailable."),
      sourceIds: safeArray(item?.sourceIds).map((sourceId) => safeString(sourceId)).filter(Boolean),
    })),
    collage: {
      title: safeString(value.collage?.title, "Visual review board"),
      caption: safeString(value.collage?.caption, "A visual index of your source material."),
      callouts: safeArray(value.collage?.callouts).map((callout) => ({
        text: safeString(callout?.text, "Review this source."),
        sourceIds: safeArray(callout?.sourceIds).map((item) => safeString(item)).filter(Boolean),
      })),
    },
    reviewPlan: safeArray(value.reviewPlan).map((item) => safeString(item)).filter(Boolean),
    cautions: safeArray(value.cautions).map((item) => safeString(item)).filter(Boolean),
  };
}

function sourceLines(text = "") {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•●▪◦]+|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function looksLikeHeading(line = "", lineCount = 0) {
  return lineCount > 1
    && line.length <= 90
    && !line.includes(":")
    && !/\b(?:is|are|was|were|uses?|produces?|converts?|captures?|contains?|includes?|requires?|means?|refers?\s+to)\b/i.test(line)
    && !/[.!?;]$/.test(line);
}

function exactLabel(line = "", index = 0) {
  const colonIndex = line.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 48) return line.slice(0, colonIndex).trim();

  const subject = line.match(
    /^(.{2,55}?)\s+(?:is|are|was|were|uses?|produces?|converts?|captures?|contains?|includes?|requires?|means?|refers?\s+to)\b/i,
  )?.[1]?.trim();
  if (subject) return subject;

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= 5) return line.replace(/[.!?]+$/, "");
  return `Source point ${index + 1}`;
}

function normalizedEvidenceText(value = "") {
  return value
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const TEACHING_VOCABULARY = new Set([
  "a", "about", "above", "according", "action", "add", "adding", "again", "against", "all", "also",
  "an", "and", "another", "answer", "any", "apply", "are", "as", "associated", "at", "be", "before", "below",
  "between", "both", "by", "check", "cited", "clearly", "compare", "comparison", "complete", "concept",
  "connect", "connected", "consider", "contrast", "correct", "correction", "describe", "detail", "direct", "do", "does",
  "each", "either", "establish", "evidence", "exact", "exactly", "example", "explain", "explanation",
  "fact", "find", "first", "focus", "following", "for", "from", "given", "goal", "has", "have", "help", "helps", "how", "idea",
  "identify", "if", "in", "information", "instead", "interpret", "into", "key", "label", "learn", "learning",
  "is", "it", "its", "lesson", "likely", "link", "linked", "look", "matter", "meaning", "means", "mistake", "not", "note",
  "notice", "objective", "of", "on", "only", "opposite", "or", "order", "own", "pair", "paired", "pattern",
  "point", "present", "question", "quote", "rather", "read", "recall", "relationship", "remember", "remove", "repeat",
  "response", "result", "review", "reverse", "same", "second", "select", "sentence", "source", "state",
  "statement", "step", "study", "supported", "term", "than", "that", "the", "their", "them", "then", "these",
  "they", "think", "thinking", "this", "those", "through", "to", "together", "try", "two", "understand",
  "unsupported", "use", "using", "verify", "was", "were", "what", "when", "which", "while", "why", "will",
  "with", "without", "word", "wording", "would", "you", "your",
  "actually", "adjust", "allow", "always", "assume", "become", "believe", "can", "change", "changed", "choose", "configure",
  "decide", "display", "effect", "eliminate", "function", "happen", "increase", "decrease", "observe", "off",
  "recognize", "require", "set", "setting", "trade", "value",
  "cause", "easy", "every", "extra", "give", "hide", "keep", "locate", "make", "material", "mechanism",
  "method", "mix", "open", "original", "out", "outside", "purpose", "quoted", "relevant", "reopen", "return",
  "reversing", "say", "subject", "supplied", "unless", "view",
]);

function vocabularyStem(token = "") {
  let value = token.normalize("NFKC").toLowerCase().replace(/^['’]+|['’]+$/g, "");
  if (value.length > 5 && value.endsWith("ies")) value = `${value.slice(0, -3)}y`;
  else if (value.length > 5 && value.endsWith("ing")) value = value.slice(0, -3);
  else if (value.length > 4 && value.endsWith("ed")) value = value.slice(0, -2);
  else if (value.length > 3 && value.endsWith("s") && !value.endsWith("ss")) value = value.slice(0, -1);
  return value;
}

function vocabularyTokens(value = "") {
  return [...value.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu)]
    .map((match) => vocabularyStem(match[0]))
    .filter(Boolean);
}

export function findUnsupportedLessonVocabulary(lesson = {}, sources = []) {
  const sourceVocabulary = new Set(
    sources.flatMap((source) => vocabularyTokens(source?.extractedText || "")),
  );
  const allowedTeachingVocabulary = new Set(
    [...TEACHING_VOCABULARY].map(vocabularyStem),
  );
  const lessonText = [
    lesson.term,
    lesson.learningObjective,
    lesson.directAnswer,
    lesson.explanation,
    ...(Array.isArray(lesson.steps)
      ? lesson.steps.flatMap((step) => [step?.title, step?.explanation])
      : []),
    lesson.whyItMatters,
    lesson.example,
    ...(Array.isArray(lesson.commonMistakes)
      ? lesson.commonMistakes.flatMap((mistake) => [mistake?.mistake, mistake?.correction])
      : []),
    lesson.check?.question,
    lesson.check?.hint,
    lesson.check?.answer,
  ].filter((item) => typeof item === "string").join(" ");

  return [...new Set(vocabularyTokens(lessonText).filter((token) =>
    !/^(?:s)?\d+$/.test(token)
      && !sourceVocabulary.has(token)
      && !allowedTeachingVocabulary.has(token),
  ))].sort();
}

function fallbackDeepLesson(point, index = 0) {
  return {
    term: point.label,
    learningObjective: `Explain what the supplied source states about ${point.label}.`,
    directAnswer: point.text,
    explanation: point.text,
    steps: [
      {
        title: "Locate the source statement",
        explanation: `Find ${point.sourceId} and read the cited wording before interpreting it.`,
      },
      {
        title: "Identify the key point",
        explanation: point.text,
      },
      {
        title: "Check your explanation",
        explanation: "Compare your own wording with the evidence quote and remove any detail the source does not establish.",
      },
    ],
    whyItMatters: "A source-first explanation helps you learn the supplied material without blending in unsupported details.",
    example: `Cover the answer and explain “${point.label}” in your own words, then compare it with the evidence quote.`,
    commonMistakes: [
      {
        mistake: "Adding a fact that sounds likely but is not present in the source.",
        correction: "Keep the answer limited to the cited statement, or add a stronger source before expanding it.",
      },
    ],
    check: {
      question: `What does the source state about “${point.label}”?`,
      hint: `Try to answer before reopening ${point.sourceId}.`,
      answer: point.text,
    },
    sourceIds: [point.sourceId],
    evidenceQuotes: [point.text],
    verification: "source-checked",
    order: index,
  };
}

export function buildSourceLockedDeepLesson(lesson = {}, sources = []) {
  const sourceMap = new Map(
    sources.map((source, index) => [
      source.sourceId || `S${index + 1}`,
      {
        raw: source.extractedText || "",
        normalized: normalizedEvidenceText(source.extractedText || ""),
      },
    ]),
  );
  const requestedSourceIds = Array.isArray(lesson.sourceIds) ? lesson.sourceIds : [];
  const sourceIds = requestedSourceIds.filter((sourceId) => sourceMap.has(sourceId));
  const quotes = (Array.isArray(lesson.evidenceQuotes) ? lesson.evidenceQuotes : [])
    .map((quote) => (typeof quote === "string" ? quote.trim() : ""))
    .filter((quote) => {
      const normalizedQuote = normalizedEvidenceText(quote);
      return normalizedQuote.length >= 8
        && sourceIds.some((sourceId) => sourceMap.get(sourceId)?.normalized.includes(normalizedQuote));
    });
  if (sourceIds.length === 0 || quotes.length === 0) return null;

  const requestedTerm = typeof lesson.term === "string" ? lesson.term.trim() : "";
  const sourceText = sourceIds.map((sourceId) => sourceMap.get(sourceId)?.normalized || "").join(" ");
  const term = requestedTerm && sourceText.includes(normalizedEvidenceText(requestedTerm))
    ? requestedTerm
    : exactLabel(quotes[0], 0);
  const evidenceAnswer = quotes.join(" ");
  const statementSummary = quotes.map((quote, index) =>
    `${index === 0 ? "It states" : "It also states"}: “${quote}”`,
  ).join(" ");

  return {
    term,
    learningObjective: `Explain the supplied source statements about ${term} without adding outside information.`,
    directAnswer: evidenceAnswer,
    explanation: `The source gives ${quotes.length} evidence statement${quotes.length === 1 ? "" : "s"} for this lesson. ${statementSummary} These statements are the supported answer. Keep their wording in view while you compare them, and do not add a cause, purpose, or mechanism unless another source states it.`,
    steps: [
      {
        title: "Locate the evidence",
        explanation: `Open ${sourceIds.join(", ")} and find the quoted statements before answering.`,
      },
      ...quotes.map((quote, index) => ({
        title: `Read statement ${index + 1}`,
        explanation: `Read and say the exact source wording: “${quote}”`,
      })),
      {
        title: "Explain the comparison",
        explanation: "Describe only what the quoted statements say. Keep any extra cause, purpose, or detail out of the answer.",
      },
      {
        title: "Verify the answer",
        explanation: "Compare your answer with each quote and correct any changed, reversed, or added information.",
      },
    ].slice(0, 6),
    whyItMatters: "This method keeps the lesson relevant to the supplied material and makes every subject statement easy to verify.",
    example: `Hide the evidence, answer “What does the source state about ${term}?”, then reopen the source and check every word.`,
    commonMistakes: [
      {
        mistake: "Adding a likely cause, purpose, example, or detail that the source does not state.",
        correction: `Use the supported answer only: ${evidenceAnswer}`,
      },
      {
        mistake: "Mixing, changing, or reversing the evidence statements.",
        correction: `Return to ${sourceIds.join(", ")} and read each quote in its original wording.`,
      },
    ],
    check: {
      question: `What does the supplied source state about ${term}?`,
      hint: `Recall the ${quotes.length} quoted statement${quotes.length === 1 ? "" : "s"} before reopening the evidence.`,
      answer: evidenceAnswer,
    },
    sourceIds,
    evidenceQuotes: quotes,
    verification: "source-checked",
  };
}

export function validateDeepLessons(lessons = [], sources = [], reviewDecisions = null, options = {}) {
  const normalized = normalizeLearningPack({ deepLessons: lessons }).deepLessons;
  const sourceMap = new Map(
    sources.map((source, index) => [
      source.sourceId || `S${index + 1}`,
      normalizedEvidenceText(source.extractedText),
    ]),
  );
  const decisionMap = new Map(
    Array.isArray(reviewDecisions)
      ? reviewDecisions.map((decision) => [normalizedEvidenceText(decision?.term), decision])
      : [],
  );
  const accepted = [];
  const issues = [];

  normalized.forEach((lesson, index) => {
    const label = lesson.term || `Lesson ${index + 1}`;
    const sourceIdsValid = lesson.sourceIds.length > 0
      && lesson.sourceIds.every((sourceId) => sourceMap.has(sourceId));
    const quotesValid = lesson.evidenceQuotes.length > 0
      && lesson.evidenceQuotes.every((quote) => {
        const normalizedQuote = normalizedEvidenceText(quote);
        return normalizedQuote.length >= 8
          && lesson.sourceIds.some((sourceId) => sourceMap.get(sourceId)?.includes(normalizedQuote));
      });
    const structureValid = lesson.directAnswer.length >= 12
      && lesson.explanation.length >= 24
      && lesson.steps.length >= 2
      && lesson.steps.every((step) => step.title.length >= 3 && step.explanation.length >= 12)
      && lesson.whyItMatters.length >= 12
      && lesson.example.length >= 12
      && lesson.commonMistakes.length >= 1
      && lesson.check.question.length >= 8
      && lesson.check.answer.length >= 8;
    const review = decisionMap.get(normalizedEvidenceText(label));
    const reviewValid = reviewDecisions === null
      || (review?.supported === true && (!Array.isArray(review.unsupportedClaims) || review.unsupportedClaims.length === 0));
    const unsupportedVocabulary = options.requireSourceVocabulary
      ? findUnsupportedLessonVocabulary(lesson, sources)
      : [];
    const vocabularyValid = unsupportedVocabulary.length === 0;

    if (!sourceIdsValid || !quotesValid || !structureValid || !reviewValid || !vocabularyValid) {
      issues.push({
        term: label,
        sourceIdsValid,
        quotesValid,
        structureValid,
        reviewValid,
        vocabularyValid,
        unsupportedVocabulary,
      });
      return;
    }

    accepted.push({ ...lesson, verification: "source-checked" });
  });

  return { accepted, rejectedCount: normalized.length - accepted.length, issues };
}

export function buildEvidenceLockedPack(extractedSources = [], learningGoal = "") {
  const sourceRecords = extractedSources.map((source, sourceIndex) => {
    const lines = sourceLines(source.extractedText);
    const claims = looksLikeHeading(lines[0], lines.length) ? lines.slice(1) : lines;
    return {
      sourceId: source.sourceId || `S${sourceIndex + 1}`,
      titleLine: lines[0] || `Source ${sourceIndex + 1}`,
      claims,
    };
  });
  const points = sourceRecords
    .flatMap((source) => source.claims.map((text) => ({ sourceId: source.sourceId, text })))
    .filter((point) => point.text && point.text !== "No readable text found.")
    .slice(0, 24)
    .map((point, index) => ({ ...point, label: exactLabel(point.text, index) }));
  const titleLine = sourceRecords[0]?.titleLine;
  const title = titleLine && titleLine !== "No readable text found."
    ? `${titleLine}: evidence-locked study guide`
    : "Evidence-locked study guide";
  const citedSourceIds = [...new Set(points.map((point) => point.sourceId))];
  const limitedTrail = points.slice(0, 7);
  const meaningfulTeachingPoints = points.filter((point) => point.text.length >= 24).slice(0, 8);
  const fallbackTeachingPoints = meaningfulTeachingPoints.length ? meaningfulTeachingPoints : points.slice(0, 6);

  return normalizeLearningPack({
    title,
    overview: points.length
      ? `This guide organizes ${points.length} source statements from ${citedSourceIds.length} image${citedSourceIds.length === 1 ? "" : "s"}. Answers preserve the extracted wording so each statement can be checked against its source.`
      : "Bookmoth could not find readable study statements in these images.",
    sources: extractedSources,
    concepts: points.map((point) => ({
      term: point.label,
      explanation: point.text,
      sourceIds: [point.sourceId],
    })),
    depthSummary: points.length
      ? `Bookmoth found ${points.length} source statement${points.length === 1 ? "" : "s"}. Detailed teaching is shown only when its evidence passes the source gate${learningGoal ? ` for this goal: ${learningGoal}` : ""}.`
      : "The images did not contain enough readable material for a detailed lesson.",
    deepLessons: fallbackTeachingPoints.map(fallbackDeepLesson),
    evidenceReview: {
      status: points.length ? "source-checked" : "needs-review",
      acceptedLessons: fallbackTeachingPoints.length,
      rejectedLessons: 0,
      note: points.length
        ? "These fallback lessons preserve exact source wording. They do not add outside subject knowledge."
        : "Use a clearer image or add a source with more complete information.",
    },
    trailMap: {
      glowPoints: limitedTrail.map((point, index) => ({
        id: `G${index + 1}`,
        label: point.label,
        whyItMatters: point.text,
        sourceIds: [point.sourceId],
      })),
      threads: [],
      blindSpots: points.length > 1 ? [{
        question: "Which source statements are directly connected, and what is the relationship?",
        reason: "The source text lists statements, but their order alone does not prove a sequence or relationship.",
        sourceIds: citedSourceIds,
      }] : [],
      recallLoop: points.length ? [
        "Cover the answers and recall each source statement in your own words.",
        "Check every answer against its cited source, then correct anything you missed.",
        "Repeat the hardest cards tomorrow before rereading the source.",
      ] : [],
    },
    reportSections: points.map((point) => ({
      heading: point.label,
      body: point.text,
      sourceIds: [point.sourceId],
    })),
    flashcards: points.map((point) => ({
      front: `What does the source state about “${point.label}”?`,
      back: point.text,
      sourceIds: [point.sourceId],
    })),
    practice: points.slice(0, 12).map((point) => ({
      question: `Without looking, write the statement associated with “${point.label}.”`,
      hint: `Check ${point.sourceId} only after attempting an answer.`,
      answer: point.text,
      sourceIds: [point.sourceId],
    })),
    collage: {
      title: titleLine && titleLine !== "No readable text found." ? titleLine : "Source review board",
      caption: "A compact board made from the exact statements extracted from your images.",
      callouts: points.slice(0, 12).map((point) => ({
        text: point.text,
        sourceIds: [point.sourceId],
      })),
    },
    reviewPlan: points.length ? [
      "Review the extracted text beside the original images and correct any OCR mistakes.",
      "Complete the practice prompts without looking at the answers.",
      "Return tomorrow and retry only the cards you missed.",
    ] : ["Use a clearer or closer image and try again."],
    cautions: [
      "Local evidence lock keeps factual answers in the extracted source wording. OCR can still be wrong, so compare each cited source with the original image.",
      ...(extractedSources.some((source) => source.confidence !== "high" || source.unclearText?.length)
        ? ["One or more images contain uncertain text. Review the Source extraction panel before studying."]
        : []),
    ],
  });
}

export function learningPackToMarkdown(pack) {
  const clean = normalizeLearningPack(pack);
  const lines = [
    `# ${clean.title}`,
    "",
    clean.overview,
    "",
    "## Deep lessons",
    "",
    clean.depthSummary,
    "",
    ...clean.deepLessons.flatMap((lesson, lessonIndex) => [
      `### ${lessonIndex + 1}. ${lesson.term}`,
      `**Learning objective:** ${lesson.learningObjective}`,
      "",
      `**Direct answer:** ${lesson.directAnswer}`,
      "",
      lesson.explanation,
      "",
      "#### Step by step",
      ...lesson.steps.map((step, stepIndex) => `${stepIndex + 1}. **${step.title}:** ${step.explanation}`),
      "",
      `**Why it matters:** ${lesson.whyItMatters}`,
      "",
      `**Example:** ${lesson.example}`,
      "",
      "#### Common mistakes",
      ...lesson.commonMistakes.map((mistake) => `- **Mistake:** ${mistake.mistake}\n  **Correction:** ${mistake.correction}`),
      "",
      "#### Check your understanding",
      `- Question: ${lesson.check.question}`,
      `- Hint: ${lesson.check.hint}`,
      `- Answer: ${lesson.check.answer}`,
      "",
      `Evidence: ${lesson.evidenceQuotes.map((quote) => `“${quote}”`).join("; ")}`,
      `Sources: ${lesson.sourceIds.join(", ") || "Review needed"}`,
      `Verification: ${lesson.verification}`,
      "",
    ]),
    "## Concepts",
    "",
    ...clean.concepts.flatMap((item) => [
      `### ${item.term}`,
      item.explanation,
      `Sources: ${item.sourceIds.join(", ") || "Review needed"}`,
      "",
    ]),
    "## Lantern trail",
    "",
    ...clean.trailMap.glowPoints.flatMap((item) => [
      `### ${item.id} — ${item.label}`,
      item.whyItMatters,
      `Sources: ${item.sourceIds.join(", ") || "Review needed"}`,
      "",
    ]),
    ...clean.trailMap.threads.map((item) => `- ${item.fromId} → ${item.toId}: ${item.relationship}`),
    "",
    "### Blind spots",
    ...clean.trailMap.blindSpots.map((item) => `- ${item.question} — ${item.reason} (${item.sourceIds.join(", ") || "source gap"})`),
    "",
    "### Recall loop",
    ...clean.trailMap.recallLoop.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Report",
    "",
    ...clean.reportSections.flatMap((item) => [
      `### ${item.heading}`,
      item.body,
      `Sources: ${item.sourceIds.join(", ") || "Review needed"}`,
      "",
    ]),
    "## Flashcards",
    "",
    ...clean.flashcards.flatMap((item, index) => [
      `${index + 1}. **${item.front}**`,
      `   ${item.back}`,
      `   Sources: ${item.sourceIds.join(", ") || "Review needed"}`,
    ]),
    "",
    "## Practice",
    "",
    ...clean.practice.flatMap((item, index) => [
      `${index + 1}. ${item.question}`,
      `   Hint: ${item.hint}`,
      `   Answer: ${item.answer}`,
      `   Sources: ${item.sourceIds.join(", ") || "Review needed"}`,
    ]),
    "",
    "## Review plan",
    "",
    ...clean.reviewPlan.map((item) => `- ${item}`),
    "",
    "## Source extraction",
    "",
    ...clean.sources.flatMap((item) => [
      `### ${item.sourceId} — ${item.confidence} confidence`,
      item.extractedText,
      ...(item.unclearText.length ? [`Unclear: ${item.unclearText.join("; ")}`] : []),
      "",
    ]),
    "---",
    "Generated by Bookmoth. Verify the result against the cited source images.",
  ];
  return lines.join("\n");
}

function legacySampleLearningPack() {
  return normalizeLearningPack({
    title: "Manual exposure: a source-grounded review",
    overview:
      "Aperture and shutter speed control how light is captured, while ISO changes how strongly the camera amplifies the signal. The source connects each control to a visible creative effect.",
    sources: [
      {
        sourceId: "S1",
        extractedText:
          "Photography · Manual Control\nMastering exposure\nShape brightness, motion, and depth with three connected controls.\nAperture\nLens opening\nWider: more light, shallower depth.\nNarrower: less light, deeper depth.\nShutter speed\nExposure time\nFaster: less light, freezes motion.\nSlower: more light, shows motion blur.\nISO\nSignal amplification\nHigher: brighter, more visible noise.\nLower: less noise, needs more light.\nExposure thinking\nPick the creative priority.\nMeter the scene.\nBalance the other controls.",
        confidence: "high",
        unclearText: [],
      },
    ],
    concepts: [
      {
        term: "Aperture",
        explanation: "The lens opening that affects incoming light and depth of field.",
        sourceIds: ["S1"],
      },
      {
        term: "Shutter speed",
        explanation: "The time light reaches the sensor, affecting brightness and motion blur.",
        sourceIds: ["S1"],
      },
      {
        term: "ISO",
        explanation: "Signal amplification that affects image brightness and visible noise.",
        sourceIds: ["S1"],
      },
    ],
    depthSummary:
      "Three source-checked lessons explain what each exposure control changes, how the control behaves, how it connects to a visible result, and how to test your understanding without hiding the supporting evidence.",
    deepLessons: [
      {
        term: "Aperture",
        learningObjective: "Explain how aperture changes both incoming light and depth of field.",
        directAnswer: "Aperture controls the size of the lens opening, affecting light and depth of field.",
        explanation:
          "Aperture is one decision with two linked results. Changing the lens opening changes how much light enters, and it also changes how much of the scene appears within the depth of field. The source gives the direction of both changes: wider means more light and shallower depth; narrower means less light and deeper depth.",
        steps: [
          { title: "Start with the opening", explanation: "Decide whether the lens opening needs to be wider or narrower for the intended look." },
          { title: "Predict the light change", explanation: "A wider opening admits more light; a narrower opening admits less light." },
          { title: "Predict the depth change", explanation: "A wider opening produces shallower depth of field; a narrower opening produces deeper depth of field." },
          { title: "Balance afterward", explanation: "Meter the scene, then balance shutter speed and ISO after choosing the creative priority." },
        ],
        whyItMatters: "The aperture decision affects brightness and depth at the same time, so it should be chosen with the intended visual result in mind.",
        example: "If shallow depth of field is the priority, begin with a wider aperture, then meter the scene and balance the remaining controls.",
        commonMistakes: [
          { mistake: "Treating aperture as a brightness control only.", correction: "Check both results named by the source: incoming light and depth of field." },
          { mistake: "Changing every setting before choosing the look.", correction: "Choose the creative priority first, then meter and balance the other controls." },
        ],
        check: {
          question: "What two results change when the aperture becomes wider?",
          hint: "One result concerns light; the other concerns how much depth appears in focus.",
          answer: "A wider aperture lets in more light and produces shallower depth of field.",
        },
        sourceIds: ["S1"],
        evidenceQuotes: [
          "Wider: more light, shallower depth.",
          "Narrower: less light, deeper depth.",
        ],
        verification: "source-checked",
      },
      {
        term: "Shutter speed",
        learningObjective: "Explain how exposure time changes brightness and the appearance of motion.",
        directAnswer: "Shutter speed controls how long light reaches the sensor, affecting brightness and motion blur.",
        explanation:
          "Shutter speed sets the exposure time. A faster shutter shortens that time, admits less light, and freezes more motion. A slower shutter lengthens the time, admits more light, and records more motion blur. The motion decision and the light decision therefore move together.",
        steps: [
          { title: "Choose the motion result", explanation: "Decide whether the subject should look frozen or show motion blur." },
          { title: "Set the exposure time", explanation: "Use a faster shutter for more frozen motion or a slower shutter for more motion blur." },
          { title: "Account for light", explanation: "Remember that faster admits less light while slower admits more light." },
          { title: "Balance afterward", explanation: "Meter the scene, then use the other controls to reach the intended overall exposure." },
        ],
        whyItMatters: "A shutter choice changes the visual treatment of movement while also changing the amount of captured light.",
        example: "If freezing motion is the priority, begin with a faster shutter, then balance the reduced light with the remaining controls.",
        commonMistakes: [
          { mistake: "Choosing shutter speed without considering motion.", correction: "Start by deciding whether the subject should freeze or blur." },
          { mistake: "Forgetting the light tradeoff.", correction: "A faster shutter admits less light; a slower shutter admits more." },
        ],
        check: {
          question: "What happens to light and motion when shutter speed becomes faster?",
          hint: "Think about a shorter exposure time.",
          answer: "A faster shutter admits less light and freezes more motion.",
        },
        sourceIds: ["S1"],
        evidenceQuotes: [
          "Faster: less light, freezes motion.",
          "Slower: more light, shows motion blur.",
        ],
        verification: "source-checked",
      },
      {
        term: "ISO",
        learningObjective: "Explain the brightness and visible-noise tradeoff described by the source.",
        directAnswer: "ISO amplifies the captured signal, affecting image brightness and visible noise.",
        explanation:
          "ISO changes how strongly the captured signal is amplified. Raising ISO raises brightness, but the source warns that noise can become more visible. Lower ISO keeps noise less visible, but it requires more light to be captured through the aperture and shutter decisions.",
        steps: [
          { title: "Set the creative controls first", explanation: "Choose the aperture and shutter behavior that produces the intended depth and motion." },
          { title: "Meter the scene", explanation: "Check whether those choices produce the intended brightness." },
          { title: "Balance with ISO", explanation: "Raise ISO when more brightness is needed, while watching the visible-noise tradeoff." },
          { title: "Recheck the result", explanation: "Confirm that brightness, depth, motion, and visible noise match the intended look." },
        ],
        whyItMatters: "ISO can help balance brightness after the creative settings are chosen, but the source identifies visible noise as the tradeoff.",
        example: "After choosing depth and motion, raise ISO only as needed for brightness and check whether the added noise remains acceptable for the intended look.",
        commonMistakes: [
          { mistake: "Using ISO without checking the other controls.", correction: "Choose the creative priority, meter the scene, and balance all three controls." },
          { mistake: "Assuming higher ISO changes brightness without a tradeoff.", correction: "The source says higher ISO can make visible noise more apparent." },
        ],
        check: {
          question: "What tradeoff does the source connect with higher ISO?",
          hint: "The image becomes brighter, but another visual effect may increase.",
          answer: "Higher ISO raises brightness and can make noise more visible.",
        },
        sourceIds: ["S1"],
        evidenceQuotes: [
          "Higher: brighter, more visible noise.",
          "Lower: less noise, needs more light.",
        ],
        verification: "source-checked",
      },
    ],
    evidenceReview: {
      status: "source-checked",
      acceptedLessons: 3,
      rejectedLessons: 0,
      note: "Every displayed lesson cites exact wording from the supplied sample source. The source itself remains the final authority for this demonstration.",
    },
    trailMap: {
      glowPoints: [
        { id: "G1", label: "Choose the look", whyItMatters: "Decide whether depth, motion, or noise matters most before changing settings.", sourceIds: ["S1"] },
        { id: "G2", label: "Set aperture", whyItMatters: "Aperture shapes depth of field while changing how much light enters the lens.", sourceIds: ["S1"] },
        { id: "G3", label: "Set shutter speed", whyItMatters: "Shutter time determines whether motion freezes or blurs.", sourceIds: ["S1"] },
        { id: "G4", label: "Balance ISO", whyItMatters: "ISO can raise brightness, with more visible noise as a possible tradeoff.", sourceIds: ["S1"] },
      ],
      threads: [
        { fromId: "G1", toId: "G2", relationship: "The intended depth of field helps determine the aperture choice." },
        { fromId: "G2", toId: "G3", relationship: "Shutter speed can balance the light change while controlling motion." },
        { fromId: "G3", toId: "G4", relationship: "ISO can help reach the target brightness after creative settings are chosen." },
      ],
      blindSpots: [
        { question: "Which exact settings should this scene use?", reason: "The source explains the relationships, but the correct numbers depend on the available light, subject motion, lens, and desired look.", sourceIds: ["S1"] },
      ],
      recallLoop: [
        "Name the visual effect controlled by each setting without looking.",
        "Choose a subject and explain which setting you would prioritize first.",
        "Return tomorrow and rebuild the four-step exposure-thinking sequence from memory.",
      ],
    },
    reportSections: [
      {
        heading: "Creative controls",
        body: "Aperture shapes depth of field, while shutter speed shapes the appearance of motion.",
        sourceIds: ["S1"],
      },
      {
        heading: "Brightness and noise",
        body: "ISO amplifies the captured signal and can make visible noise more apparent.",
        sourceIds: ["S1"],
      },
    ],
    flashcards: [
      { front: "Which control changes depth of field?", back: "Aperture.", sourceIds: ["S1"] },
      { front: "Which control changes motion blur?", back: "Shutter speed.", sourceIds: ["S1"] },
      { front: "What can increase along with ISO?", back: "Visible image noise.", sourceIds: ["S1"] },
    ],
    practice: [
      {
        question: "You want a moving subject to look sharp. Which control should you prioritize, and what must you balance afterward?",
        hint: "Begin with the control that affects motion blur.",
        answer: "Prioritize a faster shutter speed, then balance aperture and ISO to reach the intended brightness and depth of field.",
        sourceIds: ["S1"],
      },
    ],
    collage: {
      title: "Manual exposure at a glance",
      caption: "Use the source and four checkpoints to connect camera settings with visible results.",
      callouts: [
        { text: "Aperture affects incoming light and depth of field.", sourceIds: ["S1"] },
        { text: "Shutter speed affects exposure time and motion blur.", sourceIds: ["S1"] },
        { text: "ISO amplifies the captured signal and can reveal more noise.", sourceIds: ["S1"] },
        { text: "Choose the creative priority first, then balance the remaining controls.", sourceIds: ["S1"] },
      ],
    },
    reviewPlan: [
      "Explain the visual effect of each control without looking at the guide.",
      "Answer the moving-subject practice question, then check the cited source.",
      "Photograph one scene with two different creative priorities and compare the results.",
    ],
    cautions: ["This sample demonstrates the interface. Real results should be checked against every source image."],
  });
}

export function sampleLearningPack() {
  const sources = legacySampleLearningPack().sources;
  const base = buildEvidenceLockedPack(
    sources,
    "Understand how aperture, shutter speed, and ISO change a photo.",
  );
  const lessonBlueprints = [
    {
      term: "Aperture",
      sourceIds: ["S1"],
      evidenceQuotes: [
        "Wider: more light, shallower depth.",
        "Narrower: less light, deeper depth.",
      ],
    },
    {
      term: "Shutter speed",
      sourceIds: ["S1"],
      evidenceQuotes: [
        "Faster: less light, freezes motion.",
        "Slower: more light, shows motion blur.",
      ],
    },
    {
      term: "ISO",
      sourceIds: ["S1"],
      evidenceQuotes: [
        "Higher: brighter, more visible noise.",
        "Lower: less noise, needs more light.",
      ],
    },
  ];
  const deepLessons = lessonBlueprints
    .map((lesson) => buildSourceLockedDeepLesson(lesson, sources))
    .filter(Boolean);

  return normalizeLearningPack({
    ...base,
    title: "Manual exposure: an evidence-locked review",
    overview: "This sample turns three pairs of statements from the photography source into structured lessons. Factual answers keep the source wording visible instead of filling gaps with outside information.",
    concepts: lessonBlueprints.map((lesson) => ({
      term: lesson.term,
      explanation: lesson.evidenceQuotes.join(" "),
      sourceIds: lesson.sourceIds,
    })),
    depthSummary: "Three detailed lessons separate the exact source answer from the study method, recall check, common errors, and evidence used to verify it.",
    deepLessons,
    evidenceReview: {
      status: "source-checked",
      acceptedLessons: deepLessons.length,
      rejectedLessons: 0,
      note: "Every factual answer in this sample is assembled from exact statements in S1. This confirms source grounding; it does not independently prove that the source itself is correct.",
    },
    collage: {
      title: "Manual exposure source board",
      caption: "A compact review of the exact relationships stated in the sample source.",
      callouts: lessonBlueprints.map((lesson) => ({
        text: `${lesson.term}: ${lesson.evidenceQuotes.join(" ")}`,
        sourceIds: lesson.sourceIds,
      })),
    },
    cautions: [
      "This sample demonstrates source-grounded teaching. Verify the original material before relying on it for a high-stakes decision.",
    ],
  });
}
