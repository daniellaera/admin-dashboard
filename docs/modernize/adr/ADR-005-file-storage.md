# ADR-005 — File storage: local volume served by the API, images re-encoded with sharp (replacing Supabase Storage)

Status: proposed (2026-10-26) · Brief: "local volume served by the backend with access control, type and size validation, and image resizing if the app uses images. Only add self-hosted S3-compatible storage if it's genuinely justified."

## Context

The only files are user avatars (FEATURES ST-01..03): uploaded from the profile form, displayed on cards, comments, navbars. Today: public bucket with anonymous insert (AUDIT SEC-04), random filenames at the bucket root, no validation, blobs downloaded via the SDK per component (PERF-04), old files never deleted.

## Decision

- **Storage**: a Docker volume mounted at `UPLOADS_DIR` (default `/data/uploads`), layout `avatars/<userId>/<sha256-prefix>.webp`. No object store: one image per user, a few hundred KB each, single-node deployment. MinIO/Garage/SeaweedFS would add a service, credentials and backups for no benefit at this scale; the storage module is behind a small interface (`put/get/delete/stat`) so an S3 adapter can be added if the app ever needs multi-node storage.
- **Upload**: `POST /me/avatar` (multipart, session required, Origin-checked): body limit `MAX_UPLOAD_MB` (default 2 MB) enforced before buffering; the file is **sniffed** (magic bytes via `sharp` metadata, not the client MIME); allowed inputs: JPEG, PNG, WebP, GIF (first frame), AVIF; re-encoded with `sharp` to **256×256 cover WebP** (and a 64×64 variant for lists) — re-encoding strips metadata and neutralises polyglot/malicious files; EXIF orientation respected; the previous avatar files are deleted; `profiles.avatar_path` updated; returns the new URL.
- **Serving**: `GET /files/avatars/:userId/:file` is public (avatars are public today; profile `is_public=false` hides the profile card, not the image of a user who comments publicly), `Cache-Control: public, max-age=31536000, immutable` because the filename is content-addressed; `Content-Type: image/webp`; `X-Content-Type-Options: nosniff`; path traversal impossible (ids are integers, filenames are validated hex). `DELETE /me/avatar` removes files and clears the path.
- **Fallback**: no avatar → the SPA renders initials (as today) from username or e-mail local part.
- **Quota**: one avatar per user by construction; the volume is included in the backup procedure (DEPLOY.md) together with `pg_dump`.

## Alternatives considered

- **Self-hosted S3 (MinIO)**: justified only for multi-instance deployments or large/many files. Deferred; interface kept.
- **Storing images in Postgres (`bytea`)**: simple backups, but bloats the DB and makes caching headers awkward. Rejected.
- **Serving uploads via nginx**: faster for very large volumes; irrelevant at this scale and would require a second container (ADR-010).

## Consequences

- `sharp` is a native dependency: prebuilt binaries exist for `linux-x64` and `linux-arm64` (glibc and musl), so multi-arch images build without a compiler. Verified in Phase 3 batch 5 by building both platforms.
- Import script (ADR-012) can optionally download legacy avatars from the public Supabase bucket URL and run them through the same pipeline.
