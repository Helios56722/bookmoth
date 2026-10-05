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
- Explore a complete local sample without an API key.
- Install from a web-app manifest on supported browsers.

## Run locally

1. Install Node.js 24.
2. Copy `.env.example` to `.env.local`.
3. Add an OpenAI API key and a vision-capable Responses API model.
4. Run:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4342`.

On Windows, double-click **Start Bookmoth.cmd** for the same local launch and **Stop Bookmoth.cmd** when finished.

Bookmoth uses the OpenAI Responses API with image inputs and a strict JSON schema. The provider call lives only in `src/app/api/create/route.js`, which keeps a future provider adapter or self-hosted vision model practical.

## Privacy boundary

Selected images remain in browser memory while you prepare the pack. When you click **Create learning pack**, the images are sent to the AI provider configured by the person hosting Bookmoth. This repository does not add a database or generation history. Provider handling and retention still depend on the configured service and account settings.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep accessibility, clear typography, source traceability, honest uncertainty, and academic integrity intact.

## License

MIT. See [LICENSE](LICENSE).
