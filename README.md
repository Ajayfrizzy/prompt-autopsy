# Prompt Autopsy

Evidence-backed review of one AI coding-session failure, against the historical instructions supplied by the developer.

## Local development

Use Node **24.21.0** (`nvm use` if available). Run `npm ci`, copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` when ready to use provider processing. Run `npm run dev` and open http://localhost:3000.

Checks: `npm run typecheck`, `npm test`, `npm run build`. Tests do not make provider requests. Next uses webpack mode because Turbopack's CSS subprocess port was blocked in the build environment.

Current-session memory only; no recovery storage. Only explicitly reviewed and consented content is sent to OpenAI. Counting is unbilled preprocessing; generation has a USD 0.40 in-session budget, not an account-wide spending guarantee. Provider-side data handling is separate from application non-persistence.

Implementation progress and pending hands-on checks are recorded in devpost/checklist.md. Do not present fictional fixtures as recovered transcripts or live model results.
