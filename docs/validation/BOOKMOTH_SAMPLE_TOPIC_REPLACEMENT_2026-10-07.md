# Bookmoth Sample Topic Replacement — 2026-10-07

## Decision

The photosynthesis sample is rejected and superseded. Its layout improved, but the plant-and-sun illustration still read as basic clip art and did not meet the intended product standard.

The replacement test topic is manual photography exposure. It demonstrates Bookmoth with a hobby-learning subject and a more credible visual centerpiece.

## Corrected artifacts

- Generated camera still life: `public/sample-camera-exposure.png`
- Typeset source card: `public/sample-notes.png`
- Repeatable source renderer: `scripts/render-sample-source.mjs`
- Updated sample learning pack: `src/lib/bookmoth.js`
- Updated sample loader: `src/app/page.js`
- Updated collage reference renderer: `scripts/render-collage-reference.mjs`
- Full-resolution study board: `docs/validation/BOOKMOTH_EXPOSURE_STUDY_BOARD.png`

The camera artwork contains no generated instructional text. All headings, labels, explanations, and review statements are applied by the controlled renderer.

## Deliverable Quality Control evidence

Artifact and version: Bookmoth manual-exposure sample V1  
Status: `VISUALLY REVIEWED`; Jaylan approval is pending  
Intended context and size: 1200 × 800 source PNG inside the 1600 × 1100 study-board export and responsive Bookmoth interface  
Full-resolution review: The source card and study board were opened at original resolution. The camera remains coherent, the lens and aperture ring read clearly, the warm lighting is deliberate, and the source card has a balanced image-to-text ratio.  
Wording and typography review: Aperture, shutter-speed, and ISO wording was checked for accuracy. Text is typeset separately from the generated artwork. No clipping, collisions, negative body tracking, or bunched words were observed.  
Browser review: The live sample loaded `sample-notes.png`, displayed `Manual exposure at a glance`, contained no photosynthesis wording, and had no horizontal overflow at the default 1405-pixel width or the 390 × 844 phone viewport.  
Console review: No browser warnings or errors were present during the final phone check.  
Remaining limits: The artwork is an illustrative scene rather than a photograph of a specific real camera. The generated camera controls contain tiny non-instructional dial markings that are not used as study evidence. This is one sample topic and not learner validation.  
User approval state: Pending review of the photography revision.

## Verification

- `npm run check`: passed.
- Tests: eight passing.
- ESLint: passed.
- Next.js 16.3.8 optimized build: passed.
- Reference renderer: produced `BOOKMOTH_EXPOSURE_STUDY_BOARD.png`.
- Live topic check: new topic present; rejected topic absent.
