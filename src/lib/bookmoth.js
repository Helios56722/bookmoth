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

export function buildEvidenceLockedPack(extractedSources = []) {
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

export function sampleLearningPack() {
  return normalizeLearningPack({
    title: "Manual exposure: a source-grounded review",
    overview:
      "Aperture and shutter speed control how light is captured, while ISO changes how strongly the camera amplifies the signal. The source connects each control to a visible creative effect.",
    sources: [
      {
        sourceId: "S1",
        extractedText:
          "Aperture controls the size of the lens opening, affecting light and depth of field. Shutter speed controls how long light reaches the sensor, affecting brightness and motion blur. ISO amplifies the captured signal, affecting image brightness and visible noise. Choose the creative priority first, meter the scene, then balance the other controls.",
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
