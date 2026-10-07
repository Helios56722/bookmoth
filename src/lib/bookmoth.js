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
    title: "Photosynthesis: a source-grounded review",
    overview:
      "Plants convert light energy into stored chemical energy. The source notes connect the chloroplast, reactants, products, and the two major stages of the process.",
    sources: [
      {
        sourceId: "S1",
        extractedText:
          "Photosynthesis uses carbon dioxide, water, and light. It produces glucose and oxygen. Chlorophyll in chloroplasts captures light energy.",
        confidence: "high",
        unclearText: [],
      },
    ],
    concepts: [
      {
        term: "Photosynthesis",
        explanation: "The process plants use to store light energy in glucose.",
        sourceIds: ["S1"],
      },
      {
        term: "Chlorophyll",
        explanation: "A pigment in chloroplasts that absorbs light energy.",
        sourceIds: ["S1"],
      },
      {
        term: "Reactants and products",
        explanation: "Carbon dioxide and water are used; glucose and oxygen are produced.",
        sourceIds: ["S1"],
      },
    ],
    trailMap: {
      glowPoints: [
        { id: "G1", label: "Capture light", whyItMatters: "Chlorophyll is the bridge between incoming light and the reactions that store energy.", sourceIds: ["S1"] },
        { id: "G2", label: "Build glucose", whyItMatters: "The process stores captured energy in a chemical form the plant can use.", sourceIds: ["S1"] },
        { id: "G3", label: "Release oxygen", whyItMatters: "Oxygen is a product of the source-described process and an important environmental outcome.", sourceIds: ["S1"] },
      ],
      threads: [
        { fromId: "G1", toId: "G2", relationship: "Captured light supplies the energy used to form glucose." },
        { fromId: "G2", toId: "G3", relationship: "Both appear among the products and outcomes described in the notes." },
      ],
      blindSpots: [
        { question: "What happens in each named stage?", reason: "The sample source names the process but does not explain the stages in enough detail.", sourceIds: ["S1"] },
      ],
      recallLoop: [
        "Cover the source and rebuild the G1 → G2 connection aloud.",
        "Explain why oxygen belongs on the trail without looking at the answer.",
        "Return tomorrow and draw the three points from memory before opening the guide.",
      ],
    },
    reportSections: [
      {
        heading: "How the process works",
        body: "Light captured by chlorophyll powers reactions that ultimately store energy in glucose.",
        sourceIds: ["S1"],
      },
      {
        heading: "Why it matters",
        body: "The process supplies chemical energy to plants and releases oxygen into the environment.",
        sourceIds: ["S1"],
      },
    ],
    flashcards: [
      { front: "Where does photosynthesis occur?", back: "In chloroplasts.", sourceIds: ["S1"] },
      { front: "What pigment captures light?", back: "Chlorophyll.", sourceIds: ["S1"] },
      { front: "Name the main products.", back: "Glucose and oxygen.", sourceIds: ["S1"] },
    ],
    practice: [
      {
        question: "Explain how sunlight becomes stored energy in a plant.",
        hint: "Connect chlorophyll to glucose.",
        answer: "Chlorophyll absorbs light, and photosynthetic reactions use that energy to make glucose.",
        sourceIds: ["S1"],
      },
    ],
    collage: {
      title: "Photosynthesis at a glance",
      caption: "Use the source and four checkpoints as a quick visual review.",
      callouts: [
        { text: "Light, water, and carbon dioxide are the inputs.", sourceIds: ["S1"] },
        { text: "Chlorophyll captures light energy inside chloroplasts.", sourceIds: ["S1"] },
        { text: "The process stores captured energy in glucose.", sourceIds: ["S1"] },
        { text: "Oxygen is released as a product.", sourceIds: ["S1"] },
      ],
    },
    reviewPlan: [
      "Explain the process aloud without looking at the guide.",
      "Answer the practice question, then check the cited source.",
      "Review the flashcards again tomorrow.",
    ],
    cautions: ["This sample demonstrates the interface. Real results should be checked against every source image."],
  });
}
