# Secret scan — 2026-10-26

Scope: full git history (all refs, 20 commits + 1 merge) and the current working directory including ignored files. Values are never reproduced here (see DECISIONS D-004).

## 1. gitleaks 8.30.1 over the full history

```
gitleaks git . --log-opts="--all" --redact=70 --report-format json --exit-code 0
→ 20 commits scanned, ~2.2 MB, "no leaks found"
```

**Result: 0 findings with the default ruleset.** This is a false negative: the default rules do not match a Postgres URI with an embedded password (see §2). Lesson for the new CI: add a custom gitleaks rule for `postgres(ql)?://[^:]+:[^@]+@` (and run gitleaks as a CI step).

## 2. Manual pattern grep over every blob reachable from any ref

Patterns: `postgres(ql)?://user:pass@host`, JWT-shaped strings (`eyJ…`), `supabase.co`, `NOVU_API_KEY=`, `SERVICE_ROLE=`, `JWT_SECRET=`, `ghp_`, `sk_live`, `FLY_API_TOKEN=`.

| # | What | Where | History | Severity / status |
|---|---|---|---|---|
| **S-1** | Supabase Postgres connection string **with the database password in clear text**: `postgresql://postgres:***@db.aetkrjbqdijselycidyg.supabase.co:5432/postgres` | `backend/README.md:11` | introduced in `161af4b` (2023-02-19, "first commit"); **still present on `origin/main`**; repository is **public** | **CRITICAL — must be revoked**: reset the database password in the Supabase dashboard (Project Settings → Database). Assume the database has been readable/writable by anyone since 2023-02-19. Also rotate anything derived from it (PgBouncer/pooler URIs). |
| S-2 | Local-dev connection string `postgresql://postgres:***@localhost:5432/supabase_react_auth_db` | `backend/README.md:7` | same commit | low — localhost credentials (`postgres`/`postgres`-style), but shows connection strings were routinely pasted into docs |
| S-3 | Supabase project ref `aetkrjbqdijselycidyg` | `backend/README.md`, local `backend/.env` | — | informational — the project URL is public by design; combined with S-1 it pinpoints the target |
| S-4 | Novu application identifier `vTbMIBFNZdXt` | `frontend/src/components/shared/Nav.tsx:93` | `84cd996` onwards | low — the Novu *application identifier* is a public client-side value, not the API key; Novu is being removed anyway |

Nothing else matched: no JWTs, no API keys, no Fly tokens, no `.env` files were ever committed (only `frontend/.env.development` with `REACT_APP_BACKEND_URL="http://localhost:8080"`).

## 3. gitleaks over the working directory (untracked and ignored files included)

```
gitleaks dir . --redact=70 → 2 findings
```

| # | Rule | File | What it is | Status |
|---|---|---|---|---|
| W-1 | jwt | `backend/.env:11` (`SUPABASE_SERVICE_ROLE`) | HS256 JWT whose decoded payload is `{"role":"service_role","iss":"supabase-demo","iat":1641769200,"exp":1799535600}` — the **well-known Supabase CLI local demo key** | low — git-ignored, never committed, and the value is the public local-dev default shipped with `supabase start` |
| W-2 | jwt | `frontend/.env:2` (`REACT_APP_SUPABASE_ANON_KEY`) | payload `{"role":"anon","iss":"supabase-demo",…}` — same family | low — same reasons |

Other values in the local `.env` files (names only, inspected to classify them): `DATABASE_URL` / `DIRECT_URL` / `SHADOW_DATABASE_URL` point at **localhost** with a placeholder tenant id; `SUPABASE_JWT_SECRET` is a placeholder (`your-s…`); `REACT_APP_SUPABASE_URL` is the hosted project URL in the backend file and `http://localhost:8000` in the frontend file; `NOVU_API_KEY` looks like a real 32-hex Novu key → **rotate or delete the Novu API key** when the Novu account is decommissioned (low urgency: the key is not in git).

## 4. Secrets referenced by CI (values live in GitHub Actions secrets, not in the repo)

`.github/workflows/main.yml` uses `FLY_API_TOKEN`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_BACKEND_URL`. The anon key and the backend URL are intentionally baked into the public frontend bundle by CRA (`REACT_APP_*`), which is how Supabase is designed to work — *provided RLS is enabled on every table*, which this project never did (see AUDIT SEC-01).

## 5. Revocation checklist (copied into REPORT.md at the end)

1. **Supabase → Project Settings → Database → Reset database password** (S-1). Then audit the data for tampering.
2. If the Fly apps keep running until cut-over: update their `DATABASE_URL` secret with the new password (user action; this mission never deploys).
3. Rotate the Novu API key or delete the Novu application (W-note).
4. After cut-over: delete the Supabase project and the Fly apps, revoke `FLY_API_TOKEN`, delete the GitHub Actions secrets listed in §4.
5. Rewrite `backend/README.md` (done in the rebuild: the whole backend is replaced). The string remains in git history; since the password is reset, history rewriting is **not** required (and force-pushes are forbidden by the brief).
