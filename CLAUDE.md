# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AI proposal generator for a transportation engineering consultancy. Upload a PDF (RFP/tender), extract structured findings via OpenAI, generate a Markdown proposal, iteratively edit it with AI, export to DOCX/PDF.

Two independent npm packages — no root package.json:

- `backend/` — Express 5 server (`server.js` routes/schemas, `ai/` prompts + OpenAI client).
- `frontend/` — React 19 + Vite + Tailwind 4 + shadcn/ui (Radix). TypeScript.

## Commands

```bash
# Backend (port 5000)
cd backend && npm run dev        # node --watch server.js

# Frontend (port 8080, proxies /api to backend)
cd frontend && npm run dev
cd frontend && npm run build     # vite build (also typechecks nothing — no tsc step)
cd frontend && npm run lint      # eslint
cd frontend && npm run format    # prettier --write .
```

No tests exist in this repo.

Backend requires `backend/.env` with `OPENAI_API_KEY` (see `backend/.env.example`). Model defaults to `gpt-5.4` via `OPENAI_MODEL`.

## Architecture

Data flow (all client-side state, nothing persisted server-side):

1. **Upload** — PDF parsed in browser via pdfjs-dist (`frontend/src/lib/document-tools.ts`). Raw text extracted client-side; backend never sees the file.
2. **Findings** — text POSTed to `POST /api/findings`; backend prompts OpenAI in JSON mode, validates with Zod (`FindingsResponseSchema` in `server.js`). User can edit/add/remove findings in the UI.
3. **Generate** — findings POSTed to `POST /api/proposal`; returns Markdown proposal.
4. **Edit** — `POST /api/edit-proposal` with current proposal + user query + query history for iterative AI edits.
5. **Export** — DOCX (docx lib) and PDF (jspdf) generated entirely client-side in `document-tools.ts`.

State lives in one hook, `frontend/src/hooks/use-proposal-studio.ts`, shared app-wide through `ProposalStudioContext`. Pages under `src/routes/pages/` (Landing → Upload → Findings → Generate → Export) are thin wrappers around step components in `src/components/proposal-studio/`. Refreshing loses everything — there is no persistence layer or database.

All LLM prompts (system prompts + prompt builders for findings extraction, proposal drafting, editing) live in `backend/ai/prompts.js`; the OpenAI call + token counting in `backend/ai/client.js`. Prompts enforce strict anti-hallucination rules: missing info must be rendered as "Not specified in document" (findings) or "[To be confirmed with client]" (proposal) — preserve these exact strings when touching prompts.

`@/` alias resolves to `frontend/src/`. `src/components/ui/` is generated shadcn/ui — prefer editing `components/proposal-studio/` instead.

## Gotchas

- Frontend `Finding`/`FindingsResponse` types in `src/lib/api.ts` are looser than (and partially out of sync with) the backend Zod schemas — backend is the source of truth.
- `proposalPrompt()` in `ai/prompts.js` filters findings by uppercase categories (`"HIGH"`, `"RISK"`, `"SCOPE"`...) that the findings prompt never produces (it emits `"High"`, `"Risks & Constraints"`, etc.) — those filtered sections are effectively always empty; the full findings list at the bottom of the prompt is what actually drives generation.
- Document input is PDF-only in the UI (`handleFile` rejects non-PDF) even though `document-tools.ts` still has a DOCX extraction path — DOCX upload was deliberately removed (commit 7e94496).
