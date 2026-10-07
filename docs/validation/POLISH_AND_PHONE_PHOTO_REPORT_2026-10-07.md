# Bookmoth polish and phone-photo report — 2026-10-07

## Design read

Product interface for students and independent learners, using Bookmoth's existing dark field-guide visual language. The pass preserves the brand while making capture guidance and dense results easier to read.

- Dials: variance 5 / motion 2 / density 6
- Taste rules used: readable type, stable hierarchy, narrow-screen checks, complete product state, restrained motion
- Taste rules excluded: marketing-page section experiments and decorative motion because the workspace is a task-focused product interface

## Changes

- Added a three-step photo checklist beside camera capture.
- Replaced global `overflow-wrap: anywhere` with balanced headings and normal word boundaries.
- Increased small labels, source metadata, provider status, helper copy, and source-pill sizes.
- Increased wrapped heading line height and reduced compressed display tracking.
- Enlarged the source remove control to a 44 × 44 px touch target.
- Added normal body tracking and font smoothing.

## Automated result

`npm run check` passed:

- 7/7 Node tests
- ESLint
- Next.js 16.3.8 production build

## Browser result

- Desktop workspace checked after the changes.
- 390 × 844 phone viewport checked.
- Document width matched viewport width; no horizontal page overflow.
- No checked heading, paragraph, label, button, list item, or helper text exceeded its rendered width unless it deliberately used `white-space: nowrap`.
- No browser console errors or warnings were observed.
- The complete browser flow accepted the phone-photo fixture and displayed the generated source-linked learning pack.

## Live local AI result

The synthetic phone-photo fixture in `qa/phone-photo-2026-10-07.png` simulates a slightly rotated sheet on a dark surface with mild blur and glare. It contains five water-cycle facts and one study goal.

- Provider: local Ollama
- Model: `qwen2.5vl:7b`
- HTTP status: 200
- Time: 8.0 seconds
- Sources: 1
- Concepts: 12
- Expected terms found: evaporation, condensation, precipitation, collection, Sun
- Invalid source citations: 0
- Model-reported unclear fragments: 0

The exact response is stored in `qa/phone-photo-validation-2026-10-07.json`.

## Limit

This is an operator test with a controlled synthetic photo. It does not replace the five real learner sessions and does not prove accuracy on handwriting, equations, damaged pages, low light, or real phone-camera glare. Learner validation remains 0/5.
