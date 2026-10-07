import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import { buildCollageSvg } from "../src/lib/collage-template.js";

const root = process.cwd();
const source = await fs.readFile(path.join(root, "public", "sample-notes.png"));
const outputDir = path.join(root, "docs", "validation");
await fs.mkdir(outputDir, { recursive: true });

const collage = {
  title: "Manual exposure at a glance",
  caption: "Use the source and four checkpoints to connect camera settings with visible results.",
  callouts: [
    { text: "Aperture affects incoming light and depth of field.", sourceIds: ["S1"] },
    { text: "Shutter speed affects exposure time and motion blur.", sourceIds: ["S1"] },
    { text: "ISO amplifies the captured signal and can reveal more noise.", sourceIds: ["S1"] },
    { text: "Choose the creative priority first, then balance the remaining controls.", sourceIds: ["S1"] },
  ],
};
const sources = [{
  name: "manual-exposure-guide.png",
  dataUrl: `data:image/png;base64,${Buffer.from(source).toString("base64")}`,
}];
const svg = buildCollageSvg(collage, sources);
const output = path.join(outputDir, "BOOKMOTH_EXPOSURE_STUDY_BOARD.png");
await sharp(Buffer.from(svg)).png().toFile(output);
console.log(output);
