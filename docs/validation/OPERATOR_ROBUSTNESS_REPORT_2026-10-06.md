# Bookmoth operator robustness report — 2026-10-06

This is an operator QA pass, not learner validation. The five learner rows remain untested until five real participants complete the guided sessions.

## Material and method

Bookmoth processed three user-owned Windows 11 screenshots through the live local route at `http://127.0.0.1:4342/api/create` using Ollama and `qwen2.5vl:7b`.

| Case | Source | Result | Time | Source records | Concepts | Unclear flags |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Word plan | One Word document | HTTP 200 | 2.3 s | 1 | 16 | 0 |
| Two-document review | Two Word windows in one screenshot | HTTP 200 | 3.7 s | 1 | 24 | 0 |
| Recycle Bin | File Explorer with two deleted documents | HTTP 200 | 1.6 s | 1 | 24 | 0 |

The source JSON and exact generated packs are stored in `qa/operator-robustness-2026-10-06/`.

## Defect found and corrected

Large screenshots exposed two related failures in the local OCR path:

1. Passing the original full-resolution image could make Ollama abort before transcription.
2. Supplying a strict JSON Schema could trigger Ollama's token-repeat limit, and a screenshot containing two document windows could be returned as two model records even though it was one uploaded source.

The route now resizes images to a bounded OCR copy, analyzes one uploaded image at a time, requests ordinary JSON, merges accidental sub-records back into the one uploaded source, and retries as a plain transcription when structured output fails. The original browser image remains available for the learner's source review.

## Observed quality

- The single Word screenshot was transcribed accurately enough to preserve its headings, lists, and final revision line.
- The side-by-side screenshot captured both documents in reading order and kept them under one traceable source ID.
- The Recycle Bin screenshot captured filenames, original locations, dates, sizes, file types, and visible controls.
- The side-by-side result made small wording errors, including dropping “11” once and changing “complete words” to “specific words.”
- File Explorer chrome and sidebar labels become study concepts because they are visibly present. A future crop tool or region selector would reduce that noise.
- The model reported high confidence for all three cases and did not flag the small wording errors. Confidence calibration remains a priority validation risk.

## Decision

The local creation path now completes these three representative screenshot types. This supports continuing real learner sessions, but it does not satisfy the 5-person gate or establish OCR accuracy across handwriting, phone photos, equations, low-light images, or dense textbooks.

