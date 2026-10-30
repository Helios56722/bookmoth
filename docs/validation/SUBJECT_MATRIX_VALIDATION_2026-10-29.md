# Bookmoth multi-subject live validation — 2026-10-29

Provider: ollama · qwen2.5vl:7b + gemma4:12b
Result: 22/22 subject fixtures passed; repeatability passed.

| Fixture | Subject route | Verification | Result | Time |
|---|---|---|---|---:|
| algebra-linear | Mathematics | verified | PASS | 1.4 s |
| english-grammar | Language arts | source-checked | PASS | 18.0 s |
| english-literary-device | Language arts | source-checked | PASS | 16.7 s |
| biology-cell-membrane | Science | source-checked | PASS | 8.4 s |
| chemistry-density | Science | verified | PASS | 1.3 s |
| physics-force | Science | verified | PASS | 1.3 s |
| world-history | History and civics | source-checked | PASS | 13.5 s |
| spanish-language | World language | source-checked | PASS | 19.5 s |
| earth-science-water-cycle | Science | source-checked | PASS | 9.1 s |
| computing-binary | Computing | source-checked | PASS | 21.6 s |
| math-fraction-addition | Mathematics | verified | PASS | 1.3 s |
| math-rectangle-measurement | Mathematics | verified | PASS | 1.2 s |
| english-active-passive | Language arts | verified | PASS | 1.2 s |
| english-claim-evidence | Language arts | source-checked | PASS | 9.8 s |
| biology-osmosis | Science | source-checked | PASS | 9.4 s |
| chemistry-molarity | Science | verified | PASS | 1.3 s |
| physics-speed | Science | verified | PASS | 1.2 s |
| history-chronology | History and civics | source-checked | PASS | 15.0 s |
| japanese-translation | World language | source-checked | PASS | 17.0 s |
| computing-python-loop | Computing | verified | PASS | 1.3 s |
| general-woodworking-sequence | General learning | source-checked | PASS | 14.6 s |
| music-note-values | General learning | source-checked | PASS | 15.6 s |

## Acceptance checks

Each fixture must return HTTP 200, choose the expected subject route, include expected answer concepts, produce detailed teaching with ordered steps and mistake corrections, preserve source IDs and exact evidence quotes, and pass the pack-wide consistency audit. Every topic also checks the study guide, Lantern trail, report, flashcards, practice, source check, 1600 × 1100 collage rendering, Markdown export, JSON normalization round-trip, and source references across output views.

The matrix covers 22 tasks across algebra, fractions, geometry, English grammar and interpretation, biology, chemistry, physics, history, Spanish, Japanese, earth science, computing, woodworking, and music. Algebra is repeated to check answer stability.

Timing for the final run: median 9.4 s, p90 19.5 s, max 21.6 s. Nine supported deterministic cases had a median end-to-end API time of 1.3 s, including OCR; 13 model-assisted cases had a median of 15.0 s. In a separate two-request concurrent probe, both requests succeeded (29.8 s and 35.5 s), showing substantial latency under light simultaneous model use.

After the concurrent probe, the RTX 4090 reported 18,934 MiB / 24,564 MiB used at 13% utilization. `ollama ps` showed Qwen2.5-VL 7B (5.7 GB) and Gemma 4 12B (8.4 GB) loaded fully on GPU for four more minutes. The only Python process identified was the Hermes CLI gateway, not ComfyUI. Windows did not attribute the full GPU total to processes, so the remainder is unknown.

A separate Spanish-only repeat exposed an intermittent translation fallback. When the displayed lesson exactly repeats its cited source quotes for an explicit translation task, Bookmoth now sets verification to `needs-review` and adds a warning. The final full-matrix Spanish run produced the expected answer, while a separate rerun triggered the warning. Translation reliability therefore remains an improvement area even though the final matrix run passed.

The Japanese-source collage was rendered and visually inspected for image placement, hierarchy, and text legibility: [japanese-collage-visual-review.png](japanese-collage-visual-review.png).

## Truth boundary

This is a controlled operator matrix built from clear synthetic source images. It tests OCR, routing, answer coverage, teaching structure, evidence traceability, output formats, deterministic checks for a bounded set of problem patterns, and algebra repeatability. `source-checked` means tied to supplied evidence, not independently confirmed true; `verified` is limited to the named deterministic patterns. It does not prove universal subject accuracy, handwriting performance, curriculum alignment, or learning improvement. Unsupported problem forms remain subject to manual review.
