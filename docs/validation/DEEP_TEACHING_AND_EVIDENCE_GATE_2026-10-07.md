# Bookmoth deep teaching and evidence-gate report — 2026-10-07

## Outcome

Bookmoth now turns a readable source into layered lessons with a direct answer, explanation, ordered study steps, why the lesson matters, a recall exercise, common mistakes, an understanding check, exact evidence quotes, source IDs, and a visible verification result.

The first expanded photography draft contained familiar-sounding details that were absent from the uploaded source, including references to a camera sensor, a portrait, and proper exposure. Those drafts were rejected during the audit. The final route adds a deterministic source-vocabulary check and a source-lock recovery step. When expanded wording fails, Bookmoth keeps the useful lesson grouping but rebuilds factual answers from exact source statements.

## Local model path

1. `qwen2.5vl:7b` reads each image and returns source text with confidence and unclear fragments.
2. `qwen3.5:9b` drafts one to four detailed lessons.
3. A separate `qwen3.5:9b` review checks each lesson against the complete cited source.
4. Deterministic checks reject unknown source IDs, non-verbatim evidence quotes, incomplete lesson structures, and subject vocabulary absent from the source.
5. Rejected lessons receive one constrained source-lock edit and a second review.
6. Any remaining rejected lesson is rebuilt from its verified evidence quotes. If usable quotes are absent, Bookmoth returns the exact-evidence fallback instead of inventing an explanation.

## Live controlled result

The production API processed `public/sample-notes.png` at `http://127.0.0.1:4342/api/create` with the installed Ollama models.

| Check | Result |
|---|---|
| HTTP result | 200 |
| Elapsed time | 34.3 seconds |
| OCR model | `qwen2.5vl:7b` |
| Teaching and review model | `qwen3.5:9b` |
| Source images | 1 |
| Detailed lessons | 3 |
| Deterministic recheck | 3 of 3 accepted |
| Lesson structure | 5 steps and 2 common mistakes per lesson |
| Evidence | 2 verbatim quotes per lesson |
| Final verification | `source-checked` |

All three expanded drafts failed at least one evidence rule and were rebuilt from exact source statements. The final factual answers are:

- Aperture: `Wider: more light, shallower depth. Narrower: less light, deeper depth.`
- Shutter speed: `Faster: less light, freezes motion. Slower: more light, shows motion blur.`
- ISO: `Higher: brighter, more visible noise. Lower: less noise, needs more light.`

The complete live response is saved in `DEEP_TEACHING_LIVE_RESPONSE_2026-10-07.json`. The generated Markdown artifact is saved in `DEEP_TEACHING_LIVE_EXPORT_2026-10-07.md`.

## Interface review

- The built-in sample now uses the same source-lock method as the live route instead of displaying hand-written details that the sample image does not state.
- Default browser width: three lesson cards rendered at 713 pixels wide with no horizontal overflow.
- Phone review at 390 × 844: lesson cards rendered at 307 pixels wide with no horizontal overflow.
- Lesson paragraphs render at 14.4 pixels with a 25.2-pixel line height, keeping dense explanations readable and separated.
- The evidence status, direct answer, learning objective, five study steps, mistakes, check, and evidence drawer remained readable on desktop and phone.
- Browser warnings and errors: none in the final pass.

Status: `VISUALLY REVIEWED`. Jaylan has not yet approved this revision as final product quality.

## Automated verification

`npm run check` passed:

- 10 of 10 Node tests
- ESLint
- Next.js 16.3.8 optimized production build

The new regression test proves that the source-lock builder preserves the full lesson structure, accepts exact evidence, and rejects added terms such as `camera` and `sensor` when those words are absent from the source.

## Truth boundary and remaining work

- `source-checked` means the displayed lesson is grounded in the supplied text. It does not prove that the supplied text is accurate.
- OCR still needs comparison with the original image, especially for handwriting, equations, glare, damaged pages, and dense multi-column layouts.
- This report covers one controlled photography source and operator testing. It does not establish accuracy across subjects.
- Real learner evidence remains 0 of 5 planned sessions.
- Bookmoth remains a local app. The public GitHub repository does not make the AI service publicly usable.
- The source-lock recovery is deliberately conservative. Thin sources produce structured study help without outside facts; deeper subject teaching requires richer supplied material or a future cited research mode.
