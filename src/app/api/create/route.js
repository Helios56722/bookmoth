import OpenAI from "openai";
import { normalizeLearningPack, validateSources } from "@/lib/bookmoth";

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

export async function POST(request) {
  try {
    const body = await request.json();
    const sourceError = validateSources(body.sources);
    if (sourceError) return Response.json({ error: sourceError }, { status: 400 });
    if (body.studyUseAccepted !== true) {
      return Response.json({ error: "Confirm that these materials are permitted study sources." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "AI is not configured yet. Add OPENAI_API_KEY to .env.local or use the sample pack." },
        { status: 503 },
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const sourceList = body.sources
      .map((source, index) => `S${index + 1}: ${source.name || `Source ${index + 1}`}`)
      .join("\n");
    const prompt = [
      "You are Bookmoth, a careful learning-material editor.",
      "Extract only what the supplied images support. Do not invent missing text or silently correct uncertain OCR.",
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
    ].join("\n\n");

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
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
    if (!outputText) throw new Error("The AI response did not contain a learning pack.");
    return Response.json({ pack: normalizeLearningPack(JSON.parse(outputText)) });
  } catch (error) {
    console.error("Bookmoth learning pack error", error);
    return Response.json(
      { error: "Bookmoth could not create this learning pack. Check the source images and try again." },
      { status: 500 },
    );
  }
}
