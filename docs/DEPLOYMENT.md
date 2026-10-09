# Bookmoth public deployment

Bookmoth needs a server runtime because `/api/create` reads images, calls the configured AI provider, and keeps the provider credential away from the browser. GitHub stores and tests the code; Vercel runs it.

## Point-and-click setup

1. Open the Vercel dashboard and sign in with the account that should own Bookmoth.
2. Choose **Add New → Project**, then import `Helios56722/bookmoth` from GitHub.
3. Confirm **Framework Preset: Next.js** and leave **Root Directory** at the repository root.
4. In **Environment Variables**, add these non-secret values for Production and Preview:
   - `BOOKMOTH_PROVIDER` = `openai`
   - `OPENAI_BASE_URL` = `https://ai-gateway.vercel.sh/v1`
   - `OPENAI_MODEL` = `openai/gpt-5-mini`
   - `AI_GATEWAY_CREDITS_READY` = `true` after the team has activated AI Gateway credits
5. Open the team's AI Gateway page and activate the included free-credit tier. Vercel currently requires a valid payment card on the team before it will service requests, even when usage stays within the free monthly credit.
6. Deploy `main`.

Vercel supplies `VERCEL_OIDC_TOKEN` to deployments automatically, so Bookmoth does not need a provider key in the project. AI Gateway usage consumes the team's gateway credits. If a direct provider key is intentionally used later, keep it server-side and never place it in GitHub files, browser code, screenshots, build logs, or a variable beginning with `NEXT_PUBLIC_`.

Keep `AI_GATEWAY_CREDITS_READY=false` until the team finishes gateway activation. The public interface will then report the real setup state and disable generation instead of accepting work that cannot complete.

## Release gate

Before a production release:

1. Confirm GitHub Actions passed `npm run check` for the exact commit.
2. Open `https://YOUR-DOMAIN/api/create` and confirm:
   - `provider` is `vercel-ai-gateway`;
   - `ready` is `true`;
   - `researchAvailable` and `translationAvailable` are `true`.
3. Upload one permitted, non-private screenshot.
4. Generate an English source-only pack.
5. Generate a second pack with full translation and global research enabled.
6. Open at least two linked corroboration sources and compare the pack's claims with them.
7. Check desktop and phone widths, all six output tabs, Markdown export, JSON export, and the browser console.

## Honest limits

- Source grounding proves that displayed teaching matches the evidence Bookmoth received. It does not prove that the evidence is true.
- Global corroboration raises confidence only when strong independent sources agree.
- Machine translation can mishandle names, equations, quotations, and technical terms.
- Local Ollama mode supports private OCR, translation, teaching, and source checks, but it does not have live web research.
