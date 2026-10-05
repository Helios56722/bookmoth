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
      caption: "Use the source card and callouts as a quick visual review.",
      callouts: [
        { text: "Inputs: carbon dioxide, water, and light", sourceIds: ["S1"] },
        { text: "Outputs: glucose and oxygen", sourceIds: ["S1"] },
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
