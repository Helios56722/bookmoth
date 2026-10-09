# Bookmoth

Bookmoth is an open-source learning studio for turning permitted screenshots and images into source-grounded study guides, reports, practice material, and visual collages.

The project is built for students, hobby learners, and people developing a new skill. It is not an answer service for live, timed, or proctored assessments. Generated material identifies its source images and exposes uncertain extraction so the learner can verify the result.

## What works in this MVP

- Upload up to eight PNG, JPG, or WebP screenshots.
- Record the topic, learning goal, and original source link.
- Generate a structured pack with a study guide, a source-linked Lantern trail, a report, flashcards, practice questions, and collage notes.
- Study with layered lessons containing a direct answer, full explanation, ordered breakdown, why the idea matters, a source-supported example, common mistakes, and a worked understanding check.
- Trace generated items back to source IDs.
- See whether each detailed lesson passed the source-ID, exact-quote, structure, and separate support-review gates.
- Review extracted text, confidence, unclear fragments, and cautions.
- Detect the original source language and optionally preserve a complete machine translation beside the original transcription.
- In cloud mode, run a separate global corroboration pass and open every cited web source from the Source check panel.
- See whether a pack is source-grounded only or has also been cross-checked with live web evidence.
- Export the pack as Markdown or JSON.
- Export a visual source collage as PNG.

## What makes Bookmoth its own product

Bookmoth's core is the **Lantern trail**, not a prompt box with several output buttons. It turns each source set into four inspectable layers:

- **Glow points** identify ideas the uploaded material actually supports.
- **Threads** show relationships between those ideas without inventing unsupported bridges.
- **Blind spots** preserve missing prerequisites, ambiguous OCR, and questions the screenshots cannot answer.
- **Recall loops** make the learner retrieve and reconstruct the material instead of rereading a summary.

The trail remains portable in the JSON and Markdown exports. This gives future mobile clients a stable learning object and gives contributors a non-AI structure they can improve independently of the model provider.

The app also includes a complete sample that works without a model and a web-app manifest for installation on supported browsers.

## Run locally

### Free local mode

Free local mode uses two installed Ollama models: `qwen2.5vl:7b` reads the images, and `qwen3.5:9b` drafts and reviews the detailed teaching. No API key is required, and the work stays on the local PC.

1. Install Node.js 24 and [Ollama](https://ollama.com/).
2. Install the local models once with `ollama pull qwen2.5vl:7b` and `ollama pull qwen3.5:9b` if they are not already present.
3. Run:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4342`. On Jaylan's Windows setup, double-click **Start Bookmoth.cmd**. The launcher checks Ollama and the required model before opening the app. Use **Stop Bookmoth.cmd** when finished.

Copy `.env.example` to `.env.local` only when you want to change the local model, context, timeout, or provider.

### Optional OpenAI mode

OpenAI is an optional cloud provider. Creating a key does not guarantee free API usage; new accounts use prepaid billing unless the account has an applicable credit grant. The current official minimum prepaid purchase is $5.

1. Create a standard project API key in the [OpenAI API dashboard](https://platform.openai.com/api-keys).
2. Copy `.env.example` to `.env.local`.
3. Set `BOOKMOTH_PROVIDER=openai`, paste the key after `OPENAI_API_KEY=`, and select a vision-capable Responses API model.
4. Keep `.env.local` private. Never commit the key or place it in client-side JavaScript.

See the official [OpenAI authentication guidance](https://developers.openai.com/api/reference/overview) and [prepaid billing guidance](https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing).

### Public Vercel mode

The hosted app uses Vercel AI Gateway with the deployment's automatic OIDC credential. This avoids storing an OpenAI key in the project. Gateway requests use the Vercel team's AI credits, so review the current balance and keep automatic top-up off unless the project owner intentionally enables it.

Both providers live behind `src/app/api/create/route.js` and return the same learning-pack schema. Cloud mode separates the work into source extraction and complete translation, global corroboration with traceable links, and evidence-locked teaching. Source selection is based on authority and proximity to the claim rather than country: original-language Chinese sources are prioritized for Chinese-origin subjects, while every other subject receives the same original-language treatment.

Local mode separates reading, teaching, and verification. The vision model transcribes each image. The teaching model drafts layered lessons from that extracted evidence, then performs a separate support review. Bookmoth rejects unknown source IDs, evidence quotes that do not appear in the cited OCR text, incomplete lesson structures, and subject vocabulary that is absent from the source. Rejected lessons receive one constrained correction pass. If expanded wording still fails, Bookmoth keeps the useful lesson grouping but rebuilds every factual answer from exact evidence instead of filling the gap from memory.

These checks verify that the displayed teaching is grounded in the supplied material. They do not prove absolute correctness. Cloud corroboration improves the evidence base, but linked sources and machine translation still require human review for high-stakes academic, medical, legal, financial, or safety decisions.

## Public deployment

Bookmoth is a Next.js application with a server API. GitHub Pages cannot run its image-analysis route or protect an AI-provider secret. The intended public setup is GitHub for version control and CI, connected to Vercel for the running service.

1. Sign in to Vercel and import `Helios56722/bookmoth`.
2. Keep the repository root as the project root. Vercel should detect Next.js.
3. Add `BOOKMOTH_PROVIDER=openai`, `OPENAI_BASE_URL=https://ai-gateway.vercel.sh/v1`, and `OPENAI_MODEL=openai/gpt-5-mini` as server-side environment variables for Production and Preview. Vercel supplies `VERCEL_OIDC_TOKEN` automatically.
4. Deploy the tested `main` branch.
5. Verify `/api/create` reports `ready: true`, then complete one permitted screenshot-to-pack test on the deployment.

The local Ollama provider is intentionally not a public-hosting backend; a Vercel function cannot reach a model running on Jaylan's PC. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the point-and-click release and verification checklist.

## Privacy boundary

Selected images remain in browser memory while you prepare the pack. In default local mode, clicking **Create learning pack** sends them only to Ollama on the same PC. In hosted mode, they pass through Vercel AI Gateway to the selected model provider under those services' terms. This repository does not add a database or generation history.

Do not upload private records, answer sheets, copyrighted material you are not allowed to process, or content from an active or proctored assessment.

## Mobile direction

The first release is a responsive web app with a portable learning-pack format. A later mobile client can reuse the same schema and provider boundary while adding camera capture, the operating-system share sheet, offline review, and notifications.

## Brand figure and ComfyUI sources

The current violet-and-amber moth hovering over an open book was generated locally in ComfyUI, selected from a documented concept pass, and integrated as the app's working brand figure. The editable API-format workflows, prompt brief, all four first-pass concepts, and three refinements are in [`brand/`](brand/).

The field-guide concept that produced unwanted lettering remains in the exploration archive and is not used in the interface. The selected image is a brand direction rather than trademark clearance or a final hand-drawn vector logo.

## Verification

```bash
npm run test
npm run lint
npm run build
```

The repository's automated workflow runs the same test, lint, and production-build checks on pushes and pull requests.

Verified locally on 2026-10-07 with Ollama `qwen2.5vl:7b`: a slightly rotated synthetic phone photo with mild blur and glare completed through the production API in 8.0 seconds. All five expected water-cycle terms were extracted, the result contained 12 source-linked concepts, and automated checks found zero invalid citations. The same fixture also completed through the browser interface. Seven unit tests, ESLint, the optimized Next.js build, desktop browser review, 390 × 844 responsive review, text-overflow checks, and the no-warning console check passed. See [`docs/validation/POLISH_AND_PHONE_PHOTO_REPORT_2026-10-07.md`](docs/validation/POLISH_AND_PHONE_PHOTO_REPORT_2026-10-07.md). This remains a controlled operator test, not proof of accuracy across handwriting, equations, damaged pages, low light, or all real phone photos.

A second complete functional pass on 2026-10-07 retested the live local provider, phone-photo upload, generation, all six learning-pack views, invalid-input responses, Markdown export, JSON export, collage export, browser console, tests, lint, and production build. It also repaired ESLint coverage for tracked `.mjs` QA scripts. See [`docs/validation/FUNCTIONAL_VERIFICATION_2026-10-07.md`](docs/validation/FUNCTIONAL_VERIFICATION_2026-10-07.md).

The deep-teaching pass completed across 2026-10-07 and 2026-10-08. A live photography source produced three structured lessons with five study steps, two mistake checks, and two verbatim evidence quotes each. The audit deliberately rejected familiar but unsupported additions such as `camera sensor`, `portrait`, and `proper exposure`; all three final lessons were rebuilt from exact source statements and passed the strict deterministic recheck. Ten tests, ESLint, the optimized build, desktop review, 390 × 844 review, overflow checks, and a clean browser console passed. See [`docs/validation/DEEP_TEACHING_AND_EVIDENCE_GATE_2026-10-07.md`](docs/validation/DEEP_TEACHING_AND_EVIDENCE_GATE_2026-10-07.md).

## Learner validation

The first validation round uses five short, anonymous usability sessions. Open `Open Learner Validation.cmd` on Windows for the local session recorder, or follow [`docs/validation/learner-test-guide.md`](docs/validation/learner-test-guide.md). The tracker stores records in the active browser and exports CSV or JSON; it does not send participant data anywhere.

Public testers can use the repository's **Learner feedback** issue form. Do not attach source screenshots, names, grades, student IDs, private course records, copyrighted materials, or active assessment questions.

Five sessions are directional usability evidence. They do not prove demand, learning improvement, or willingness to pay.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep accessibility, clear typography, source traceability, honest uncertainty, and academic integrity intact.

## License

MIT. See [LICENSE](LICENSE).
