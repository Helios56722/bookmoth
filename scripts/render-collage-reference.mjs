import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import { buildCollageSvg } from "../src/lib/collage-template.js";

const root = process.cwd();
const source = await fs.readFile(path.join(root, "public", "sample-notes.svg"));
const outputDir = path.join(root, "docs", "validation");
await fs.mkdir(outputDir, { recursive: true });

const collage = {
  title: "Photosynthesis at a glance",
  caption: "Use the source and four checkpoints as a quick visual review.",
  callouts: [
    { text: "Light, water, and carbon dioxide are the inputs.", sourceIds: ["S1"] },
    { text: "Chlorophyll captures light energy inside chloroplasts.", sourceIds: ["S1"] },
    { text: "The process stores captured energy in glucose.", sourceIds: ["S1"] },
    { text: "Oxygen is released as a product.", sourceIds: ["S1"] },
  ],
};
const sources = [{
  name: "photosynthesis-study-map.svg",
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`,
}];
const svg = buildCollageSvg(collage, sources);
const output = path.join(outputDir, "BOOKMOTH_VISUAL_STUDY_BOARD_V2.png");
await sharp(Buffer.from(svg)).png().toFile(output);
console.log(output);
