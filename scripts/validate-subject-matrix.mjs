import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import sharp from "sharp";

const baseUrl = process.env.BOOKMOTH_TEST_URL || "http://127.0.0.1:4342";
const requestedIds = new Set(process.argv.slice(2));
const partialRun = requestedIds.size > 0;
const outputDir = path.resolve("docs/validation/subject-matrix-fixtures");
const reportJson = path.resolve(`docs/validation/SUBJECT_MATRIX_LIVE_RESPONSE_2026-10-11${partialRun ? "-partial" : ""}.json`);
const reportMarkdown = path.resolve(`docs/validation/SUBJECT_MATRIX_VALIDATION_2026-10-11${partialRun ? "-partial" : ""}.md`);

const fixtures = [
  {
    id: "algebra-linear",
    title: "Algebra practice",
    lines: ["Solve 4x - 7 = 21.", "Show each equivalent transformation.", "Check the answer by substitution."],
    context: "Algebra homework review after class",
    goal: "Solve the equation step by step and check the final value.",
    domain: "mathematics",
    expected: [/x\s*=\s*7/i, /21\s*=\s*21/i],
    verification: "verified",
  },
  {
    id: "english-grammar",
    title: "Language arts: sentence analysis",
    lines: ["Sentence: The curious fox jumps swiftly.", "Identify the complete subject and complete predicate.", "Name the adjective and the adverb."],
    context: "English grammar practice",
    goal: "Break down what each part is, how it functions, and why.",
    domain: "language-arts",
    expected: [/curious fox/i, /jumps swiftly/i, /adjective/i, /adverb/i],
  },
  {
    id: "english-literary-device",
    title: "Close reading",
    lines: ["Line: The classroom was a zoo after lunch.", "Identify the literary device.", "Explain which exact words create the comparison and what the comparison suggests."],
    context: "English literary analysis",
    goal: "Name the device and explain how the evidence supports the interpretation.",
    domain: "language-arts",
    expected: [/metaphor/i, /classroom/i, /zoo/i],
  },
  {
    id: "biology-cell-membrane",
    title: "Biology notes",
    lines: ["The cell membrane is selectively permeable.", "It controls which substances enter and leave the cell.", "This helps the cell maintain a stable internal environment."],
    context: "Introductory biology",
    goal: "Explain what the membrane does, how it works according to the notes, and why it matters.",
    domain: "science",
    expected: [/selectively permeable/i, /enter and leave/i, /stable internal environment/i],
  },
  {
    id: "chemistry-density",
    title: "Chemistry calculation",
    lines: ["Density = mass / volume", "A sample has a mass of 24 g and a volume of 8 cm^3.", "Calculate the sample's density and include units."],
    context: "Chemistry calculation practice",
    goal: "Show the formula, substitution, units, calculation, and answer check.",
    domain: "science",
    expected: [/24/i, /8/i, /3\s*g/i, /cm/i],
  },
  {
    id: "physics-force",
    title: "Physics notes",
    lines: ["Newton's second law: F = m × a", "Mass = 6 kg", "Acceleration = 2 m/s^2", "Calculate the net force and preserve the units."],
    context: "Physics force calculation",
    goal: "Explain the variables, substitute the values, solve, and check the unit.",
    domain: "science",
    expected: [/12\s*n/i, /6\s*kg/i, /2\s*m\/s/i],
  },
  {
    id: "world-history",
    title: "Treaty of Versailles source notes",
    lines: ["The Treaty of Versailles was signed on June 28, 1919.", "It formally ended the state of war between Germany and most Allied Powers.", "The notes list territorial changes, military restrictions, and reparations among its terms."],
    context: "World history timeline and source analysis",
    goal: "Explain who, what, when, and the listed terms without adding unsupported causes.",
    domain: "history",
    expected: [/june 28,? 1919/i, /germany/i, /allied powers/i, /reparations/i],
  },
  {
    id: "spanish-language",
    title: "Spanish language practice",
    lines: ["Sentence: Ayer, María caminó al mercado.", "Translate the sentence into English.", "Identify the tense of caminó and explain what Ayer tells the reader."],
    context: "Beginner Spanish translation and grammar",
    goal: "Translate accurately and explain the tense and time marker.",
    domain: "world-language",
    expected: [/yesterday/i, /mar[ií]a walked/i, /preterite|past tense/i],
  },
  {
    id: "earth-science-water-cycle",
    title: "Earth science: water cycle",
    lines: ["Evaporation changes liquid water into water vapor.", "Condensation changes water vapor into liquid droplets.", "Precipitation returns water from clouds to Earth's surface."],
    context: "Earth science process review",
    goal: "Explain what happens at each stage and keep the direction of each change correct.",
    domain: "science",
    expected: [/liquid water/i, /water vapor/i, /liquid droplets/i, /earth's surface/i],
  },
  {
    id: "computing-binary",
    title: "Computing fundamentals",
    lines: ["Binary uses powers of two as place values.", "From right to left, the first four place values are 1, 2, 4, and 8.", "The binary number 1011 has 1s in the 8, 2, and 1 places."],
    context: "Computer science number systems",
    goal: "Explain how the place values work and show why 1011 represents eleven.",
    domain: "computing",
    expected: [/powers of two/i, /8/i, /2/i, /1/i, /eleven|11/i],
  },
];

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

async function renderFixture(fixture) {
  const wrapLine = (line, limit = 74) => {
    const words = line.split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
      if (!current || `${current} ${word}`.length <= limit) current = current ? `${current} ${word}` : word;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    return lines;
  };
  const rows = [
    { line: fixture.title, title: true },
    ...fixture.lines.flatMap((line) => wrapLine(line).map((wrapped) => ({ line: wrapped, title: false }))),
  ];
  let y = 115;
  const text = rows.map((row) => {
    const size = row.title ? 48 : 32;
    const weight = row.title ? 700 : 500;
    const color = row.title ? "#2f2136" : "#3f3544";
    const output = `<text x="92" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(row.line)}</text>`;
    y += row.title ? 92 : 65;
    return output;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#fffaf0"/><rect x="54" y="48" width="1492" height="804" rx="22" fill="none" stroke="#c8abc9" stroke-width="4"/>${text}</svg>`;
  const filePath = path.join(outputDir, `${fixture.id}.png`);
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  return filePath;
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

async function runFixture(fixture) {
  const filePath = await renderFixture(fixture);
  const dataUrl = `data:image/png;base64,${(await fs.readFile(filePath)).toString("base64")}`;
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sources: [{ name: `${fixture.id}.png`, type: "image/png", dataUrl }],
      context: fixture.context,
      goal: fixture.goal,
      referenceUrl: "",
      outputLanguage: "English",
      translateFullSource: false,
      researchMode: false,
      studyUseAccepted: true,
    }),
  });
  const payload = await response.json();
  const elapsedMs = Date.now() - startedAt;
  if (!response.ok) {
    return { id: fixture.id, passed: false, httpStatus: response.status, elapsedMs, error: payload.error || "Unknown API error" };
  }
  const pack = payload.pack;
  const teachingText = normalize(JSON.stringify(pack.deepLessons));
  const checks = {
    http200: response.status === 200,
    domain: pack.subjectProfile?.domain === fixture.domain,
    verification: fixture.verification
      ? pack.subjectProfile?.answerVerification?.status === fixture.verification
      : ["source-checked", "verified"].includes(pack.subjectProfile?.answerVerification?.status),
    consistency: pack.consistencyReview?.status === "passed",
    detailedLessons: Array.isArray(pack.deepLessons) && pack.deepLessons.length > 0
      && pack.deepLessons.every((lesson) => lesson.steps?.length >= 3 && lesson.commonMistakes?.length >= 2),
    expectedContent: fixture.expected.every((pattern) => pattern.test(teachingText)),
    traceableEvidence: pack.deepLessons.every((lesson) => lesson.sourceIds?.length > 0 && lesson.evidenceQuotes?.length > 0),
  };
  return {
    id: fixture.id,
    passed: Object.values(checks).every(Boolean),
    httpStatus: response.status,
    elapsedMs,
    checks,
    expectedPatterns: fixture.expected.map((pattern) => pattern.toString()),
    subjectProfile: pack.subjectProfile,
    evidenceReview: pack.evidenceReview,
    consistencyReview: pack.consistencyReview,
    sourceText: pack.sources?.[0]?.extractedText,
    lessons: pack.deepLessons,
  };
}

await fs.mkdir(outputDir, { recursive: true });
const provider = await fetch(`${baseUrl}/api/create`).then((response) => response.json());
const results = [];
const selectedFixtures = partialRun ? fixtures.filter((fixture) => requestedIds.has(fixture.id)) : fixtures;
if (selectedFixtures.length === 0) throw new Error("No requested subject fixtures matched.");
for (const fixture of selectedFixtures) {
  process.stdout.write(`Testing ${fixture.id}... `);
  const result = await runFixture(fixture);
  results.push(result);
  process.stdout.write(`${result.passed ? "PASS" : "FAIL"} (${(result.elapsedMs / 1000).toFixed(1)}s)\n`);
}

const stabilityFixture = fixtures[0];
const original = results.find((result) => result.id === stabilityFixture.id);
let repeat = null;
let stable = partialRun && !original ? null : false;
if (!partialRun || original) {
  process.stdout.write(`Repeating ${stabilityFixture.id} for stability... `);
  repeat = await runFixture(stabilityFixture);
  stable = Boolean(original?.passed && repeat.passed
    && original.subjectProfile?.domain === repeat.subjectProfile?.domain
    && original.subjectProfile?.answerVerification?.expectedAnswer === repeat.subjectProfile?.answerVerification?.expectedAnswer
    && original.lessons?.[0]?.directAnswer === repeat.lessons?.[0]?.directAnswer);
  process.stdout.write(`${stable ? "PASS" : "FAIL"} (${(repeat.elapsedMs / 1000).toFixed(1)}s)\n`);
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  provider,
  totals: {
    cases: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
  },
  stability: {
    fixture: stabilityFixture.id,
    passed: stable,
    firstAnswer: original?.lessons?.[0]?.directAnswer || "",
    secondAnswer: repeat?.lessons?.[0]?.directAnswer || "",
    firstVerification: original?.subjectProfile?.answerVerification,
    secondVerification: repeat?.subjectProfile?.answerVerification,
  },
  results,
};
await fs.writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const markdown = [
  "# Bookmoth multi-subject live validation — 2026-10-11",
  "",
  `Provider: ${provider.provider || "unknown"} · ${provider.model || "unknown"}${provider.teachingModel ? ` + ${provider.teachingModel}` : ""}`,
  `Result: ${report.totals.passed}/${report.totals.cases} subject fixtures passed; repeatability ${stable === null ? "not run" : stable ? "passed" : "failed"}.`,
  "",
  "| Fixture | Subject route | Verification | Result | Time |",
  "|---|---|---|---|---:|",
  ...results.map((result) => `| ${result.id} | ${result.subjectProfile?.label || "Unavailable"} | ${result.subjectProfile?.answerVerification?.status || "Unavailable"} | ${result.passed ? "PASS" : "FAIL"} | ${(result.elapsedMs / 1000).toFixed(1)} s |`),
  "",
  "## Acceptance checks",
  "",
  "Each fixture must return HTTP 200, choose the expected subject route, produce at least one detailed lesson with ordered steps and mistake corrections, preserve source IDs and exact evidence quotes, include the expected answer concepts, and pass the pack-wide consistency audit.",
  "",
  "The algebra fixture must also pass Bookmoth's deterministic linear-equation solver and substitution check. It is repeated to confirm the verified answer and method remain stable.",
  "",
  "## Truth boundary",
  "",
  "This is a controlled operator matrix built from clear synthetic source images. It tests OCR, routing, explanation structure, evidence traceability, expected-answer coverage, and one deterministic class of algebra. It does not prove universal subject accuracy, handwriting performance, curriculum alignment, or learning improvement. Unsupported mathematical forms are labeled for manual review rather than falsely marked verified.",
  "",
];
await fs.writeFile(reportMarkdown, markdown.join("\n"), "utf8");

console.log(`Report: ${reportMarkdown}`);
console.log(`Full results: ${reportJson}`);
if (report.totals.failed > 0 || stable === false) process.exitCode = 1;
