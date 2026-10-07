# Bookmoth

Bookmoth is an open-source learning studio for turning permitted screenshots and images into source-grounded study guides, reports, practice material, and visual collages.

The project is built for students, hobby learners, and people developing a new skill. It is not an answer service for live, timed, or proctored assessments. Generated material identifies its source images and exposes uncertain extraction so the learner can verify the result.

## What works in this MVP

- Upload up to eight PNG, JPG, or WebP screenshots.
- Record the topic, learning goal, and original source link.
- Generate a structured pack with a study guide, a source-linked Lantern trail, a report, flashcards, practice questions, and collage notes.
- Trace generated items back to source IDs.
- Review extracted text, confidence, unclear fragments, and cautions.
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

The default provider is the installed Ollama vision model `qwen2.5vl:7b`. No API key is required, and screenshot analysis stays on the local PC.

1. Install Node.js 24 and [Ollama](https://ollama.com/).
2. Install the vision model once with `ollama pull qwen2.5vl:7b` if it is not already present.
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

Both provider calls live in `src/app/api/create/route.js` and return the same learning-pack schema.

Local mode uses the vision model to transcribe the images, then applies an evidence lock: factual answers reuse the extracted source lines instead of asking the model to fill gaps from memory. It intentionally leaves relationships unconnected when the source does not state them. OpenAI mode remains the more interpretive optional route and should still be checked against the cited images.

## Privacy boundary

Selected images remain in browser memory while you prepare the pack. In default local mode, clicking **Create learning pack** sends them only to Ollama on the same PC. In optional OpenAI mode, they are sent to OpenAI under the configured account's provider terms. This repository does not add a database or generation history.

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

## Learner validation

The first validation round uses five short, anonymous usability sessions. Open `Open Learner Validation.cmd` on Windows for the local session recorder, or follow [`docs/validation/learner-test-guide.md`](docs/validation/learner-test-guide.md). The tracker stores records in the active browser and exports CSV or JSON; it does not send participant data anywhere.

Public testers can use the repository's **Learner feedback** issue form. Do not attach source screenshots, names, grades, student IDs, private course records, copyrighted materials, or active assessment questions.

Five sessions are directional usability evidence. They do not prove demand, learning improvement, or willingness to pay.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep accessibility, clear typography, source traceability, honest uncertainty, and academic integrity intact.

## License

MIT. See [LICENSE](LICENSE).
