# Professor Presets — Frontend (screens for backend phases 1–3)

Spec: `Fetin-backend/docs/superpowers/specs/2026-09-25-professor-presets-design.md` §10.
Backend contract: routes and RN-PRE-01..19 in `Fetin-backend/docs/business-rules.md` §8.1 (already on backend `main`).

**Conventions followed (read from the repo, not assumed):** client pages (`"use client"`) call a typed helper in `lib/api/*.ts`, which fetches a BFF route under `app/api/*`; every BFF route reads the token from the httpOnly cookie, retries once after a refresh, and forwards `?userId=` as `x-impersonate-user-id` (read-only). Dynamic `params` is a `Promise`. Confirmations use `window.confirm`. Dates: `lib/format.ts` + `lib/time.ts` (America/Sao_Paulo, date-only values never converted to a zone). Nav gating on the decoded JWT role is cosmetic; the backend is the boundary.

**Verification (no unit-test runner in this repo):** BFF e2e in `fetin/tests/suites/67-presets-bff.test.mjs` (route handlers, red first), `next build` (types), `eslint` on changed paths only (`npm run lint` rewrites the whole repo), then a manual smoke of every page against a live backend.

## Tasks
1. **BFF + client layer.** `lib/backend-proxy.ts` (generic proxy that, unlike `flashcards/_proxy.ts`, keeps the backend's `code`, `errors`, `application_id` — apply needs `NAME_TAKEN`/`ALREADY_APPLIED`); routes for presets, classes, preset-applications, professor, professor-links, admin role; `lib/api/presets.ts` types + helpers. Gate: BFF e2e green.
2. **Student screens.** `/classes` (enter class code, linked professors, available classes with applied badge, my applied classes with detach/delete), `/classes/[id]` (preview, rename on `NAME_TAKEN`, apply, result summary incl. `skipped` and `schedules`).
3. **Professor screens.** `/presets` (list, status filter, create, duplicate, archive, delete), `/presets/[id]` (metadata, topic tree editor with weight/hours/difficulty/prerequisites, assessments editor, save content, publish with the backend's `errors`), `/professor/students` (class code, rotate, roster, remove).
4. **Nav + admin.** Student nav item "Turmas" for everyone; professor items only when the JWT role is PROFESSOR; admin users page gets a grant/revoke professor control.
5. **Verify + finish.** `next build`, lint changed paths, BFF e2e, smoke each page, record in the ledger.

Out of scope here: Phase 4 (version diff/merge UI) and Phase 5 (dashboards), which need their own backend work first.
