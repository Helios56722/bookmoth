import OpenAI from "openai";
import sharp from "sharp";
import { Buffer } from "node:buffer";
import { franc } from "franc-min";
import {
  buildEvidenceLockedPack,
  buildSourceLockedDeepLesson,
  normalizeLearningPack,
  validateDeepLessons,
  validateSources,
} from "@/lib/bookmoth";

export const runtime = "nodejs";
export const maxDuration = 300;

const packSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "overview",
    "sources",
    "concepts",
    "depthSummary",
    "deepLessons",
    "evidenceReview",
    "trailMap",
    "reportSections",
    "flashcards",
    "practice",
    "collage",
    "reviewPlan",
    "cautions",
  ],
  properties: {
    title: { type: "string" },
    overview: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId", "sourceType", "sourceTitle", "extractedText", "confidence", "unclearText", "detectedLanguage", "translatedText", "translationLanguage", "translationConfidence"],
        properties: {
          sourceId: { type: "string" },
          sourceType: { type: "string", enum: ["upload", "web-research"] },
          sourceTitle: { type: "string" },
          extractedText: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          unclearText: { type: "array", items: { type: "string" } },
          detectedLanguage: { type: "string" },
          translatedText: { type: "string" },
          translationLanguage: { type: "string" },
          translationConfidence: { type: "string", enum: ["high", "medium", "low", "not-requested"] },
        },
      },
    },
    concepts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "explanation", "sourceIds"],
        properties: {
          term: { type: "string" },
          explanation: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    depthSummary: { type: "string" },
    deepLessons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "term",
          "learningObjective",
          "directAnswer",
          "explanation",
          "steps",
          "whyItMatters",
          "example",
          "commonMistakes",
          "check",
          "sourceIds",
          "evidenceQuotes",
          "verification",
        ],
        properties: {
          term: { type: "string" },
          learningObjective: { type: "string" },
          directAnswer: { type: "string" },
          explanation: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "explanation"],
              properties: {
                title: { type: "string" },
                explanation: { type: "string" },
              },
            },
          },
          whyItMatters: { type: "string" },
          example: { type: "string" },
          commonMistakes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["mistake", "correction"],
              properties: {
                mistake: { type: "string" },
                correction: { type: "string" },
              },
            },
          },
          check: {
            type: "object",
            additionalProperties: false,
            required: ["question", "hint", "answer"],
            properties: {
              question: { type: "string" },
              hint: { type: "string" },
              answer: { type: "string" },
            },
          },
          sourceIds: { type: "array", items: { type: "string" } },
          evidenceQuotes: { type: "array", items: { type: "string" } },
          verification: { type: "string", enum: ["source-checked", "needs-review"] },
        },
      },
    },
    evidenceReview: {
      type: "object",
      additionalProperties: false,
      required: ["status", "acceptedLessons", "rejectedLessons", "note"],
      properties: {
        status: { type: "string", enum: ["source-checked", "partial", "needs-review"] },
        acceptedLessons: { type: "integer" },
        rejectedLessons: { type: "integer" },
        note: { type: "string" },
      },
    },
    trailMap: {
      type: "object",
      additionalProperties: false,
      required: ["glowPoints", "threads", "blindSpots", "recallLoop"],
      properties: {
        glowPoints: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "whyItMatters", "sourceIds"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              whyItMatters: { type: "string" },
              sourceIds: { type: "array", items: { type: "string" } },
            },
          },
        },
        threads: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["fromId", "toId", "relationship"],
            properties: {
              fromId: { type: "string" },
              toId: { type: "string" },
              relationship: { type: "string" },
            },
          },
        },
        blindSpots: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "reason", "sourceIds"],
            properties: {
              question: { type: "string" },
              reason: { type: "string" },
              sourceIds: { type: "array", items: { type: "string" } },
            },
          },
        },
        recallLoop: { type: "array", items: { type: "string" } },
      },
    },
    reportSections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body", "sourceIds"],
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back", "sourceIds"],
        properties: {
          front: { type: "string" },
          back: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    practice: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "hint", "answer", "sourceIds"],
        properties: {
          question: { type: "string" },
          hint: { type: "string" },
          answer: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    collage: {
      type: "object",
      additionalProperties: false,
      required: ["title", "caption", "callouts"],
      properties: {
        title: { type: "string" },
        caption: { type: "string" },
        callouts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "sourceIds"],
            properties: {
              text: { type: "string" },
              sourceIds: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    reviewPlan: { type: "array", items: { type: "string" } },
    cautions: { type: "array", items: { type: "string" } },
  },
};

const sourceExtractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sources"],
  properties: {
    sources: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId", "sourceType", "sourceTitle", "extractedText", "confidence", "unclearText", "detectedLanguage", "translatedText", "translationLanguage", "translationConfidence"],
        properties: {
          sourceId: { type: "string" },
          sourceType: { type: "string", enum: ["upload"] },
          sourceTitle: { type: "string" },
          extractedText: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          unclearText: { type: "array", items: { type: "string" } },
          detectedLanguage: { type: "string" },
          translatedText: { type: "string" },
          translationLanguage: { type: "string" },
          translationConfidence: { type: "string", enum: ["high", "medium", "low", "not-requested"] },
        },
      },
    },
  },
};

const deepLessonsResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["lessons"],
  properties: {
    lessons: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "term",
          "learningObjective",
          "directAnswer",
          "explanation",
          "steps",
          "whyItMatters",
          "example",
          "commonMistakes",
          "check",
          "sourceIds",
          "evidenceQuotes",
          "verification",
        ],
        properties: {
          term: { type: "string" },
          learningObjective: { type: "string" },
          directAnswer: { type: "string" },
          explanation: { type: "string" },
          steps: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "explanation"],
              properties: {
                title: { type: "string" },
                explanation: { type: "string" },
              },
            },
          },
          whyItMatters: { type: "string" },
          example: { type: "string" },
          commonMistakes: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["mistake", "correction"],
              properties: {
                mistake: { type: "string" },
                correction: { type: "string" },
              },
            },
          },
          check: {
            type: "object",
            additionalProperties: false,
            required: ["question", "hint", "answer"],
            properties: {
              question: { type: "string" },
              hint: { type: "string" },
              answer: { type: "string" },
            },
          },
          sourceIds: { type: "array", minItems: 1, items: { type: "string" } },
          evidenceQuotes: { type: "array", minItems: 1, items: { type: "string" } },
          verification: { type: "string", enum: ["needs-review"] },
        },
      },
    },
  },
};

const evidenceReviewResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["decisions"],
  properties: {
    decisions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "supported", "unsupportedClaims"],
        properties: {
          term: { type: "string" },
          supported: { type: "boolean" },
          unsupportedClaims: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

function extractOutputText(response) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
}

function requestedLanguage(body = {}) {
  const value = typeof body.outputLanguage === "string" ? body.outputLanguage.trim() : "";
  return value && value.length <= 80 ? value : "English";
}

function wantsFullTranslation(body = {}) {
  return body.translateFullSource === true;
}

function detectSourceLanguage(extractedText = "", reportedLanguage = "") {
  const text = typeof extractedText === "string" ? extractedText.trim() : "";
  if (text.length >= 20) {
    const code = franc(text, { minLength: 20 });
    if (code && code !== "und") {
      try {
        return new Intl.DisplayNames(["en"], { type: "language" }).of(code) || code;
      } catch {
        return code;
      }
    }
  }
  const reported = typeof reportedLanguage === "string" ? reportedLanguage.trim() : "";
  return reported && !/language name|original source language|unknown/i.test(reported) ? reported : "Unknown";
}

function finalizeSourceTranslation(source = {}, body = {}) {
  const extractedText = typeof source.extractedText === "string" ? source.extractedText.trim() : "";
  const unclearText = Array.isArray(source.unclearText)
    ? source.unclearText.filter((item) => typeof item === "string" && item.trim())
    : [];

  if (!wantsFullTranslation(body)) {
    return {
      ...source,
      unclearText,
      detectedLanguage: detectSourceLanguage(extractedText, source.detectedLanguage),
      translatedText: "",
      translationLanguage: "",
      translationConfidence: "not-requested",
    };
  }

  const translatedText = typeof source.translatedText === "string" ? source.translatedText.trim() : "";
  const originalLength = Array.from(extractedText.replace(/\s/g, "")).length;
  const translationLength = Array.from(translatedText.replace(/\s/g, "")).length;
  const minimumLength = Math.max(24, Math.floor(originalLength * 0.18));
  const looksIncomplete = !translatedText || translationLength < minimumLength;
  const warning = "The requested full translation may be incomplete. Compare it with the original source before relying on it.";

  return {
    ...source,
    unclearText: looksIncomplete && !unclearText.includes(warning) ? [...unclearText, warning] : unclearText,
    detectedLanguage: detectSourceLanguage(extractedText, source.detectedLanguage),
    translatedText,
    translationLanguage: requestedLanguage(body),
    translationConfidence: looksIncomplete
      ? "low"
      : (["high", "medium", "low"].includes(source.translationConfidence) ? source.translationConfidence : "low"),
  };
}

function assertReadableEvidence(sources = []) {
  const hasEnoughEvidence = sources.some((source) => {
    const text = typeof source?.extractedText === "string" ? source.extractedText.trim() : "";
    const evidenceCharacters = Array.from(text).filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
    return evidenceCharacters >= 24 && !/^no readable text found\.?$/i.test(text);
  });
  if (!hasEnoughEvidence) {
    throw new ProviderError(
      "Bookmoth could not find enough reliably readable study text in these images. Use a sharper, closer screenshot that clearly shows the question, notes, labels, or instructions.",
      422,
    );
  }
}

function normalizeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function collectResearchSources(response = {}) {
  const cited = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.type !== "url_citation") continue;
        const url = normalizeUrl(annotation.url);
        if (url) cited.push({ url, title: annotation.title || "Web source" });
      }
    }
    if (item.type === "web_search_call") {
      for (const source of item.action?.sources || []) {
        const url = normalizeUrl(source.url);
        if (url) cited.push({ url, title: "Web source" });
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const item of cited) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    const host = new URL(item.url).hostname.replace(/^www\./, "");
    unique.push({
      id: `R${unique.length + 1}`,
      title: item.title === "Web source" ? host : item.title,
      url: item.url,
      publisher: host,
      language: "Original publication language",
      sourceType: "Web corroboration source",
      whyUsed: "Used to cross-check the uploaded material in Bookmoth's research pass.",
    });
    if (unique.length === 10) break;
  }
  return unique;
}

function buildLanguageProfile(body = {}, sources = []) {
  const detectedLanguages = [...new Set(sources
    .map((source) => source.detectedLanguage)
    .filter((language) => typeof language === "string" && language.trim()))];
  return {
    detectedLanguages,
    outputLanguage: requestedLanguage(body),
    fullSourceTranslation: wantsFullTranslation(body),
    translationNotice: wantsFullTranslation(body)
      ? "Full extracted text was machine-translated. Check names, formulas, quotations, and technical terms against the original."
      : "No full-source translation was requested.",
  };
}

class ProviderError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

function getProviderConfig() {
  const provider = (process.env.BOOKMOTH_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "ollama")).toLowerCase();
  if (!['ollama', 'openai'].includes(provider)) {
    throw new ProviderError("BOOKMOTH_PROVIDER must be either ollama or openai.", 503);
  }
  if (provider === "openai") {
    const baseURL = (process.env.OPENAI_BASE_URL || "").replace(/\/$/, "");
    const gateway = baseURL === "https://ai-gateway.vercel.sh/v1";
    return {
      provider,
      model: process.env.OPENAI_MODEL || (gateway ? "openai/gpt-5-mini" : "gpt-5-mini"),
      baseURL: baseURL || undefined,
      gateway,
      local: false,
    };
  }
  return {
    provider,
    model: process.env.OLLAMA_MODEL || "qwen2.5vl:7b",
    teachingModel: process.env.OLLAMA_TEACHING_MODEL || "qwen3.5:9b",
    url: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
    local: true,
  };
}

function createPrompt(body, extractedSources = null) {
  const listedSources = extractedSources || body.sources.map((source, index) => ({
    sourceId: `S${index + 1}`,
    sourceTitle: source.name || `Source ${index + 1}`,
  }));
  const sourceList = listedSources
    .map((source, index) => `${source.sourceId || `S${index + 1}`}: ${source.sourceTitle || source.name || `Source ${index + 1}`}`)
    .join("\n");
  const lockedEvidence = extractedSources
    ? extractedSources.map((source) => {
      const translation = source.translatedText ? `\nFull ${source.translationLanguage} translation:\n${source.translatedText}` : "";
      return `${source.sourceId} (${source.sourceType || "upload"}):\n${source.extractedText}${translation}`;
    }).join("\n\n")
    : null;
  return [
    "You are Bookmoth, a careful learning-material editor.",
    "Extract only what the supplied images support. Do not invent missing text or silently correct uncertain OCR.",
    ...(lockedEvidence ? [
      "SOURCE LOCK: Use only factual statements explicitly present in the extracted source evidence below. Do not add facts from memory, common knowledge, or likely context.",
      "If the source uses a broad phrase without naming details, preserve that broad phrase. Put the missing details in blindSpots as questions; never supply the answers.",
      "A source citation does not make an unsupported statement acceptable. Every sentence must be justified by the exact source evidence.",
    ] : []),
    "Build an age-neutral learning pack for a student, hobby learner, or skill learner.",
    "Make deepLessons the main teaching output. Each lesson needs a direct answer, a multi-sentence explanation, 3 to 6 ordered steps, why it matters, a source-supported example, at least 2 common mistakes with corrections, a check question with hint and answer, exact evidence quotes, and source IDs.",
    "Evidence quotes must be copied verbatim from the supplied material. Set verification to source-checked only when every lesson statement is supported; otherwise set needs-review and explain the gap in evidenceReview.",
    "Every concept, report section, flashcard, practice item, and collage callout must cite one or more source IDs.",
    "Build a Lantern trail: 3 to 7 source-linked glowPoints, only relationships the sources support, blindSpots for missing prerequisites or ambiguity, and a short recallLoop that makes the learner retrieve rather than reread.",
    "Use stable glow point IDs G1, G2, and so on. Every thread must refer to IDs present in glowPoints.",
    "Put unreadable or ambiguous fragments in unclearText and explain important uncertainty in cautions.",
    "Do not answer or facilitate an active, timed, or proctored assessment. Treat visible questions as later study material.",
    `Write the learning pack in ${requestedLanguage(body)}. Keep evidenceQuotes verbatim in the language in which they appear in the evidence.`,
    wantsFullTranslation(body)
      ? `For each uploaded source, preserve its complete original transcription and its complete ${requestedLanguage(body)} translation. Do not shorten the translation into a summary.`
      : "Do not invent a source translation when no full translation was requested.",
    "Research quality is not determined by country. Prefer sources closest to the claim: official documentation, standards bodies, original research, universities, public agencies, and recognized subject experts. Use original-language sources when the subject originated in that language, including Chinese sources for Chinese-origin material, and surface meaningful disagreement instead of forcing certainty.",
    `Learner context: ${body.context || "No extra context supplied."}`,
    `Learning goal: ${body.goal || "Understand and remember the supplied material."}`,
    `Recorded source link: ${body.referenceUrl || "None supplied."}`,
    `Sources:\n${sourceList}`,
    ...(lockedEvidence ? [`Extracted source evidence:\n${lockedEvidence}`] : []),
  ].join("\n\n");
}

async function extractSourcesWithOpenAI(client, config, body) {
  const language = requestedLanguage(body);
  const response = await client.responses.create({
    model: config.model,
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            "Read each supplied image as a separate source in the order provided.",
            "Transcribe all visible source text exactly. Do not explain, correct, complete, or modernize it.",
            "Detect the language of the original visible source text before translating and record unreadable fragments. detectedLanguage must describe the original source, never the requested translation language unless they are truly the same.",
            wantsFullTranslation(body)
              ? `Translate the complete extracted text into ${language}. This must be a full translation, not a summary. Preserve headings, equations, labels, names, and sequence.`
              : "Set translatedText and translationLanguage to empty strings and translationConfidence to not-requested.",
            "Use source IDs S1, S2, and so on, matching image order. sourceType is upload. sourceTitle should use the matching filename listed below.",
            body.sources.map((source, index) => `S${index + 1}: ${source.name || `Source ${index + 1}`}`).join("\n"),
          ].join("\n\n"),
        },
        ...body.sources.map((source) => ({ type: "input_image", image_url: source.dataUrl, detail: "high" })),
      ],
    }],
    text: { format: { type: "json_schema", name: "bookmoth_source_extraction", strict: true, schema: sourceExtractionSchema } },
  });
  const outputText = extractOutputText(response);
  if (!outputText) throw new ProviderError("OpenAI did not return source extraction results.", 502);
  const parsed = JSON.parse(outputText);
  return Array.isArray(parsed.sources)
    ? parsed.sources.map((source) => finalizeSourceTranslation(source, body))
    : [];
}

async function researchWithOpenAI(client, config, body, extractedSources) {
  if (body.researchMode !== true) return { memo: "", sources: [] };
  const evidence = evidenceForPrompt(extractedSources);
  const response = await client.responses.create({
    model: config.model,
    tools: [{ type: "web_search", search_context_size: "high" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: [
          "Create a concise evidence dossier that checks the factual claims and teaching context in the supplied source transcription.",
          "Search globally and across relevant languages. Do not assume one country produces the best source. Prefer primary or official material, original research, standards, universities, public agencies, and original-language sources closest to the subject.",
          "For Chinese-origin material, actively search authoritative Chinese-language sources as well as strong independent sources in other languages. Apply the same original-language rule to every region.",
          "State what is corroborated, what is disputed, and what remains uncertain. Do not answer an active or proctored test. Keep citations attached to the claims they support.",
          body.referenceUrl ? `The learner supplied this possible original source. Inspect it if relevant and accessible, but do not treat it as authoritative without evaluation: ${body.referenceUrl}` : "No original URL was supplied.",
          `Learner context: ${body.context || "Not supplied."}`,
          `Learning goal: ${body.goal || "Understand and remember the material."}`,
          `Source transcription:\n${evidence}`,
        ].join("\n\n"),
      }],
    }],
  });
  const memo = extractOutputText(response)?.trim() || "";
  const sources = collectResearchSources(response);
  if (!memo || sources.length < 2) {
    throw new ProviderError("Global cross-checking did not return enough traceable evidence. Try again or turn off global research for a source-only pack.", 502);
  }
  return { memo, sources };
}

async function createWithOpenAI(config, body) {
  const apiKey = process.env.OPENAI_API_KEY || (config.gateway ? process.env.VERCEL_OIDC_TOKEN : "");
  if (!apiKey) {
    throw new ProviderError(
      config.gateway
        ? "Vercel AI Gateway is selected, but no OIDC or gateway credential is available."
        : "OpenAI is selected, but OPENAI_API_KEY is missing from .env.local.",
      503,
    );
  }
  const client = new OpenAI({ apiKey, ...(config.baseURL ? { baseURL: config.baseURL } : {}) });
  const extractedSources = await extractSourcesWithOpenAI(client, config, body);
  assertReadableEvidence(extractedSources);
  const research = await researchWithOpenAI(client, config, body, extractedSources);
  const evidenceSources = research.memo
    ? [...extractedSources, {
      sourceId: "W1",
      sourceType: "web-research",
      sourceTitle: "Global corroboration dossier",
      extractedText: research.memo,
      confidence: "medium",
      unclearText: [],
      detectedLanguage: "Multiple languages",
      translatedText: "",
      translationLanguage: "",
      translationConfidence: "not-requested",
    }]
    : extractedSources;
  const prompt = createPrompt(body, evidenceSources);
  const response = await client.responses.create({
    model: config.model,
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    text: {
      format: {
        type: "json_schema",
        name: "bookmoth_learning_pack",
        strict: true,
        schema: packSchema,
      },
    },
  });
  const outputText = extractOutputText(response);
  if (!outputText) throw new ProviderError("OpenAI did not return a learning pack.", 502);
  const pack = JSON.parse(outputText);
  pack.sources = evidenceSources;
  pack.researchSources = research.sources;
  pack.languageProfile = buildLanguageProfile(body, extractedSources);
  pack.researchProfile = {
    requested: body.researchMode === true,
    performed: research.sources.length >= 2,
    sourceCount: research.sources.length,
    note: research.sources.length >= 2
      ? "A separate global research pass cross-checked the uploaded material. Review each linked source before relying on high-stakes claims."
      : "This pack is grounded only in the uploaded material; no live global research was performed.",
  };
  return pack;
}

async function callOllama(config, payload) {
  let response;
  try {
    response = await fetch(`${config.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: globalThis.AbortSignal.timeout(Number(process.env.OLLAMA_TIMEOUT_MS || 300000)),
    });
  } catch (error) {
    console.error("Bookmoth could not reach Ollama", error);
    throw new ProviderError("Local AI is unavailable. Start Ollama, then reopen Bookmoth.", 503);
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error("Ollama learning pack error", response.status, detail);
    throw new ProviderError(`Ollama could not run ${config.model}. Confirm that the model is installed.`, 503);
  }
  const result = await response.json();
  if (!result.message?.content) throw new ProviderError("Ollama did not return a learning pack.", 502);
  return result.message.content;
}

async function prepareOllamaImage(dataUrl) {
  const encoded = dataUrl.split(",")[1];
  if (!encoded) throw new ProviderError("One of the source images could not be prepared for local analysis.", 400);

  const maxDimension = Number(process.env.BOOKMOTH_OCR_MAX_DIMENSION || 1800);
  const quality = Number(process.env.BOOKMOTH_OCR_JPEG_QUALITY || 90);
  return sharp(Buffer.from(encoded, "base64"))
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality, chromaSubsampling: "4:4:4" })
    .toBuffer()
    .then((buffer) => buffer.toString("base64"));
}

function evidenceForPrompt(extractedSources = []) {
  return extractedSources
    .map((source) => `${source.sourceId}:\n${source.extractedText}`)
    .join("\n\n")
    .slice(0, Number(process.env.BOOKMOTH_EVIDENCE_CHAR_LIMIT || 42000));
}

async function parseOllamaJsonWithRepair(config, rawText, schema, label) {
  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    console.warn(`Bookmoth repairing malformed ${label} JSON`, parseError);
    const repairedText = await callOllama(config, {
      model: config.model,
      stream: false,
      think: false,
      messages: [{
        role: "user",
        content: [
          `Repair the malformed ${label} JSON below so it is valid and matches the required schema.`,
          "Preserve the existing wording and values. Fix syntax only. Do not add, infer, or remove subject-matter claims. Return JSON only.",
          rawText,
        ].join("\n\n"),
      }],
      format: schema,
      options: {
        temperature: 0,
        num_ctx: Number(process.env.OLLAMA_TEACHING_NUM_CTX || 32768),
        num_predict: Number(process.env.OLLAMA_TEACHING_NUM_PREDICT || 6144),
      },
      keep_alive: process.env.OLLAMA_KEEP_ALIVE || "5m",
    });
    return JSON.parse(repairedText);
  }
}

async function reviewDeepLessonsWithOllama(teachingConfig, evidence, lessons) {
  return Promise.all(lessons.map(async (lesson) => {
    const reviewPrompt = [
      "You are Bookmoth's strict evidence reviewer. Review the single lesson below.",
      "The lesson passes only when every subject-matter statement can be derived from the complete cited source without outside knowledge.",
      "Allow faithful paraphrases, ordinary synonyms, and plain-language combinations of cited statements. Do not require every lesson sentence to be verbatim; only evidenceQuotes must be verbatim.",
      "These teaching transformations are supported when they introduce no new subject fact: read/choose/compare/observe/recall/check steps; a common mistake that negates or reverses a cited relationship; a question answered by the evidence; a hypothetical use of the exact cited relationship; and a statement that learning or comparing the cited ideas helps meet the stated objective.",
      "A sentence copied verbatim from the source is supported, including a broader source statement used in whyItMatters. Ignore the draft verification flag. Do not reject a lesson merely because it reorganizes cited facts into teaching steps.",
      "Reject any new cause, mechanism, purpose, condition, direction, sequence, number, location, object, or domain fact, even when it is commonly known.",
      "For example, if a source says only 'needs more light', then 'needs more light to achieve proper exposure' is unsupported. If a source says only 'exposure time', then naming a sensor or explaining what is exposed is unsupported.",
      "Reject silently repaired uncertain wording and any evidence quote that is not verbatim.",
      `Return JSON only as {"decisions":[{"term":"${String(lesson?.term || "Lesson").replaceAll('"', "'")}","supported":true|false,"unsupportedClaims":["exact unsupported claim"]}]}. Return exactly one decision and do not rewrite the lesson.`,
      `SOURCE EVIDENCE:\n${evidence}`,
      `LESSON DRAFT:\n${JSON.stringify(lesson)}`,
    ].join("\n\n");
    const reviewText = await callOllama(teachingConfig, {
      model: teachingConfig.model,
      stream: false,
      think: false,
      messages: [{ role: "user", content: reviewPrompt }],
      format: evidenceReviewResponseSchema,
      options: {
        temperature: 0,
        num_ctx: Number(process.env.OLLAMA_TEACHING_NUM_CTX || 32768),
        num_predict: Number(process.env.OLLAMA_REVIEW_NUM_PREDICT || 2048),
      },
      keep_alive: process.env.OLLAMA_KEEP_ALIVE || "5m",
    });
    const review = await parseOllamaJsonWithRepair(
      teachingConfig,
      reviewText,
      evidenceReviewResponseSchema,
      "evidence review",
    );
    const term = String(lesson?.term || "").trim().toLowerCase();
    const decisions = Array.isArray(review.decisions) ? review.decisions : [];
    return decisions.find((decision) => String(decision?.term || "").trim().toLowerCase() === term)
      || {
        term: lesson?.term || "Lesson",
        supported: false,
        unsupportedClaims: ["The evidence reviewer did not return a matching decision."],
      };
  }));
}

async function reviseRejectedDeepLessonsWithOllama(
  teachingConfig,
  evidence,
  rejectedLessons,
  reviewFeedback,
) {
  const revisionPrompt = [
    "You are Bookmoth's source-lock editor.",
    "Revise each rejected lesson so every subject-matter claim is fully supported by the supplied evidence. Return JSON only as {\"lessons\":[...]}",
    "Keep each lesson term exactly unchanged and preserve the detailed teaching structure: learningObjective, directAnswer, explanation, 3 to 6 steps, whyItMatters, example, at least 2 commonMistakes, check, sourceIds, evidenceQuotes, and verification.",
    "Remove or rewrite every unsupported claim identified by the reviewer. Use the source's own wording when a paraphrase might add a purpose, mechanism, condition, object, sequence, or relationship.",
    "The deterministic vocabulary check lists subject words that do not occur in the source. Remove those words or replace the sentence with direct source wording. Generic study language is fine, but every subject-specific word must appear in the source evidence.",
    "You may explain how to study, compare, recall, or verify a statement. You may not supply missing subject knowledge. Do not make a lesson sound more complete by adding facts that are absent from the source.",
    "Every evidenceQuotes entry must be copied verbatim from a cited source. Set verification to needs-review.",
    `SOURCE EVIDENCE:\n${evidence}`,
    `REVIEW FEEDBACK:\n${JSON.stringify(reviewFeedback)}`,
    `REJECTED LESSONS:\n${JSON.stringify(rejectedLessons)}`,
  ].join("\n\n");
  const revisionText = await callOllama(teachingConfig, {
    model: teachingConfig.model,
    stream: false,
    think: false,
    messages: [{ role: "user", content: revisionPrompt }],
    format: deepLessonsResponseSchema,
    options: {
      temperature: 0,
      num_ctx: Number(process.env.OLLAMA_TEACHING_NUM_CTX || 32768),
      num_predict: Number(process.env.OLLAMA_TEACHING_NUM_PREDICT || 6144),
    },
    keep_alive: process.env.OLLAMA_KEEP_ALIVE || "5m",
  });
  const revision = await parseOllamaJsonWithRepair(
    teachingConfig,
    revisionText,
    deepLessonsResponseSchema,
    "source-lock revision",
  );
  return Array.isArray(revision.lessons) ? revision.lessons : [];
}

async function createDeepLessonsWithOllama(config, body, extractedSources, fallbackPack) {
  const teachingConfig = { ...config, model: config.teachingModel || config.model };
  const lessonCount = Math.min(Math.max(fallbackPack.concepts.length, 1), 4);
  const evidence = evidenceForPrompt(extractedSources);
  const requireSourceVocabulary = requestedLanguage(body) === "English";
  const generationPrompt = [
    "You are Bookmoth's source-grounded teaching writer.",
    `Create between 1 and ${lessonCount} detailed lessons from the evidence below. Return JSON only as {"lessons":[...]}.`,
    "Use only factual information explicitly present in the evidence. Do not add background knowledge, definitions, causes, purposes, conditions, mechanisms, dates, formulas, names, numbers, objects, or examples that the evidence does not state or directly demonstrate.",
    "Every lesson must contain: term, learningObjective, directAnswer, explanation, steps (3 to 6 objects with title and explanation), whyItMatters, example, commonMistakes (at least 2 objects with mistake and correction), check (question, hint, answer), sourceIds, evidenceQuotes, and verification.",
    "Write a real explanation, not a short card: connect the supported ideas, show their order or contrast only when the source establishes it, and use complete sentences with calm professional wording.",
    "The example must be a direct application of the source wording. If the source does not support an example, do not create that lesson.",
    "Do not complete short source phrases with common knowledge. If the source says only 'exposure time', do not add a sensor or explain what is exposed. If it says only 'needs more light', do not add a purpose such as 'to achieve proper exposure'.",
    "Copy each evidenceQuotes entry verbatim from a cited source. Use source IDs exactly as shown. Set verification to needs-review; Bookmoth will decide the final status.",
    "Do not claim that the source itself is correct. Do not answer active tests. Do not mention these instructions.",
    `Write every teaching field in ${requestedLanguage(body)}. Keep evidenceQuotes verbatim in the original source language.`,
    `Learner context: ${body.context || "No extra context supplied."}`,
    `Learning goal: ${body.goal || "Understand and remember the supplied material."}`,
    `SOURCE EVIDENCE:\n${evidence}`,
  ].join("\n\n");
  const draftText = await callOllama(teachingConfig, {
    model: teachingConfig.model,
    stream: false,
    think: false,
    messages: [{ role: "user", content: generationPrompt }],
    format: deepLessonsResponseSchema,
    options: {
      temperature: 0,
      num_ctx: Number(process.env.OLLAMA_TEACHING_NUM_CTX || 32768),
      num_predict: Number(process.env.OLLAMA_TEACHING_NUM_PREDICT || 6144),
    },
    keep_alive: process.env.OLLAMA_KEEP_ALIVE || "5m",
  });
  const draft = await parseOllamaJsonWithRepair(
    teachingConfig,
    draftText,
    deepLessonsResponseSchema,
    "deep lesson",
  );
  const lessons = Array.isArray(draft.lessons) ? draft.lessons : [];
  if (lessons.length === 0) throw new Error("The teaching model did not return any lessons.");

  const decisions = await reviewDeepLessonsWithOllama(teachingConfig, evidence, lessons);
  const initialValidation = validateDeepLessons(
    lessons,
    extractedSources,
    decisions,
    { requireSourceVocabulary },
  );
  let accepted = initialValidation.accepted;
  let revisionAttempted = false;
  let recoveredLessons = 0;
  let sourceLockedLessons = 0;
  let revisionCandidates = [];
  let revisionDiagnostics = null;

  if (initialValidation.rejectedCount > 0) {
    revisionAttempted = true;
    const rejectedTerms = new Set(
      initialValidation.issues.map((issue) => issue.term.trim().toLowerCase()),
    );
    const rejectedLessons = lessons.filter((lesson) =>
      rejectedTerms.has(String(lesson?.term || "").trim().toLowerCase()),
    );
    const relevantDecisions = decisions.filter((decision) =>
      rejectedTerms.has(String(decision?.term || "").trim().toLowerCase()),
    );
    const revisedLessons = await reviseRejectedDeepLessonsWithOllama(
      teachingConfig,
      evidence,
      rejectedLessons,
      {
        reviewerDecisions: relevantDecisions,
        deterministicIssues: initialValidation.issues.filter((issue) =>
          rejectedTerms.has(String(issue?.term || "").trim().toLowerCase()),
        ),
      },
    );
    revisionCandidates = revisedLessons;
    if (revisedLessons.length > 0) {
      const revisedDecisions = await reviewDeepLessonsWithOllama(
        teachingConfig,
        evidence,
        revisedLessons,
      );
      const revisedValidation = validateDeepLessons(
        revisedLessons,
        extractedSources,
        revisedDecisions,
        { requireSourceVocabulary },
      );
      revisionDiagnostics = {
        issues: revisedValidation.issues,
        decisions: revisedDecisions,
      };
      recoveredLessons = revisedValidation.accepted.length;
      accepted = [...accepted, ...revisedValidation.accepted];
    }
  }

  const acceptedTerms = new Set(
    accepted.map((lesson) => String(lesson.term || "").trim().toLowerCase()),
  );
  const recoveryCandidates = [...revisionCandidates, ...lessons].filter((lesson, index, all) => {
    const term = String(lesson?.term || "").trim().toLowerCase();
    return term
      && !acceptedTerms.has(term)
      && all.findIndex((candidate) => String(candidate?.term || "").trim().toLowerCase() === term) === index;
  });
  const sourceLockedCandidates = recoveryCandidates
    .map((lesson) => buildSourceLockedDeepLesson(lesson, extractedSources))
    .filter(Boolean);
  const sourceLockedValidation = validateDeepLessons(
    sourceLockedCandidates,
    extractedSources,
    null,
    { requireSourceVocabulary },
  );
  sourceLockedLessons = sourceLockedValidation.accepted.length;
  accepted = [...accepted, ...sourceLockedValidation.accepted].slice(0, lessons.length);

  if (accepted.length === 0) {
    throw new Error(`No generated lesson passed the evidence gate: ${JSON.stringify({
      initial: { issues: initialValidation.issues, decisions },
      revision: revisionDiagnostics,
    })}`);
  }

  return {
    lessons: accepted,
    rejectedCount: Math.max(lessons.length - accepted.length, 0),
    revisionAttempted,
    recoveredLessons,
    sourceLockedLessons,
    teachingModel: teachingConfig.model,
  };
}

async function createWithOllama(config, body) {
  const common = {
    model: config.model,
    stream: false,
    options: {
      temperature: 0,
      num_ctx: Number(process.env.OLLAMA_NUM_CTX || 8192),
      num_predict: Number(process.env.OLLAMA_NUM_PREDICT || 2048),
    },
    keep_alive: process.env.OLLAMA_KEEP_ALIVE || "5m",
  };
  const preparedImages = await Promise.all(body.sources.map((source) => prepareOllamaImage(source.dataUrl)));
  const extractedSources = [];

  for (const [index, image] of preparedImages.entries()) {
    const sourceId = `S${index + 1}`;
    const sourceTitle = body.sources[index]?.name || `Source ${index + 1}`;
    const translationInstruction = wantsFullTranslation(body)
      ? `Translate the complete extracted text into ${requestedLanguage(body)}. Do not summarize. Preserve headings, labels, equations, names, and order.`
      : "Do not translate. Use empty strings for translatedText and translationLanguage, and not-requested for translationConfidence.";
    try {
      const extractionText = await callOllama(config, {
        ...common,
        messages: [{
          role: "user",
          content: `Transcribe only text visibly present in this one image. Treat the entire image as one source even when it contains multiple windows or pages. Do not explain, complete, correct, or add facts. First detect the language of the ORIGINAL visible text before translating. detectedLanguage MUST name the original source language and MUST NOT name the requested translation language unless the original is actually written in that language. ${translationInstruction} Return only valid JSON shaped like {"sources":[{"sourceId":"${sourceId}","sourceType":"upload","sourceTitle":"${sourceTitle}","extractedText":"all visible text","confidence":"high|medium|low","unclearText":["unreadable fragments"],"detectedLanguage":"original source language name","translatedText":"complete translation or empty string","translationLanguage":"target language or empty string","translationConfidence":"high|medium|low|not-requested"}]}.`,
          images: [image],
        }],
        format: "json",
      });
      const extraction = JSON.parse(extractionText);
      if (!Array.isArray(extraction.sources) || extraction.sources.length === 0) {
        throw new Error("The response did not include a source record.");
      }
      const records = extraction.sources;
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      const confidence = records
        .map((source) => (["high", "medium", "low"].includes(source.confidence) ? source.confidence : "low"))
        .sort((left, right) => confidenceOrder[right] - confidenceOrder[left])[0];
      extractedSources.push(finalizeSourceTranslation({
        sourceId,
        sourceType: "upload",
        sourceTitle,
        extractedText: records.map((source) => source.extractedText).filter((text) => typeof text === "string" && text.trim()).join("\n\n") || "No readable text found.",
        confidence,
        unclearText: records.flatMap((source) => Array.isArray(source.unclearText) ? source.unclearText : []).filter((item) => typeof item === "string"),
        detectedLanguage: records.map((source) => source.detectedLanguage).find((value) => typeof value === "string" && value.trim()),
        translatedText: wantsFullTranslation(body)
          ? records.map((source) => source.translatedText).filter((text) => typeof text === "string" && text.trim()).join("\n\n")
          : "",
        translationLanguage: wantsFullTranslation(body) ? requestedLanguage(body) : "",
        translationConfidence: wantsFullTranslation(body)
          ? records.map((source) => source.translationConfidence).find((value) => ["high", "medium", "low"].includes(value)) || "low"
          : "not-requested",
      }, body));
    } catch (structuredError) {
      console.warn("Bookmoth structured OCR retrying as plain transcription", structuredError);
      const plainText = await callOllama(config, {
        ...common,
        messages: [{
          role: "user",
          content: `Transcribe only the text visibly present in this image. Do not explain, complete, correct, or add facts. Mark uncertain fragments with [unclear]. ${translationInstruction} Return the original transcription first${wantsFullTranslation(body) ? ", then a clearly labeled complete translation" : ""}.`,
          images: [image],
        }],
      });
      extractedSources.push(finalizeSourceTranslation({
        sourceId,
        sourceType: "upload",
        sourceTitle,
        extractedText: plainText.trim() || "No readable text found.",
        confidence: "low",
        unclearText: ["Structured confidence review failed. Verify this source against the original image."],
        detectedLanguage: "Unknown",
        translatedText: "",
        translationLanguage: wantsFullTranslation(body) ? requestedLanguage(body) : "",
        translationConfidence: wantsFullTranslation(body) ? "low" : "not-requested",
      }, body));
    }
  }
  assertReadableEvidence(extractedSources);
  const pack = buildEvidenceLockedPack(
    extractedSources,
    body.goal || "Understand and remember the supplied material.",
  );
  pack.languageProfile = buildLanguageProfile(body, extractedSources);
  pack.researchSources = [];
  pack.researchProfile = {
    requested: body.researchMode === true,
    performed: false,
    sourceCount: 0,
    note: body.researchMode === true
      ? "Local Ollama mode cannot search the live web. This pack is grounded in the uploaded material only."
      : "No live global research was requested.",
  };
  try {
    const teaching = await createDeepLessonsWithOllama(config, body, extractedSources, pack);
    pack.deepLessons = teaching.lessons;
    pack.depthSummary = `${teaching.lessons.length} detailed lesson${teaching.lessons.length === 1 ? "" : "s"} passed Bookmoth's source-ID, verbatim-quote, structure, and separate support-review gates.`;
    pack.evidenceReview = {
      status: teaching.rejectedCount > 0 ? "partial" : "source-checked",
      acceptedLessons: teaching.lessons.length,
      rejectedLessons: teaching.rejectedCount,
      note: teaching.rejectedCount > 0
        ? `${teaching.rejectedCount} draft lesson${teaching.rejectedCount === 1 ? " was" : "s were"} removed because the evidence check did not pass.`
        : teaching.sourceLockedLessons > 0
          ? `${teaching.sourceLockedLessons} lesson${teaching.sourceLockedLessons === 1 ? " was" : "s were"} rebuilt from exact evidence after expanded wording failed the source gate. Every factual answer is tied to verbatim source statements. This verifies grounding in the supplied sources, not the independent accuracy of those sources.`
          : teaching.revisionAttempted
            ? `${teaching.recoveredLessons} lesson${teaching.recoveredLessons === 1 ? " was" : "s were"} corrected by the source-lock editor, then passed a second support review and deterministic citation checks. This verifies grounding in the supplied sources, not the independent accuracy of those sources.`
          : `The teaching draft from ${teaching.teachingModel} passed a separate support review and deterministic citation checks. This verifies grounding in the supplied sources, not the independent accuracy of those sources.`,
    };
    pack.cautions = [
      ...pack.cautions,
      "Bookmoth checks whether explanations are grounded in the supplied material. It cannot prove that the supplied material itself is correct.",
    ];
  } catch (error) {
    console.warn("Bookmoth deep teaching fell back to exact evidence", error);
    pack.evidenceReview = {
      status: "partial",
      acceptedLessons: pack.deepLessons.length,
      rejectedLessons: 0,
      note: "The detailed teaching draft did not pass the full evidence gate, so Bookmoth displayed exact source-locked lessons instead of risking unsupported information.",
    };
    pack.cautions = [
      ...pack.cautions,
      "Detailed teaching was limited to exact source wording because the expanded draft did not pass every evidence check.",
    ];
  }
  return pack;
}

export async function GET() {
  try {
    const config = getProviderConfig();
    if (config.provider === "openai") {
      const credentialAvailable = Boolean(process.env.OPENAI_API_KEY || (config.gateway && process.env.VERCEL_OIDC_TOKEN));
      return Response.json({
        provider: config.gateway ? "vercel-ai-gateway" : "openai",
        model: config.model,
        local: false,
        ready: credentialAvailable,
        researchAvailable: true,
        translationAvailable: true,
        detail: credentialAvailable
          ? `${config.gateway ? "Vercel AI Gateway" : "OpenAI"} reading, full translation, and global research are configured.`
          : (config.gateway ? "Vercel AI Gateway credentials are unavailable." : "OPENAI_API_KEY is missing."),
      });
    }
    try {
      const [visionResponse, teachingResponse] = await Promise.all([
        fetch(`${config.url}/api/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: config.model }),
          signal: globalThis.AbortSignal.timeout(5000),
        }),
        fetch(`${config.url}/api/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: config.teachingModel }),
          signal: globalThis.AbortSignal.timeout(5000),
        }),
      ]);
      const ready = visionResponse.ok && teachingResponse.ok;
      return Response.json({
        provider: "ollama",
        model: config.model,
        teachingModel: config.teachingModel,
        local: true,
        ready,
        researchAvailable: false,
        translationAvailable: true,
        detail: ready
          ? "Local reading and teaching models are ready."
          : `Install ${!visionResponse.ok ? config.model : config.teachingModel} in Ollama.`,
      });
    } catch {
      return Response.json({
        provider: "ollama",
        model: config.model,
        teachingModel: config.teachingModel,
        local: true,
        ready: false,
        researchAvailable: false,
        translationAvailable: true,
        detail: "Start Ollama, then reopen Bookmoth.",
      });
    }
  } catch (error) {
    return Response.json({
      provider: "unknown",
      model: "unknown",
      local: false,
      ready: false,
      detail: error.message,
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const sourceError = validateSources(body.sources);
    if (sourceError) return Response.json({ error: sourceError }, { status: 400 });
    if (body.studyUseAccepted !== true) {
      return Response.json({ error: "Confirm that these materials are permitted study sources." }, { status: 400 });
    }
    const config = getProviderConfig();
    const rawPack = config.provider === "openai"
      ? await createWithOpenAI(config, body)
      : await createWithOllama(config, body);
    let finalPack = normalizeLearningPack(rawPack);
    if (config.provider === "openai") {
      const cloudValidation = validateDeepLessons(
        finalPack.deepLessons,
        finalPack.sources,
        null,
        { requireSourceVocabulary: requestedLanguage(body) === "English" },
      );
      if (cloudValidation.accepted.length > 0) {
        finalPack.deepLessons = cloudValidation.accepted;
        finalPack.evidenceReview = {
          status: cloudValidation.rejectedCount > 0 ? "partial" : "source-checked",
          acceptedLessons: cloudValidation.accepted.length,
          rejectedLessons: cloudValidation.rejectedCount,
          note: finalPack.researchProfile?.performed
            ? "Bookmoth verified source IDs, required teaching structure, and exact evidence quotes after a separate global corroboration pass. Linked sources still require human review for high-stakes use."
            : "Bookmoth verified the source IDs, required teaching structure, and exact evidence quotes. This checks grounding, not the independent accuracy of the supplied material.",
        };
      } else {
        const languageProfile = finalPack.languageProfile;
        const researchProfile = finalPack.researchProfile;
        const researchSources = finalPack.researchSources;
        finalPack = buildEvidenceLockedPack(
          finalPack.sources,
          body.goal || "Understand and remember the supplied material.",
        );
        finalPack.languageProfile = languageProfile;
        finalPack.researchProfile = researchProfile;
        finalPack.researchSources = researchSources;
        finalPack.evidenceReview = {
          status: "partial",
          acceptedLessons: finalPack.deepLessons.length,
          rejectedLessons: cloudValidation.rejectedCount,
          note: "The expanded cloud draft failed the deterministic evidence gate, so Bookmoth displayed exact source-locked lessons.",
        };
      }
    }
    return Response.json({
      pack: normalizeLearningPack(finalPack),
      provider: {
        name: config.provider,
        model: config.model,
        teachingModel: config.teachingModel || config.model,
        local: config.local,
        researchAvailable: config.provider === "openai",
      },
    });
  } catch (error) {
    console.error("Bookmoth learning pack error", error);
    return Response.json(
      { error: error instanceof ProviderError ? error.message : "Bookmoth could not create this learning pack. Check the source images and try again." },
      { status: error instanceof ProviderError ? error.status : 500 },
    );
  }
}
