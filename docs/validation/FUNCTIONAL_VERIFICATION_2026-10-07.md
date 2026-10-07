# Bookmoth functional verification — 2026-10-07

## User story

A learner adds an allowed screenshot or phone photo, describes the learning goal, confirms permitted study use, sends the image to the configured local vision provider, receives a source-linked learning pack, reviews every output view, and exports the result.

## Flow result

| Boundary | Status | Evidence |
|---|---|---|
| Web service | PASS | `http://127.0.0.1:4342/` returned HTTP 200. |
| Local provider | PASS | `GET /api/create` reported Ollama, `qwen2.5vl:7b`, `local: true`, and `ready: true`. Ollama port 11434 returned HTTP 200. |
| Image to API | PASS | The rotated phone-photo fixture completed with HTTP 200 in 4.7 seconds. |
| Source extraction | PASS | One source produced 12 concepts. Evaporation, condensation, precipitation, collection, and Sun were all present. |
| Grounding | PASS | Automated inspection found zero invalid citations and zero model-reported unclear fragments for the controlled fixture. |
| Browser upload | PASS | Chrome and the in-app browser accepted `phone-photo-2026-10-07.png`; the UI displayed it as source S1 at 614 KB. |
| Browser generation | PASS | The browser rendered `Water Cycle Review: evidence-locked study guide` from the uploaded fixture. |
| Result views | PASS | Study guide, Lantern trail, Report, Practice, Collage, and Source check rendered. |
| Error handling | PASS | Empty sources, missing permission, and an unsupported text file each returned HTTP 400 with the correct user-facing explanation. |
| Markdown export | PASS | Chrome wrote `photosynthesis-a-source-grounded-review.md` at 2,574 bytes; it contained source and verification language. |
| JSON export | PASS | Chrome wrote `bookmoth-learning-pack.json` at 4,506 bytes; it parsed successfully with one source, three concepts, three flashcards, and one practice item. |
| Collage export | PASS | Chrome wrote `bookmoth-collage.png` at 99,217 bytes. The exported image opened successfully and its source card, title, filename, and callouts were visually inspected. |
| Browser console | PASS | No warnings or errors appeared after generation, view switching, or exports. |
| Repository checks | PASS after repair | Seven Node tests, ESLint, and the Next.js 16.3.8 optimized build passed. |

## Defect found and repaired

The newly tracked `qa/run-phone-photo-validation.mjs` exposed that `eslint.config.mjs` applied browser and Node globals only to `**/*.js`. ESLint therefore reported `process`, `fetch`, and `console` as undefined in `.mjs` files even though they are valid globals in the test runtime.

The configuration now applies the same rules to `**/*.{js,mjs}`. `npm run check` passed after the correction.

## Limits

- This run uses one controlled synthetic phone photo. It does not establish accuracy for handwriting, equations, low light, damaged pages, or every real camera.
- The hardware camera and its browser permission prompt were not opened during this automated test.
- Real learner validation remains 0/5 sessions.
- Bookmoth remains a local web app. The public GitHub repository is not a hosted AI service.
