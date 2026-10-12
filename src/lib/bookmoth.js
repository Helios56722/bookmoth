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

const SUBJECT_RULES = [
  {
    domain: "mathematics",
    label: "Mathematics",
    patterns: [
      /\b(?:solve|calculate|simplify|factor|equation|algebra|geometry|fraction|percent|probability|derivative|integral|slope|quadratic|polynomial)\b/gi,
      /(?:^|\s)[a-z]\s*=|=\s*-?\d|\d\s*[+\-×÷*/]\s*\d/gi,
    ],
  },
  {
    domain: "language-arts",
    label: "Language arts",
    patterns: [
      /\b(?:grammar|sentence|subject|predicate|noun|verb|adjective|adverb|pronoun|metaphor|simile|theme|thesis|claim|passage|poem|essay|author|tone|inference|literary)\b/gi,
    ],
  },
  {
    domain: "science",
    label: "Science",
    patterns: [
      /\b(?:science|biology|chemistry|physics|cell|atom|molecule|reaction|force|energy|ecosystem|photosynthesis|respiration|gravity|mass|velocity|water cycle|hypothesis|experiment)\b/gi,
    ],
  },
  {
    domain: "history",
    label: "History and civics",
    patterns: [
      /\b(?:history|historical|empire|revolution|war|treaty|constitution|government|civilization|dynasty|migration|president|parliament|election|primary source|chronology)\b/gi,
      /\b(?:1[5-9][0-9]{2}|20[0-9]{2})\b/gi,
    ],
  },
  {
    domain: "computing",
    label: "Computing",
    patterns: [
      /\b(?:computer science|computing|binary|algorithm|programming|code|variable|function|database|network|bit|byte|software|hardware)\b/gi,
    ],
  },
  {
    domain: "world-language",
    label: "World language",
    patterns: [
      /\b(?:translate|translation|conjugate|conjugation|vocabulary|bilingual|spanish|french|german|mandarin|chinese|japanese|korean|arabic|portuguese|hindi|vietnamese)\b/gi,
    ],
  },
];

function subjectTaskType(domain, text) {
  if (domain === "mathematics") {
    if (/\b(?:solve|equation|algebra)\b|[a-z]\s*=|=\s*-?\d/i.test(text)) return "Equation solving";
    if (/\b(?:percent|ratio|rate|word problem)\b/i.test(text)) return "Quantitative word problem";
    return "Calculation and reasoning";
  }
  if (domain === "language-arts") {
    if (/\b(?:grammar|subject|predicate|noun|verb|adjective|adverb|pronoun)\b/i.test(text)) return "Grammar and sentence analysis";
    if (/\b(?:metaphor|simile|theme|tone|passage|poem|literary|inference)\b/i.test(text)) return "Close reading and literary analysis";
    return "Reading and writing analysis";
  }
  if (domain === "science") {
    if (/\b(?:calculate|formula|substitut|mass|density|acceleration|velocity)\b|[a-z]\s*=\s*[a-z]/i.test(text)) return "Calculation and scientific reasoning";
    if (/\b(?:process|cycle|reaction|photosynthesis|respiration)\b/i.test(text)) return "Process and mechanism explanation";
    if (/\b(?:experiment|hypothesis|variable|data)\b/i.test(text)) return "Scientific investigation";
    return "Scientific concept explanation";
  }
  if (domain === "history") {
    if (/\b(?:primary source|document|speech|letter)\b/i.test(text)) return "Historical source analysis";
    if (/\b(?:causes?|effects?|impacts?|results?|consequences?)\b/i.test(text)) return "Historical cause and consequence";
    return "Chronology and historical context";
  }
  if (domain === "world-language") return "Translation and language structure";
  if (domain === "computing") {
    if (/\b(?:binary|bit|byte|number system)\b/i.test(text)) return "Computational representation";
    if (/\b(?:code|programming|algorithm|function|variable)\b/i.test(text)) return "Code and algorithm explanation";
    return "Computing concept explanation";
  }
  return "General concept review";
}

const SUBJECT_GUIDANCE = {
  mathematics: "Show equivalent transformations in order, preserve mathematical notation, state the result clearly, and verify it by substitution or recomputation.",
  "language-arts": "Name the language feature or claim, quote the exact words that support it, explain how the evidence works, and separate textual observation from interpretation.",
  science: "Define the system, identify parts or variables, explain the sequence or mechanism supported by the source, and distinguish observations from inferences.",
  history: "Establish chronology, identify the people or institutions involved, separate source claims from later interpretation, and explain causes or consequences only when the evidence supports them.",
  "world-language": "Preserve the original wording, translate meaning in context, explain relevant vocabulary or grammar, and flag idioms or ambiguity instead of forcing a literal answer.",
  computing: "Trace inputs, representation, operations, and outputs in order; preserve exact code or notation and verify the result with a small worked check.",
  general: "Give the direct answer, connect it to exact source evidence, explain the reasoning in order, and mark anything the supplied material cannot establish.",
};

export function inferSubjectProfile(sources = [], context = "", goal = "") {
  const sourceText = (Array.isArray(sources) ? sources : [])
    .map((source) => typeof source?.extractedText === "string" ? source.extractedText : "")
    .join("\n");
  const text = `${context || ""}\n${goal || ""}\n${sourceText}`;
  const scores = SUBJECT_RULES.map((rule) => ({
    ...rule,
    score: rule.patterns.reduce((total, pattern) => total + [...text.matchAll(new RegExp(pattern.source, pattern.flags))].length, 0),
  })).sort((left, right) => right.score - left.score);
  const winner = scores[0];
  const runnerUp = scores[1];
  let selected = winner?.score > 0 ? winner : { domain: "general", label: "General learning", score: 0 };
  const explicitScience = /\b(?:biology|chemistry|physics|earth science)\b/i.test(text);
  const explicitAlgebra = /\b(?:algebra|linear equation|quadratic)\b/i.test(text)
    || /\bsolve\b[^\n]{0,50}\b[x-z]\b/i.test(text);
  if (explicitScience && !explicitAlgebra) {
    selected = scores.find((item) => item.domain === "science") || selected;
  }
  const confidence = selected.score >= 3 && selected.score > (runnerUp?.score || 0)
    ? "high"
    : selected.score > 0 ? "medium" : "low";

  return {
    domain: selected.domain,
    label: selected.label,
    taskType: subjectTaskType(selected.domain, text),
    responseMode: selected.domain === "mathematics" || subjectTaskType(selected.domain, text).includes("Calculation")
      ? "Worked solution"
      : "Evidence-guided explanation",
    guidance: SUBJECT_GUIDANCE[selected.domain] || SUBJECT_GUIDANCE.general,
    confidence,
    answerVerification: {
      status: "not-run",
      method: selected.domain === "mathematics" ? "Mathematical answer check" : "Source evidence check",
      note: "The subject-specific verification step has not run yet.",
      expectedAnswer: "",
    },
  };
}

export function subjectTeachingDirective(profile = {}) {
  const domain = profile.domain || "general";
  if (domain === "mathematics") {
    return "MATHEMATICS MODE: Treat the visible problem as evidence and derive the answer from it. Show every equivalent transformation, preserve signs and units, state the final equation or value, and check the result by substitution or recomputation. Derived arithmetic is allowed; unrelated formulas or assumptions are not.";
  }
  if (domain === "language-arts") {
    return "LANGUAGE ARTS MODE: Identify the exact word, phrase, sentence, or passage being analyzed. A grammar label, literary device, or interpretation may be derived from the visible text even when that label is not printed in the source, but the answer must quote the words that justify it and explain how and why they fit. Distinguish textual fact from reasonable interpretation and do not add author biography or historical context that the source does not supply.";
  }
  if (domain === "science") {
    return "SCIENCE MODE: Identify the system and variables, then explain what happens, how it happens, and why only to the depth supported by the source. Standard calculations and conclusions may be derived from stated values, equations, or observations; show the formula, substitution, units, and check. Do not add an unstated mechanism. Preserve causal direction, sequence, conditions, and the boundary between observation and inference.";
  }
  if (domain === "history") {
    return "HISTORY MODE: Establish who, what, when, and where before explaining causes, consequences, or significance. Keep chronology intact, quote the source for claims, distinguish primary evidence from interpretation, and avoid present-day assumptions that the source does not support.";
  }
  if (domain === "world-language") {
    return "WORLD LANGUAGE MODE: Preserve the original wording. A translation, conjugation, or grammar label may be derived from that wording; give the context-aware result, explain the exact feature that affects meaning, and identify ambiguity, register, or idioms. Do not replace the source with a loose summary or invent missing surrounding context.";
  }
  if (domain === "computing") {
    return "COMPUTING MODE: Trace the representation or algorithm step by step. Derived outputs may be computed from the exact code, bits, values, or rules in the source; show the operation and verify it with a compact worked check. Do not invent runtime behavior, inputs, or implementation details that are not supplied.";
  }
  return "GENERAL LEARNING MODE: Answer directly, explain the reasoning in order, tie every factual statement to the supplied evidence, and state what remains unknown.";
}

function addLinear(left, right, sign = 1) {
  return { a: left.a + (right.a * sign), b: left.b + (right.b * sign) };
}

function multiplyLinear(left, right) {
  if (Math.abs(left.a) > 1e-12 && Math.abs(right.a) > 1e-12) throw new Error("Nonlinear expression");
  if (Math.abs(left.a) > 1e-12) return { a: left.a * right.b, b: left.b * right.b };
  if (Math.abs(right.a) > 1e-12) return { a: right.a * left.b, b: right.b * left.b };
  return { a: 0, b: left.b * right.b };
}

function tokenizeMathExpression(expression = "") {
  const normalized = expression
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/(\d|\))(?=[A-Za-z(])/g, "$1*")
    .replace(/([A-Za-z])(?=\()/g, "$1*")
    .replace(/\)(?=\d)/g, ")*");
  const tokens = normalized.match(/\d+(?:\.\d+)?|[A-Za-z]|[()+\-*/]/g) || [];
  if (!tokens.length || tokens.join("") !== normalized) throw new Error("Unsupported notation");
  return tokens;
}

function parseLinearExpression(expression = "", variable = "x") {
  const tokens = tokenizeMathExpression(expression);
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];

  const parseFactor = () => {
    const token = take();
    if (token === "+") return parseFactor();
    if (token === "-") {
      const value = parseFactor();
      return { a: -value.a, b: -value.b };
    }
    if (token === "(") {
      const value = parseExpression();
      if (take() !== ")") throw new Error("Unclosed parenthesis");
      return value;
    }
    if (/^\d/.test(token || "")) return { a: 0, b: Number(token) };
    if (/^[A-Za-z]$/.test(token || "") && token.toLowerCase() === variable.toLowerCase()) return { a: 1, b: 0 };
    throw new Error("Unsupported variable");
  };
  const parseTerm = () => {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const operation = take();
      const right = parseFactor();
      if (operation === "*") value = multiplyLinear(value, right);
      else {
        if (Math.abs(right.a) > 1e-12 || Math.abs(right.b) < 1e-12) throw new Error("Unsupported division");
        value = { a: value.a / right.b, b: value.b / right.b };
      }
    }
    return value;
  };
  function parseExpression() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operation = take();
      value = addLinear(value, parseTerm(), operation === "+" ? 1 : -1);
    }
    return value;
  }
  const result = parseExpression();
  if (index !== tokens.length) throw new Error("Unsupported expression");
  return result;
}

function formatMathNumber(value) {
  if (Math.abs(value - Math.round(value)) < 1e-10) return String(Math.round(value));
  return String(Number(value.toFixed(8)));
}

export function solveSupportedLinearEquation(text = "") {
  const normalized = text.replace(/[−–—]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/");
  const lines = normalized.split(/\r?\n/).filter((line) => line.includes("="));
  for (const line of lines) {
    const cleaned = line
      .replace(/^.*?\b(?:solve|find|calculate|determine)\b(?:\s+(?:for\s+)?[A-Za-z])?\s*:?\s*/i, "")
      .trim();
    const equalsIndex = cleaned.indexOf("=");
    if (equalsIndex <= 0) continue;
    const leftText = cleaned.slice(0, equalsIndex).trim();
    const rightText = cleaned.slice(equalsIndex + 1).replace(/\.(?!\d).*$/, "").trim();
    if (!leftText || !rightText) continue;
    const variables = [...new Set(`${leftText}${rightText}`.match(/[A-Za-z]/g)?.map((item) => item.toLowerCase()) || [])];
    if (variables.length !== 1) continue;
    try {
      const variable = variables[0];
      const left = parseLinearExpression(leftText, variable);
      const right = parseLinearExpression(rightText, variable);
      const coefficient = left.a - right.a;
      const constant = right.b - left.b;
      if (Math.abs(coefficient) < 1e-12) continue;
      const solution = constant / coefficient;
      const leftCheck = (left.a * solution) + left.b;
      const rightCheck = (right.a * solution) + right.b;
      return {
        variable,
        equation: `${leftText} = ${rightText}`,
        evidenceQuote: `${leftText} = ${rightText}`,
        left,
        right,
        coefficient,
        constant,
        solution,
        expectedAnswer: `${variable} = ${formatMathNumber(solution)}`,
        combinedEquation: `${formatMathNumber(coefficient)}${variable} = ${formatMathNumber(constant)}`,
        check: `${formatMathNumber(leftCheck)} = ${formatMathNumber(rightCheck)}`,
      };
    } catch {
      // Continue looking for another supported equation in the source.
    }
  }
  return null;
}

export function buildVerifiedLinearEquationLesson(sources = []) {
  for (const [index, source] of (Array.isArray(sources) ? sources : []).entries()) {
    const solved = solveSupportedLinearEquation(source?.extractedText || "");
    if (!solved) continue;
    const sourceId = source.sourceId || `S${index + 1}`;
    const variable = solved.variable;
    return {
      lesson: {
        term: `Solve ${solved.equation}`,
        learningObjective: `Solve the linear equation for ${variable} and verify the result by substitution.`,
        directAnswer: solved.expectedAnswer,
        explanation: `A linear equation stays equivalent when the same valid operation is applied to both sides. Move the constant terms to one side, collect the ${variable}-terms on the other, divide by the remaining coefficient, and substitute the result into the original equation to check it.`,
        steps: [
          { title: "Read the equation", explanation: `Start with ${solved.equation}. Keep both sides balanced through every transformation.` },
          { title: "Collect like terms", explanation: `Combining the variable and constant terms gives ${solved.combinedEquation}.` },
          { title: `Isolate ${variable}`, explanation: `Divide both sides by ${formatMathNumber(solved.coefficient)} to obtain ${solved.expectedAnswer}.` },
          { title: "Check by substitution", explanation: `Substituting ${formatMathNumber(solved.solution)} into the original equation gives ${solved.check}, so both sides agree.` },
        ],
        whyItMatters: "Showing equivalent transformations makes the reasoning inspectable and catches sign, operation, and arithmetic errors.",
        example: `The verified result for the supplied equation is ${solved.expectedAnswer}; substitution produces ${solved.check}.`,
        commonMistakes: [
          { mistake: "Changing a sign on only one side of the equation.", correction: "Apply the same operation to both sides and write the new equivalent equation." },
          { mistake: "Stopping before checking the result.", correction: `Substitute ${formatMathNumber(solved.solution)} into both sides; they must produce the same value.` },
        ],
        check: {
          question: `What value of ${variable} makes both sides of ${solved.equation} equal?`,
          hint: `Use ${solved.combinedEquation}, then divide by the coefficient of ${variable}.`,
          answer: `${solved.expectedAnswer}; substitution gives ${solved.check}.`,
        },
        sourceIds: [sourceId],
        evidenceQuotes: [solved.evidenceQuote],
        verification: "source-checked",
      },
      verification: {
        status: "verified",
        method: "Deterministic linear-equation solver and substitution",
        note: `Bookmoth independently solved ${solved.equation} and substituted the result. Both sides evaluate to the same value (${solved.check}).`,
        expectedAnswer: solved.expectedAnswer,
      },
    };
  }
  return null;
}

export function applySubjectQualityGate(pack = {}, sources = [], context = "", goal = "") {
  const profile = inferSubjectProfile(sources, context, goal);
  const result = { ...pack, subjectProfile: profile };
  if (profile.domain === "mathematics") {
    const verifiedMath = buildVerifiedLinearEquationLesson(sources);
    if (verifiedMath) {
      result.deepLessons = [verifiedMath.lesson];
      result.depthSummary = "This worked solution was derived from the visible equation and checked by substituting the result into both sides.";
      result.evidenceReview = {
        status: "source-checked",
        acceptedLessons: 1,
        rejectedLessons: 0,
        note: "The visible equation was transcribed as source evidence. Bookmoth then solved it with deterministic linear algebra and verified the answer by substitution.",
      };
      result.subjectProfile = { ...profile, answerVerification: verifiedMath.verification };
      return result;
    }
    result.subjectProfile = {
      ...profile,
      answerVerification: {
        status: "needs-review",
        method: "Mathematical answer check",
        note: "This problem is outside Bookmoth's current deterministic arithmetic and linear-equation checker. Review the model's method and final result before relying on it.",
        expectedAnswer: "",
      },
    };
    return result;
  }
  result.subjectProfile = {
    ...profile,
    answerVerification: {
      status: pack.evidenceReview?.status === "source-checked" ? "source-checked" : "needs-review",
      method: "Source quotation and claim-support review",
      note: pack.evidenceReview?.status === "source-checked"
        ? `Bookmoth applied its ${profile.taskType.toLowerCase()} method and tied the displayed teaching to exact source evidence.`
        : "Some teaching was limited or removed because the available source evidence did not support it completely.",
      expectedAnswer: "",
    },
  };
  return result;
}

export function normalizeLearningPack(value = {}) {
  const safeArray = (input) => (Array.isArray(input) ? input : []);
  const safeString = (input, fallback = "") =>
    typeof input === "string" && input.trim() ? input.trim() : fallback;
  const safeLabel = (input, fallback = "") => safeString(input, fallback).replace(/\s+/g, " ");

  return {
    title: safeLabel(value.title, "Untitled learning pack"),
    overview: safeString(value.overview, "No overview was generated."),
    subjectProfile: {
      domain: ["mathematics", "language-arts", "science", "history", "world-language", "computing", "general"].includes(value.subjectProfile?.domain)
        ? value.subjectProfile.domain
        : "general",
      label: safeLabel(value.subjectProfile?.label, "General learning"),
      taskType: safeLabel(value.subjectProfile?.taskType, "General concept review"),
      responseMode: safeLabel(value.subjectProfile?.responseMode, "Evidence-guided explanation"),
      guidance: safeString(value.subjectProfile?.guidance, SUBJECT_GUIDANCE.general),
      confidence: ["high", "medium", "low"].includes(value.subjectProfile?.confidence)
        ? value.subjectProfile.confidence
        : "low",
      answerVerification: {
        status: ["verified", "source-checked", "needs-review", "not-run"].includes(value.subjectProfile?.answerVerification?.status)
          ? value.subjectProfile.answerVerification.status
          : "not-run",
        method: safeLabel(value.subjectProfile?.answerVerification?.method, "Subject-specific answer check"),
        note: safeString(value.subjectProfile?.answerVerification?.note, "The subject-specific verification step has not run yet."),
        expectedAnswer: safeString(value.subjectProfile?.answerVerification?.expectedAnswer),
      },
    },
    sources: safeArray(value.sources).map((source, index) => ({
      sourceId: safeString(source?.sourceId, `S${index + 1}`),
      sourceType: ["upload", "web-research"].includes(source?.sourceType) ? source.sourceType : "upload",
      sourceTitle: safeLabel(source?.sourceTitle, `Source ${index + 1}`),
      extractedText: safeString(source?.extractedText, "No readable text found."),
      confidence: ["high", "medium", "low"].includes(source?.confidence)
        ? source.confidence
        : "low",
      unclearText: safeArray(source?.unclearText).map((item) => safeString(item)).filter(Boolean),
      detectedLanguage: safeString(source?.detectedLanguage, "Unknown"),
      translatedText: safeString(source?.translatedText),
      translationLanguage: safeString(source?.translationLanguage),
      translationConfidence: ["high", "medium", "low", "not-requested"].includes(source?.translationConfidence)
        ? source.translationConfidence
        : "not-requested",
    })),
    languageProfile: {
      detectedLanguages: safeArray(value.languageProfile?.detectedLanguages).map((item) => safeString(item)).filter(Boolean),
      outputLanguage: safeString(value.languageProfile?.outputLanguage, "English"),
      fullSourceTranslation: value.languageProfile?.fullSourceTranslation === true,
      translationNotice: safeString(value.languageProfile?.translationNotice, "No full-source translation was requested."),
    },
    researchProfile: {
      requested: value.researchProfile?.requested === true,
      performed: value.researchProfile?.performed === true,
      sourceCount: Number.isInteger(value.researchProfile?.sourceCount) ? value.researchProfile.sourceCount : 0,
      note: safeString(value.researchProfile?.note, "No live global research was performed."),
    },
    consistencyReview: {
      status: ["passed", "needs-review"].includes(value.consistencyReview?.status)
        ? value.consistencyReview.status
        : "needs-review",
      checks: {
        uniqueSourceIds: value.consistencyReview?.checks?.uniqueSourceIds === true,
        referencesValid: value.consistencyReview?.checks?.referencesValid === true,
        lessonEvidencePresent: value.consistencyReview?.checks?.lessonEvidencePresent === true,
        reviewCountsMatch: value.consistencyReview?.checks?.reviewCountsMatch === true,
        researchCountMatches: value.consistencyReview?.checks?.researchCountMatches === true,
        requestedTranslationsPresent: value.consistencyReview?.checks?.requestedTranslationsPresent === true,
        subjectAnalysisComplete: value.consistencyReview?.checks?.subjectAnalysisComplete === true,
      },
      invalidSourceIds: safeArray(value.consistencyReview?.invalidSourceIds).map((item) => safeString(item)).filter(Boolean),
      note: safeString(value.consistencyReview?.note, "Bookmoth has not completed its deterministic consistency audit."),
    },
    researchSources: safeArray(value.researchSources).map((source, index) => ({
      id: safeString(source?.id, `R${index + 1}`),
      title: safeLabel(source?.title, "Web source"),
      url: safeString(source?.url),
      publisher: safeString(source?.publisher, "Unknown publisher"),
      language: safeString(source?.language, "Original publication language"),
      sourceType: safeString(source?.sourceType, "Web corroboration source"),
      whyUsed: safeString(source?.whyUsed, "Used in the global corroboration pass."),
    })).filter((source) => /^https?:\/\//i.test(source.url)),
    concepts: safeArray(value.concepts).map((concept) => ({
      term: safeLabel(concept?.term, "Concept"),
      explanation: safeString(concept?.explanation, "Explanation unavailable."),
      sourceIds: safeArray(concept?.sourceIds).map((item) => safeString(item)).filter(Boolean),
    })),
    depthSummary: safeString(
      value.depthSummary,
      "Each lesson separates the direct source answer from the explanation, practice, and evidence used to support it.",
    ),
    deepLessons: safeArray(value.deepLessons).map((lesson, lessonIndex) => ({
      term: safeLabel(lesson?.term, `Lesson ${lessonIndex + 1}`),
      learningObjective: safeString(lesson?.learningObjective, "Explain this idea using the supplied source."),
      directAnswer: safeString(lesson?.directAnswer, "The source does not provide a direct answer."),
      explanation: safeString(lesson?.explanation, "The source does not provide enough detail for a reliable explanation."),
      steps: safeArray(lesson?.steps).map((step, stepIndex) => ({
        title: safeLabel(step?.title, `Step ${stepIndex + 1}`),
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
        label: safeLabel(point?.label, "Key idea"),
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
      heading: safeLabel(section?.heading, "Finding"),
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
      title: safeLabel(value.collage?.title, "Visual review board"),
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

export function auditLearningPackConsistency(value = {}) {
  const pack = normalizeLearningPack(value);
  const sourceIds = pack.sources.map((source) => source.sourceId).filter(Boolean);
  const sourceIdSet = new Set(sourceIds);
  const referencedSourceIds = [
    ...pack.concepts.flatMap((item) => item.sourceIds),
    ...pack.deepLessons.flatMap((item) => item.sourceIds),
    ...pack.reportSections.flatMap((item) => item.sourceIds),
    ...pack.flashcards.flatMap((item) => item.sourceIds),
    ...pack.practice.flatMap((item) => item.sourceIds),
    ...pack.collage.callouts.flatMap((item) => item.sourceIds),
    ...pack.trailMap.glowPoints.flatMap((item) => item.sourceIds),
    ...pack.trailMap.blindSpots.flatMap((item) => item.sourceIds),
  ].filter(Boolean);
  const invalidSourceIds = [...new Set(referencedSourceIds.filter((sourceId) => !sourceIdSet.has(sourceId)))];
  const acceptedLessonCount = pack.deepLessons.filter((lesson) => lesson.verification === "source-checked").length;
  const outputLanguage = pack.languageProfile.outputLanguage.toLowerCase();
  const requestedTranslationsPresent = !pack.languageProfile.fullSourceTranslation
    || pack.sources
      .filter((source) => source.sourceType === "upload")
      .every((source) => {
        const detectedLanguage = source.detectedLanguage.toLowerCase();
        const alreadyInOutputLanguage = detectedLanguage.includes(outputLanguage)
          || outputLanguage.includes(detectedLanguage);
        return alreadyInOutputLanguage || Boolean(source.translatedText && source.translationLanguage);
      });
  const checks = {
    uniqueSourceIds: sourceIds.length > 0 && sourceIdSet.size === sourceIds.length,
    referencesValid: referencedSourceIds.length > 0 && invalidSourceIds.length === 0,
    lessonEvidencePresent: pack.deepLessons.length > 0 && pack.deepLessons.every((lesson) => (
      lesson.sourceIds.length > 0 && lesson.evidenceQuotes.length > 0
    )),
    reviewCountsMatch: pack.evidenceReview.acceptedLessons === acceptedLessonCount
      && pack.evidenceReview.rejectedLessons >= 0,
    researchCountMatches: !pack.researchProfile.performed
      || (pack.researchSources.length >= 2 && pack.researchProfile.sourceCount === pack.researchSources.length),
    requestedTranslationsPresent,
    subjectAnalysisComplete: Boolean(pack.subjectProfile.domain && pack.subjectProfile.taskType)
      && pack.subjectProfile.answerVerification.status !== "not-run",
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    status: passed ? "passed" : "needs-review",
    checks,
    invalidSourceIds,
    note: passed
      ? "Source IDs, lesson evidence, review counts, research totals, requested translations, and the subject-specific answer check agree across this pack."
      : "One or more pack-wide checks did not agree. Review the Source check tab before relying on this material.",
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
  const lines = sourceLines(line);
  if (lines.length > 1 && looksLikeHeading(lines[0], lines.length)) return lines[0];
  const compactLine = line.replace(/\s+/g, " ").trim();
  const colonIndex = compactLine.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 48) return compactLine.slice(0, colonIndex).trim();

  const subject = compactLine.match(
    /^(.{2,55}?)\s+(?:is|are|was|were|uses?|produces?|converts?|captures?|contains?|includes?|requires?|means?|refers?\s+to)\b/i,
  )?.[1]?.trim();
  if (subject) return subject;

  const words = compactLine.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= 5) return compactLine.replace(/[.!?]+$/, "");
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
  const compactRequestedTerm = requestedTerm.replace(/\s+/g, " ");
  const sourceText = sourceIds.map((sourceId) => sourceMap.get(sourceId)?.normalized || "").join(" ");
  const requestedTermIsUsable = requestedTerm
    && !/[\r\n]/.test(requestedTerm)
    && compactRequestedTerm.length <= 72
    && compactRequestedTerm.split(/\s+/).length <= 8;
  const term = requestedTermIsUsable && sourceText.includes(normalizedEvidenceText(requestedTerm))
    ? compactRequestedTerm
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
    const structureValid = lesson.directAnswer.length >= 2
      && lesson.explanation.length >= 24
      && lesson.steps.length >= 2
      && lesson.steps.every((step) => step.title.length >= 3 && step.explanation.length >= 12)
      && lesson.whyItMatters.length >= 12
      && lesson.example.length >= 12
      && lesson.commonMistakes.length >= 1
      && lesson.check.question.length >= 8
      && lesson.check.answer.length >= 2;
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
    "## Subject method",
    "",
    `Domain: ${clean.subjectProfile.label}`,
    `Task: ${clean.subjectProfile.taskType}`,
    `Response mode: ${clean.subjectProfile.responseMode}`,
    clean.subjectProfile.guidance,
    `Answer verification: ${clean.subjectProfile.answerVerification.status}`,
    `Verification method: ${clean.subjectProfile.answerVerification.method}`,
    clean.subjectProfile.answerVerification.note,
    ...(clean.subjectProfile.answerVerification.expectedAnswer
      ? [`Expected answer: ${clean.subjectProfile.answerVerification.expectedAnswer}`]
      : []),
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
      `### ${item.sourceId} — ${item.sourceTitle}`,
      `Type: ${item.sourceType} | OCR confidence: ${item.confidence} | Detected language: ${item.detectedLanguage}`,
      item.extractedText,
      ...(item.unclearText.length ? [`Unclear: ${item.unclearText.join("; ")}`] : []),
      ...(item.translatedText ? ["", `#### Full ${item.translationLanguage} translation`, item.translatedText, `Translation confidence: ${item.translationConfidence}`] : []),
      "",
    ]),
    "## Language and translation",
    "",
    `Output language: ${clean.languageProfile.outputLanguage}`,
    `Detected source languages: ${clean.languageProfile.detectedLanguages.join(", ") || "Unknown"}`,
    clean.languageProfile.translationNotice,
    "",
    "## Global corroboration",
    "",
    clean.researchProfile.note,
    ...clean.researchSources.map((source) => `- [${source.title}](${source.url}) — ${source.publisher}; ${source.language}`),
    "",
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
        sourceType: "upload",
        sourceTitle: "manual-exposure-guide.png",
        extractedText:
          "Photography · Manual Control\nMastering exposure\nShape brightness, motion, and depth with three connected controls.\nAperture\nLens opening\nWider: more light, shallower depth.\nNarrower: less light, deeper depth.\nShutter speed\nExposure time\nFaster: less light, freezes motion.\nSlower: more light, shows motion blur.\nISO\nSignal amplification\nHigher: brighter, more visible noise.\nLower: less noise, needs more light.\nExposure thinking\nPick the creative priority.\nMeter the scene.\nBalance the other controls.",
        confidence: "high",
        unclearText: [],
        detectedLanguage: "English",
        translatedText: "",
        translationLanguage: "",
        translationConfidence: "not-requested",
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

  let sample = normalizeLearningPack(applySubjectQualityGate({
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
  }, sources, "Beginner photography and manual exposure", "Understand how aperture, shutter speed, and ISO change a photo."));
  sample.consistencyReview = auditLearningPackConsistency(sample);
  return sample;
}
