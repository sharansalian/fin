# Pocket

Read-later web app with AI summaries and text-to-speech. Built with React + Firebase + Cloud Functions.

## Quick Commands

```bash
npm run dev          # Start Vite dev server (web app)
npm run build        # Production build → dist/
npm run build:ext    # Build Chrome extension → extension/popup.bundle.js
npm run lint         # ESLint (flat config, JS/JSX only)
```

### Cloud Functions (in `functions/`)

```bash
cd functions && npm ci           # Install function dependencies (Node 20)
firebase emulators:start         # Local emulator
firebase deploy --only functions # Deploy all functions
```

### React Native (in `apps/pocket-native/`)

```bash
cd apps/pocket-native && npx expo start   # Start Expo dev server
```

## Project Structure

```
src/                  # React web app (Vite + React 19)
├── components/       # Shared UI (ArticleCard, AddArticleModal, ShareModal, etc.)
├── pages/            # Route pages (MyList, Reader, Archive, Favorites, Tags, Premium, etc.)
├── context/          # AuthContext, ThemeContext
├── hooks/            # useScrollRestore
├── firebase/         # Firebase client config
└── utils/            # Helpers

functions/            # Firebase Cloud Functions (Node 20, CommonJS)
├── index.js          # All exports: fetchArticle, summarizeArticle, readArticle,
│                     #   sharePreview, onArticleFavoriteChange, approveSupportRequest,
│                     #   createCheckout, lemonWebhook

extension/            # Chrome extension (MV3)
├── manifest.json
├── src/popup.js      # Source → built via vite.config.extension.js
└── popup.bundle.js   # Built IIFE bundle

apps/
├── pocket-native/    # React Native / Expo app (scaffolded, WIP)
└── template/         # App template

packages/
└── core/             # Shared package (@pocket/core) — firebase, utils, context exports

docs/                 # Business analysis PDF
scripts/              # Build/generation scripts
```

## Tech Stack

- **Frontend**: React 19, React Router 7, Vite 7, CSS Modules, Framer Motion
- **Backend**: Firebase (Auth, Firestore, Hosting, Cloud Functions v2)
- **AI**: Groq (LLM summaries via LangGraph), HuggingFace Kokoro (TTS)
- **Payments**: Lemon Squeezy (checkout + webhooks)
- **Monorepo**: npm workspaces + Turborepo
- **CI/CD**: GitHub Actions → Firebase Hosting + gcloud functions deploy

## Firebase Project

- Project ID: `finn-2c4c5`
- Default branch: `master`
- Hosting: serves from `dist/`, SPA fallback to `index.html`
- Rewrites: `/p/**` → `sharePreview` Cloud Function (OG meta for link previews)
- Firestore: `users/{uid}/articles/{id}`, `shares/{code}`, `articleStats/{id}`, `supportRequests/{id}`

## Code Conventions

- JavaScript only (no TypeScript in web app or functions)
- ES Modules (`"type": "module"` in root package.json), except `functions/` which is CommonJS
- CSS Modules for component styles (`Component.module.css`)
- Flat ESLint config (`eslint.config.js`): `no-unused-vars` ignores names starting with uppercase or underscore
- Components: PascalCase files, one component per file
- React 19 patterns, functional components only
- Firebase client SDK v12 (modular API)

## Environment Variables

Web app (Vite — prefix with `VITE_`):
- `VITE_LS_STORE_ID` — Lemon Squeezy store ID
- `VITE_LS_VARIANT_ID` — Lemon Squeezy product variant ID

GitHub Secrets (used in CI):
- `FIREBASE_SERVICE_ACCOUNT` — GCP service account JSON
- `GROQ_API_KEY`, `HF_API_KEY` — AI API keys
- `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET` — Payment
- `GHUB_PAT` — GitHub PAT for support request automation

## Pricing (from `docs/Pocket_Business_Analysis.pdf`)

| Plan | Price | Net (after LS fees) |
|------|-------|---------------------|
| Free | $0 | — |
| Premium Monthly | $3.99/mo | $3.23/mo |
| Premium Annual | $29.99/yr ($2.50/mo) | $27.54/yr ($2.30/mo) |

Lemon Squeezy fees (India merchant): 5% + $0.50 base + 1.5% international surcharge.

**Free tier**: 500 articles, browser TTS, basic search, tags, PWA.
**Premium**: AI TTS (Kokoro), AI summaries, full-text search, unlimited saves, extensions.

### Unit Economics

- Per-user infra cost: ~$0.002/mo (under half a penny)
- Profitable from subscriber #1 (no fixed costs at current scale)
- AI API free tiers break first: Groq at ~200 DAU, HuggingFace at ~50-100 DAU

### Growth Projections

| Month | MAU | Premium | MRR (net) |
|-------|-----|---------|-----------|
| 3 | 300 | 9 | $29 |
| 6 | 1,500 | 45 | $145 |
| 12 | 8,000 | 240 | $774 |
| 24 | 30,000 | 900 | $2,903 |

### Competitive Position

Mozilla Pocket dead (July 2025), Omnivore dead (Nov 2024). Active competitors: Instapaper ($6/mo), Raindrop ($3/mo), Matter ($80/yr), Readwise Reader ($8-10/mo). Our $3.99 undercuts all with AI features none of them have.

## Deployment

Pushes to `master` or `claude/*` branches trigger:
1. **deploy.yml** — `npm ci && npm run build` → Firebase Hosting + Firestore rules
2. **deploy-functions.yml** — Deploys each Cloud Function individually via `gcloud functions deploy` (only runs when `functions/**` changes)
