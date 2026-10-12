# Bookmoth multi-subject live validation — 2026-10-11

Provider: ollama · qwen2.5vl:7b + gemma4:12b
Result: 10/10 subject fixtures passed; repeatability passed.

| Fixture | Subject route | Verification | Result | Time |
|---|---|---|---|---:|
| algebra-linear | Mathematics | verified | PASS | 10.9 s |
| english-grammar | Language arts | source-checked | PASS | 17.1 s |
| english-literary-device | Language arts | source-checked | PASS | 15.6 s |
| biology-cell-membrane | Science | source-checked | PASS | 8.1 s |
| chemistry-density | Science | source-checked | PASS | 8.8 s |
| physics-force | Science | source-checked | PASS | 12.6 s |
| world-history | History and civics | source-checked | PASS | 14.8 s |
| spanish-language | World language | source-checked | PASS | 17.6 s |
| earth-science-water-cycle | Science | source-checked | PASS | 8.4 s |
| computing-binary | Computing | source-checked | PASS | 20.3 s |

## Acceptance checks

Each fixture must return HTTP 200, choose the expected subject route, produce at least one detailed lesson with ordered steps and mistake corrections, preserve source IDs and exact evidence quotes, include the expected answer concepts, and pass the pack-wide consistency audit.

The algebra fixture must also pass Bookmoth's deterministic linear-equation solver and substitution check. It is repeated to confirm the verified answer and method remain stable.

## Truth boundary

This is a controlled operator matrix built from clear synthetic source images. It tests OCR, routing, explanation structure, evidence traceability, expected-answer coverage, and one deterministic class of algebra. It does not prove universal subject accuracy, handwriting performance, curriculum alignment, or learning improvement. Unsupported mathematical forms are labeled for manual review rather than falsely marked verified.
