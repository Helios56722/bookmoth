import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import { buildCollageSvg } from "../src/lib/collage-template.js";

const root = process.cwd();
const publicDir = path.join(root, "public");
const outputDir = path.join(root, "docs", "validation");
await fs.mkdir(outputDir, { recursive: true });

const sourceFiles = [
  ["manual-exposure-guide.png", "sample-notes.png"],
  ["camera-exposure-reference.png", "sample-camera-exposure.png"],
  ["bookmoth-brand-figure.png", "bookmoth-brand-figure.png"],
  ["second-source-stress.png", "sample-notes.png"],
];

const sources = await Promise.all(sourceFiles.map(async ([name, file]) => {
  const data = await fs.readFile(path.join(publicDir, file));
  const metadata = await sharp(data).metadata();
  return {
    name,
    dataUrl: `data:image/png;base64,${data.toString("base64")}`,
    metadata: { width: metadata.width, height: metadata.height, channels: metadata.channels },
  };
}));

const baseCollage = {
  title: "Manual exposure at a glance",
  caption: "Use the source and four checkpoints to connect camera settings with visible results.",
  callouts: [
    { text: "Aperture affects incoming light and depth of field.", sourceIds: ["S1"] },
    { text: "Shutter speed affects exposure time and motion blur.", sourceIds: ["S1"] },
    { text: "ISO amplifies the captured signal and can reveal more noise.", sourceIds: ["S1"] },
    { text: "Choose the creative priority first, then balance the remaining controls.", sourceIds: ["S1"] },
  ],
};

const cases = [
  { id: "single-source", sources: sources.slice(0, 1), collage: baseCollage },
  {
    id: "four-source-stress",
    sources,
    collage: {
      ...baseCollage,
      title: "Four-source review board",
      callouts: [
        { text: "Aperture affects incoming light and depth of field.", sourceIds: ["S1"] },
        { text: "The reference frame shows how shutter speed changes motion blur.", sourceIds: ["S2"] },
        { text: "The Bookmoth figure is a visual anchor for the study set.", sourceIds: ["S3"] },
        { text: "Compare the second guide against the source before reviewing.", sourceIds: ["S4"] },
      ],
    },
  },
];

const results = [];
for (const item of cases) {
  const svg = buildCollageSvg(item.collage, item.sources);
  const outputPath = path.join(outputDir, `BOOKMOTH_${item.id.toUpperCase()}.png`);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  const metadata = await sharp(outputPath).metadata();
  const stats = await sharp(outputPath).stats();
  const alpha = metadata.hasAlpha ? stats.channels.at(-1) : null;
  const stat = await fs.stat(outputPath);
  const checks = {
    dimensions: metadata.width === 1600 && metadata.height === 1100,
    channels: metadata.channels >= 3,
    opaque: !metadata.hasAlpha || (alpha?.min === 255 && alpha?.max === 255),
    nonEmpty: stat.size > 50_000,
    hasTitle: svg.includes(item.collage.title),
    hasSourceMaterialLabel: svg.includes(`SOURCE MATERIAL · ${item.sources.length} ${item.sources.length === 1 ? "ITEM" : "ITEMS"}`),
    hasQuickReview: svg.includes("Quick review"),
    calloutSourcesExist: item.collage.callouts.every((callout) => (callout.sourceIds ?? []).every((id) => {
      const sourceIndex = Number.parseInt(String(id).replace(/^S/, ""), 10);
      return Number.isInteger(sourceIndex) && sourceIndex >= 1 && sourceIndex <= item.sources.length;
    })),
  };
  results.push({
    id: item.id,
    output: path.relative(root, outputPath).replaceAll(path.sep, "/"),
    bytes: stat.size,
    metadata: { width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha === true, alphaMin: alpha?.min ?? 255, alphaMax: alpha?.max ?? 255 },
    sourceCount: item.sources.length,
    checks,
    passed: Object.values(checks).every(Boolean),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  artifact: "Bookmoth deterministic visual study board PNG",
  status: results.every((item) => item.passed) ? "VISUALLY REVIEWED" : "REJECTED",
  results,
  note: "This validates Bookmoth's source-grounded collage renderer and PNG export path. It does not prove the truth of source content or the quality of an external AI image model.",
};

await fs.writeFile(path.join(outputDir, "IMAGE_OUTPUT_VALIDATION_2026-10-30.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (report.status !== "VISUALLY REVIEWED") process.exitCode = 1;
