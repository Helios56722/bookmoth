# Bookmoth global evidence, translation, and deployment validation

Date: 2026-10-08, updated 2026-10-09
Branch: `main`

## Release scope

- Separate source extraction, optional global research, and learning-pack generation stages.
- Full-source translation with original text retained beside the translation.
- Deterministic source-language detection and an incomplete-translation warning.
- A minimum readable-evidence gate that refuses image-only or extremely sparse inputs.
- Traceable web-research links and a visible research status in the interface.
- Output-language controls and global-research controls.
- Vercel deployment configuration and a point-and-click deployment runbook.

## Verified locally

### Automated checks

Command: `npm run check`

- 11 tests passed.
- ESLint passed.
- Next.js 16.3.8 production build passed.
- The build contains the static `/` route and server-rendered `/api/create` route.
- `npm audit --omit=dev` reported zero production vulnerabilities before release.

### Local provider status

- Provider: Ollama.
- Vision model: `qwen2.5vl:7b`.
- Teaching model: `qwen3.5:9b`.
- Translation available: yes.
- Live web research available: no; the interface says this explicitly.

### Text-rich source test

Input: `public/sample-notes.png`
Requested output: Spanish with full-source translation.

- Original language detected as English.
- Translation language reported as Spanish.
- Translation confidence reported as high.
- 592 original characters and 718 translated characters returned.
- Three source-checked lessons accepted and zero rejected.
- The first lesson explained shutter speed in Spanish and stayed within the supplied evidence.

### Insufficient-evidence refusal test

Input: `public/sample-camera-exposure.png`, a photo with almost no readable study text.

- The API returned HTTP 422.
- The response asked for a sharper, closer screenshot showing the question, notes, labels, or instructions.
- No learning pack was returned from the insufficient source.

### Browser checks

- Desktop viewport: 1405 by 1000; no horizontal overflow.
- Phone viewport: 390 by 844; no horizontal overflow.
- Evidence controls, verification ledger, and source panel were visible at both sizes.
- No browser console errors or page errors were recorded.
- Screenshots are stored under the ignored `.runtime/browser-qa` directory.

## Provider and deployment limits

- The public application is deployed at `https://bookmoth.vercel.app` in Vercel project `the-hive2/bookmoth`.
- Vercel AI Gateway is configured with `openai/gpt-5-mini`. The deployed function received its Vercel OIDC token and successfully reached AI Gateway.
- A real production generation request reached AI Gateway but was rejected with HTTP 403 and `customer_verification_required`. Vercel requires the team owner to add a valid payment card before the included monthly credits can service requests.
- `AI_GATEWAY_CREDITS_READY=false` is set in Production, Preview, and Development until that account step is complete. The public status endpoint therefore reports `ready: false`, and the interface disables generation instead of accepting a request that cannot complete.
- The repository is public and GitHub Actions runs continuous integration. Vercel CLI deployment works, but push-triggered Vercel deployment remains unavailable until the Vercel account adds a GitHub login connection and links `Helios56722/bookmoth`.
- Live translation and global research are implemented but remain unverified end to end in production until AI Gateway activation is complete.
- No AI system can guarantee absolute factual accuracy. Bookmoth reduces risk with source locking, exact evidence quotes, visible uncertainty, linked corroboration, and refusal when the input is too weak.

## Production release gate

Use `docs/DEPLOYMENT.md`. Do not call the public deployment complete until:

1. GitHub Actions passes for the exact release commit.
2. The Vercel team activates AI Gateway credits and `AI_GATEWAY_CREDITS_READY` is changed to `true`.
3. `/api/create` reports Vercel AI Gateway ready with research and translation available.
4. A permitted real screenshot passes both full translation and global corroboration tests.
5. At least two linked research sources are opened and checked by a person.
6. The Vercel account adds a GitHub login connection and links `Helios56722/bookmoth` for automatic push deployments.
