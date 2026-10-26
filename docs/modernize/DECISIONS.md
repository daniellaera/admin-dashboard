# Decision log

Format: **ID — title** · date · context → options → choice → rationale · reversibility. Newest at the bottom. User decisions taken at the STOP point are tagged `[USER]`; everything else was decided autonomously per the brief ("pick the simplest reversible option").

---

## D-001 — Preserve the dirty working tree on a WIP branch, start `modernize/2026` clean
*2026-10-26*

**Context.** `HEAD` == `origin/main` (`ccfe293`) but the clone had 167 uncommitted changes: ~130 files rewritten with CRLF line endings, `package.json` major bumps in both apps that were never installed (lockfiles still pin Express 4.18 / Prisma 4.11 / Chakra 2.5), deletion of all 14 Prisma migrations, and a handful of real feature edits (Profile `isPublic` toggle, Developers card redesign, "Home" menu entry, like de-dup attempt, socket presence emit, PostForm props). Untracked: `WARP.md`, `.idea/`, `.vscode/settings.json`, an empty root `package-lock.json`, `.DS_Store` files.

**Options.** (a) `git stash` — hidden, fragile; (b) commit the snapshot on a dedicated branch — durable, visible, never pushed; (c) branch from the dirty tree — pollutes the rebuild with CRLF noise and broken manifests; (d) separate `git worktree` — leaves the user's directory on the dirty state, splits the work location.

**Choice.** (b): `wip/local-uncommitted-2026-10-26` @ `f3bb4af` holds the snapshot (tracked changes + `WARP.md`; IDE/OS junk excluded). `modernize/2026` was created from `origin/main` with `--no-track`.

**Rationale.** Nothing is lost, the baseline is unambiguous (what is on GitHub), and the user's directory ends up on the mission branch as the brief expects. **Reversible:** `git switch wip/local-uncommitted-2026-10-26` or `git branch -D` it.

**Follow-up.** The feature edits in the snapshot are treated as part of the parity baseline (see D-005).

## D-002 — Repo-local git identity set to the historical author e-mail
*2026-10-26*

**Context.** Global git config has `user.email = admin@example.com` (placeholder). All 21 historical commits are by `laera.daniel@hotmail.com`.
**Choice.** `git config user.email laera.daniel@hotmail.com` and `user.name daniellaera` **in `.git/config` only**; global config untouched. Commits carry `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` as instructed.
**Reversible:** `git config --unset user.email`.

## D-003 — Local-only excludes for IDE/OS junk
*2026-10-26*

`.git/info/exclude` (not committed) ignores `.idea/`, `.vscode/`, `.DS_Store`, `WARP.md`, `/package-lock.json` so the untracked junk in the clone does not show up in `git status` and cannot be committed by mistake. The committed root `.gitignore` written in Phase 3 covers the generic cases (`node_modules`, `.env*`, build outputs). The files themselves were not deleted (not mine).

## D-004 — Secrets never appear in `docs/modernize/`
*2026-10-26*

Leaked or local credentials are referenced only by location, fingerprint (commit, file:line, rule) and a masked prefix. gitleaks reports in the scratchpad were produced with `--redact=70`. The actual values are irrelevant to the fix (revoke/rotate) and copying them would widen the leak.

## D-005 — Functional baseline = `origin/main` + the uncommitted feature edits
*2026-10-26*

**Context.** The WIP snapshot contains small feature edits that never reached GitHub. **Choice.** `FEATURES.md` lists them as "uncommitted local additions" and the rebuild implements them (they are small and clearly intentional: public/private profile toggle, Developers card layout, Home menu link). The dependency bumps and the migration deletion in the snapshot are *not* carried over (they were never installed and are superseded by the rebuild). **Reversible:** drop the rows from FEATURES.md.

## D-006 — Runtime: Node.js 26 (Active LTS from 2026-10-28)
*2026-10-26*

Verified against `nodejs/Release/schedule.json` and endoflife.date: v24 "Krypton" moved to Maintenance LTS on 2026-10-20; v26 (latest 26.12.1) becomes Active LTS on 2026-10-28, two days after this decision, EOL 2029-04-30. Using v24 would mean shipping on a line already in maintenance. The brief's requirement was "check which Node version is the active LTS today"; the honest answer is "v24 until the 28th, v26 after" and the rebuild will ship after the 28th. Docker base: `node:26-alpine` (exists). Local dev: `.nvmrc` = `26`; nvm must install it (`nvm install 26`).

## D-007 — TypeScript 6.0.x, not 7.x
*2026-10-26*

`typescript@7.0.2` (native Go compiler) is the npm `latest`, but `typescript-eslint@8.72.0` declares peer `typescript >=4.8.4 <6.1.0`; type-aware linting is non-negotiable for the backend. TypeScript 6.0.3 is the last JS-based line and is supported by the whole toolchain (Vite 8, Vitest 5, drizzle-kit, tsx). Revisit when typescript-eslint supports 7.x — the switch is a one-line version bump.

## D-008 — "Run as-is" tests happen in isolated scratchpad copies with dummy env
*2026-10-26*

To honour "never touch the existing Supabase project", the as-is runs use (a) a `git worktree` of `origin/main` and (b) an rsync copy of the dirty tree, both under the session scratchpad, with every `.env` deleted and replaced by dummy local values, a throwaway `postgres:15-alpine` container per copy, and no network access to any `*.supabase.co` host. The real clone is never installed into or executed.

## D-009 — Subagents used for the parallel audit
*2026-10-26*

Three background agents: (1) exhaustive frontend functional inventory → `appendix/features-frontend.md`; (2) static frontend audit (security, quality, a11y, perf, deps) → `appendix/audit-frontend.md`; (3) empirical "run as-is" of both snapshots → `appendix/run-as-is.md`. Backend, DB, infra, CI, dependency and secret audits were done directly (small code base, ~600 lines). Agent outputs are evidence; conclusions in `AUDIT.md` are mine and were spot-checked against the code.
