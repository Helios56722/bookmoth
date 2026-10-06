import OpenAI from "openai";
import sharp from "sharp";
import { Buffer } from "node:buffer";
import { buildEvidenceLockedPack, normalizeLearningPack, validateSources } from "@/lib/bookmoth";

export const runtime = "nodejs";

const packSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "overview",
    "sources",
    "concepts",
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
        required: ["sourceId", "extractedText", "confidence", "unclearText"],
        properties: {
          sourceId: { type: "string" },
          extractedText: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          unclearText: { type: "array", items: { type: "string" } },
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

function extractOutputText(response) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
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
    return {
      provider,
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      local: false,
    };
  }
  return {
    provider,
    model: process.env.OLLAMA_MODEL || "qwen2.5vl:7b",
    url: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
    local: true,
  };
}

function createPrompt(body, extractedSources = null) {
  const sourceList = body.sources
    .map((source, index) => `S${index + 1}: ${source.name || `Source ${index + 1}`}`)
    .join("\n");
  const lockedEvidence = extractedSources
    ? extractedSources.map((source) => `${source.sourceId}:\n${source.extractedText}`).join("\n\n")
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
    "Every concept, report section, flashcard, practice item, and collage callout must cite one or more source IDs.",
    "Build a Lantern trail: 3 to 7 source-linked glowPoints, only relationships the sources support, blindSpots for missing prerequisites or ambiguity, and a short recallLoop that makes the learner retrieve rather than reread.",
    "Use stable glow point IDs G1, G2, and so on. Every thread must refer to IDs present in glowPoints.",
    "Put unreadable or ambiguous fragments in unclearText and explain important uncertainty in cautions.",
    "Do not answer or facilitate an active, timed, or proctored assessment. Treat visible questions as later study material.",
    `Learner context: ${body.context || "No extra context supplied."}`,
    `Learning goal: ${body.goal || "Understand and remember the supplied material."}`,
    `Recorded source link: ${body.referenceUrl || "None supplied."}`,
    `Sources:\n${sourceList}`,
    ...(lockedEvidence ? [`Extracted source evidence:\n${lockedEvidence}`] : []),
  ].join("\n\n");
}

async function createWithOpenAI(config, body, prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new ProviderError("OpenAI is selected, but OPENAI_API_KEY is missing from .env.local.", 503);
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: config.model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          ...body.sources.map((source) => ({
            type: "input_image",
            image_url: source.dataUrl,
            detail: "high",
          })),
        ],
      },
    ],
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
  return JSON.parse(outputText);
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
    try {
      const extractionText = await callOllama(config, {
        ...common,
        messages: [{
          role: "user",
          content: `Transcribe only text visibly present in this one image. Treat the entire image as one source even when it contains multiple windows or pages. Do not explain, complete, correct, or add facts. Return only valid JSON shaped like {"sources":[{"sourceId":"${sourceId}","extractedText":"all visible text","confidence":"high|medium|low","unclearText":["unreadable fragments"]}]}.`,
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
      extractedSources.push({
        sourceId,
        extractedText: records.map((source) => source.extractedText).filter((text) => typeof text === "string" && text.trim()).join("\n\n") || "No readable text found.",
        confidence,
        unclearText: records.flatMap((source) => Array.isArray(source.unclearText) ? source.unclearText : []).filter((item) => typeof item === "string"),
      });
    } catch (structuredError) {
      console.warn("Bookmoth structured OCR retrying as plain transcription", structuredError);
      const plainText = await callOllama(config, {
        ...common,
        messages: [{
          role: "user",
          content: "Transcribe only the text visibly present in this image. Do not explain, complete, correct, or add facts. Mark uncertain fragments with [unclear]. Return only the transcription.",
          images: [image],
        }],
      });
      extractedSources.push({
        sourceId,
        extractedText: plainText.trim() || "No readable text found.",
        confidence: "low",
        unclearText: ["Structured confidence review failed. Verify this source against the original image."],
      });
    }
  }
  return buildEvidenceLockedPack(extractedSources);
}

export async function GET() {
  try {
    const config = getProviderConfig();
    if (config.provider === "openai") {
      return Response.json({
        provider: "openai",
        model: config.model,
        local: false,
        ready: Boolean(process.env.OPENAI_API_KEY),
        detail: process.env.OPENAI_API_KEY ? "OpenAI is configured." : "OPENAI_API_KEY is missing.",
      });
    }
    try {
      const response = await fetch(`${config.url}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model }),
        signal: globalThis.AbortSignal.timeout(5000),
      });
      return Response.json({
        provider: "ollama",
        model: config.model,
        local: true,
        ready: response.ok,
        detail: response.ok ? "Local AI is ready." : `Install ${config.model} in Ollama.`,
      });
    } catch {
      return Response.json({
        provider: "ollama",
        model: config.model,
        local: true,
        ready: false,
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
    const prompt = createPrompt(body);
    const rawPack = config.provider === "openai"
      ? await createWithOpenAI(config, body, prompt)
      : await createWithOllama(config, body);
    return Response.json({
      pack: normalizeLearningPack(rawPack),
      provider: { name: config.provider, model: config.model, local: config.local },
    });
  } catch (error) {
    console.error("Bookmoth learning pack error", error);
    return Response.json(
      { error: error instanceof ProviderError ? error.message : "Bookmoth could not create this learning pack. Check the source images and try again." },
      { status: error instanceof ProviderError ? error.status : 500 },
    );
  }
}
