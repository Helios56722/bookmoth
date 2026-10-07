import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const publicDir = path.join(root, "public");
const sourcePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(publicDir, "sample-camera-exposure.png");
const cameraPath = path.join(publicDir, "sample-camera-exposure.png");
const outputPath = path.join(publicDir, "sample-notes.png");

if (path.resolve(sourcePath) !== path.resolve(cameraPath)) {
  await sharp(sourcePath)
    .resize(1536, 1024, { fit: "cover" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(cameraPath);
}

const camera = await fs.readFile(cameraPath);
const cameraData = `data:image/png;base64,${camera.toString("base64")}`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#fffaf0"/>
      <stop offset="1" stop-color="#eadfce"/>
    </linearGradient>
    <linearGradient id="imageShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".45" stop-color="#1a1020" stop-opacity="0"/>
      <stop offset="1" stop-color="#1a1020" stop-opacity=".58"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#29192f" flood-opacity=".18"/>
    </filter>
    <clipPath id="photoClip"><rect x="58" y="204" width="714" height="486" rx="24"/></clipPath>
    <style>
      .eyebrow{font:700 16px Arial,sans-serif;letter-spacing:3px;fill:#8d6a91}
      .title{font:600 50px Georgia,serif;fill:#34233c}
      .subtitle{font:22px Arial,sans-serif;fill:#6f6075}
      .cardTitle{font:700 20px Arial,sans-serif;fill:#3c2b43}
      .cardBody{font:16px Arial,sans-serif;fill:#716475}
      .chip{font:700 14px Arial,sans-serif;letter-spacing:1.2px;fill:#fff8eb}
      .photoTitle{font:600 27px Georgia,serif;fill:#fff9ef}
      .photoCopy{font:16px Arial,sans-serif;fill:#e6dce8}
      .footer{font:700 18px Arial,sans-serif;fill:#5d4863}
    </style>
  </defs>

  <rect width="1200" height="800" fill="#e7dcc9"/>
  <rect x="28" y="28" width="1144" height="744" rx="34" fill="url(#paper)" filter="url(#shadow)"/>
  <rect x="28" y="28" width="13" height="744" rx="7" fill="#4b2b53"/>

  <text x="62" y="83" class="eyebrow">PHOTOGRAPHY · MANUAL CONTROL</text>
  <text x="60" y="141" class="title">Mastering exposure</text>
  <text x="62" y="178" class="subtitle">Shape brightness, motion, and depth with three connected controls.</text>

  <g clip-path="url(#photoClip)">
    <image href="${cameraData}" x="58" y="204" width="714" height="486" preserveAspectRatio="xMidYMid slice"/>
    <rect x="58" y="204" width="714" height="486" fill="url(#imageShade)"/>
    <text x="88" y="624" class="photoTitle">One scene. Three decisions.</text>
    <text x="88" y="655" class="photoCopy">Choose the look first, then balance the remaining controls.</text>
  </g>
  <rect x="58" y="204" width="714" height="486" rx="24" fill="none" stroke="#d8c6ad" stroke-width="2"/>

  <g transform="translate(802 204)">
    <g>
      <rect width="338" height="140" rx="20" fill="#fffdf7" stroke="#d8c7b1"/>
      <circle cx="44" cy="44" r="23" fill="#4b2b53"/>
      <path d="M44 27a17 17 0 1017 17H44z" fill="#f0b45a"/><circle cx="44" cy="44" r="7" fill="#fff8eb"/>
      <text x="82" y="43" class="cardTitle">Aperture</text>
      <text x="82" y="70" class="cardBody">Lens opening</text>
      <text x="24" y="108" class="cardBody">Affects light and depth of field.</text>
    </g>
    <g transform="translate(0 157)">
      <rect width="338" height="140" rx="20" fill="#fffdf7" stroke="#d8c7b1"/>
      <circle cx="44" cy="44" r="23" fill="#d49437"/>
      <path d="M27 44h34M45 31l16 13-16 13" fill="none" stroke="#fff8eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="82" y="43" class="cardTitle">Shutter speed</text>
      <text x="82" y="70" class="cardBody">Exposure time</text>
      <text x="24" y="108" class="cardBody">Affects light and motion blur.</text>
    </g>
    <g transform="translate(0 314)">
      <rect width="338" height="140" rx="20" fill="#fffdf7" stroke="#d8c7b1"/>
      <circle cx="44" cy="44" r="23" fill="#8d6a91"/>
      <g fill="#fff8eb"><circle cx="35" cy="36" r="3"/><circle cx="48" cy="33" r="2"/><circle cx="54" cy="45" r="3"/><circle cx="38" cy="50" r="2.5"/></g>
      <text x="82" y="43" class="cardTitle">ISO</text>
      <text x="82" y="70" class="cardBody">Signal amplification</text>
      <text x="24" y="108" class="cardBody">Affects brightness and visible noise.</text>
    </g>
  </g>

  <rect x="58" y="714" width="1082" height="38" rx="19" fill="#39283f"/>
  <text x="82" y="739" class="chip">EXPOSURE THINKING</text>
  <text x="266" y="739" class="chip">Pick the creative priority</text>
  <circle cx="501" cy="733" r="3" fill="#efba6c"/>
  <text x="526" y="739" class="chip">Meter the scene</text>
  <circle cx="704" cy="733" r="3" fill="#efba6c"/>
  <text x="729" y="739" class="chip">Balance the other controls</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outputPath);

console.log(`Rendered ${outputPath}`);
