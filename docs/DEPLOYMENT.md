# Bookmoth public deployment

Bookmoth needs a server runtime because `/api/create` reads images and calls the configured AI provider. GitHub stores and tests the code; Vercel runs it. The public default uses a key supplied by each learner instead of a shared Bookmoth key.

## Point-and-click setup

1. Open the Vercel dashboard and sign in with the account that should own Bookmoth.
2. Choose **Add New → Project**, then import `Helios56722/bookmoth` from GitHub.
3. Confirm **Framework Preset: Next.js** and leave **Root Directory** at the repository root.
4. In **Environment Variables**, add these non-secret values for Production and Preview:
   - `BOOKMOTH_PROVIDER` = `openrouter`
   - `OPENROUTER_MODEL` = `openrouter/free`
   - `OPENROUTER_FALLBACK_MODEL` = `openrouter/free`
5. Leave `OPENROUTER_API_KEY` unset. Public users connect their own keys in the interface.
6. Deploy the tested `main` branch.

Bookmoth keeps a user-supplied key in that browser tab's `sessionStorage` and forwards it per request. It does not write the key to a Bookmoth database. The key and uploaded screenshots pass through the Vercel function to OpenRouter and its selected provider. The connection check validates the key and queries OpenRouter's live catalog; it does not run image inference. At generation time Bookmoth checks for zero-cost models with image input and structured output, then sends an ordered model-fallback list with the dynamic free router as a final option. OpenRouter's returned model IDs are recorded in the response so Bookmoth can report which model handled image reading and teaching.

Fallback can recover from an individual model or provider failure. It cannot bypass an account-wide quota, make free inference unlimited, or guarantee an available model. Each public learner must supply their own OpenRouter key. Model catalog rankings are routing hints, not Bookmoth-specific accuracy evidence.

If the owner intentionally adds a shared provider key later, keep it server-side and never place it in GitHub files, screenshots, build logs, or a variable beginning with `NEXT_PUBLIC_`. Add rate limits, an abuse budget, and a privacy review before making shared-key generation public.

## Release gate

Before a production release:

1. Confirm GitHub Actions passed `npm run check` for the exact commit.
2. Open `https://YOUR-DOMAIN/api/create` without a key and confirm:
   - `provider` is `openrouter`;
   - `userKeyRequired` is `true`;
   - `ready` is `false` until the user connects a key;
   - `researchAvailable` is `false` and `translationAvailable` is `true`.
3. With a personal key connected, confirm the connection check reports whether the live compatible-model catalog loaded and lists fallback candidates. This checks the key/catalog, not image inference. Never paste the key into an issue, chat, screenshot, or log.
4. Upload one permitted, non-private screenshot and generate an English source-only pack. Confirm the response reports the actual image-reading and teaching model IDs, including when fallback occurred.
5. Generate a second pack with full source translation enabled.
6. Check the extracted source text, cited source IDs, uncertainty labels, and subject-specific method against the image.
7. Check desktop and phone widths, all six output tabs, Markdown export, JSON export, and the browser console.

## Honest limits

- Source grounding proves that displayed teaching matches the evidence Bookmoth received. It does not prove that the evidence is true.
- The free OpenRouter route is upload-grounded and does not perform live web corroboration.
- Machine translation can mishandle names, equations, quotations, and technical terms.
- Local Ollama mode supports private OCR, translation, teaching, and source checks, but it does not have live web research.
