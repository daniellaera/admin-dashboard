# DEPLOY — pull-based delivery on a Proxmox LXC behind Nginx Proxy Manager

What runs where (ADR-010, D-016):

```
Internet ─TLS─▶ Nginx Proxy Manager ─http─▶ <lxc-ip>:8080  app (ghcr.io/daniellaera/admin-dashboard)
                                                            └─▶ db  (postgres:18, compose network only)
GitHub Actions (main) ─▶ ghcr.io image :<sha> + :main ◀── systemd timer: docker compose pull && up -d (every 5 min)
```

No deploy step runs in CI and no CI credential reaches the server: the container pulls a **public** image, so the LXC needs no registry login. Rollback = pin a commit sha.

## 1. The LXC (Proxmox)

Create an **unprivileged** container (Debian 13 template, 2 vCPU, 2 GB RAM, 16 GB disk is plenty). Docker needs two features; set them in the container options (or in `/etc/pve/lxc/<id>.conf`):

```
features: nesting=1,keyctl=1
```

Inside the container:

```sh
apt update && apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh           # Docker Engine + Compose plugin
systemctl enable --now docker
docker run --rm hello-world                       # sanity check (nesting works)
```

Unprivileged containers map uid 0 to a high host uid; nothing below needs to change for that, but the **bind mounts must be owned by the container users** that write to them (uid 70 = Postgres in the alpine image, uid 1000 = `node` in the app image).

## 2. Files on the server

```sh
mkdir -p /opt/devconnector && cd /opt/devconnector
curl -fsSLO https://raw.githubusercontent.com/daniellaera/admin-dashboard/main/compose.prod.yml
curl -fsSL  https://raw.githubusercontent.com/daniellaera/admin-dashboard/main/.env.example -o .env
mkdir -p data/postgres data/uploads
chown 70:70 data/postgres
chown 1000:1000 data/uploads
chmod 600 .env
```

Edit `.env` — the production section at the bottom and these application values:

| Variable | Value |
|---|---|
| `APP_URL` | `https://dev.example.com` — the public URL (links in e-mails, cookie `Secure`, OAuth callback) |
| `AUTH_SECRET` | `openssl rand -base64 48` |
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` (compose builds `DATABASE_URL` from it) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` / `MAIL_FROM` | your mail provider or relay; `SMTP_SECURE=true` for 465, STARTTLS is negotiated on 587 |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | first boot only (ADR-013); remove them afterwards. Skip when you import data and promote your account with `owner:create` instead (MIGRATION.md §5) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional — GitHub OAuth App with callback `${APP_URL}/api/v1/auth/github/callback` |
| `APP_TAG` | `main` (default) or a commit sha |
| `APP_PORT` / `APP_BIND` | `8080` / `0.0.0.0` (NPM on another host) — use `127.0.0.1` when NPM runs on this LXC |
| `LOG_LEVEL` | `info` |

Everything else keeps its default (`TRUST_PROXY=true` and `MIGRATE_ON_START=true` are set by the compose file / image).

First start:

```sh
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml logs -f app      # "database migrations up to date", "API listening"
curl -s http://127.0.0.1:8080/api/v1/ready          # {"status":"ready","checks":{...}}
```

## 3. Continuous delivery: the pull timer

`/etc/systemd/system/devconnector-pull.service`

```ini
[Unit]
Description=DevConnector: pull the latest image and restart if it changed
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/devconnector
ExecStart=/usr/bin/docker compose -f compose.prod.yml pull --quiet
ExecStart=/usr/bin/docker compose -f compose.prod.yml up -d --remove-orphans
ExecStartPost=/usr/bin/docker image prune -f
```

`/etc/systemd/system/devconnector-pull.timer`

```ini
[Unit]
Description=DevConnector: check for a new image every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30s
Unit=devconnector-pull.service

[Install]
WantedBy=timers.target
```

```sh
systemctl daemon-reload
systemctl enable --now devconnector-pull.timer
systemctl list-timers devconnector-pull.timer
journalctl -u devconnector-pull.service -n 20
```

`up -d` only recreates the container when the image digest behind `APP_TAG` changed, so the timer is a no-op most of the time. Migrations run on start; the app is unavailable for the few seconds of the restart.

### Rollback

```sh
# find the sha of the last good commit (git log on main, or the GHCR package page)
sed -i 's/^APP_TAG=.*/APP_TAG=<sha>/' .env     # or add the line
systemctl start devconnector-pull.service      # pulls that exact image and restarts
```

Put `APP_TAG=main` back to resume following `main`. Database migrations are forward-only; a rollback across a migration needs the backup below.

## 4. Nginx Proxy Manager

Add a **Proxy Host**:

- Domain: `dev.example.com`, scheme `http`, forward host `<lxc-ip>`, port `8080`.
- **Block Common Exploits** on, **Websockets Support** off (not used), Cache Assets off (the app sets the cache headers itself).
- SSL tab: request a Let's Encrypt certificate, **Force SSL**, **HTTP/2**, **HSTS** on.
- Advanced tab — server-sent events must not be buffered and the client IP must reach the app:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
location /api/v1/events {
    proxy_pass http://<lxc-ip>:8080;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
}
client_max_body_size 5m;   # avatar uploads (MAX_UPLOAD_MB=2 plus multipart overhead)
```

The app already sends `X-Accel-Buffering: no` on the event stream and honours `X-Forwarded-*` because `TRUST_PROXY=true`. Without NPM (plain VPS), Caddy with `reverse_proxy 127.0.0.1:8080` and `flush_interval -1` does the same job.

## 5. Backups

`/etc/systemd/system/devconnector-backup.service`

```ini
[Unit]
Description=DevConnector: nightly database dump + uploads snapshot
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/devconnector
ExecStart=/bin/sh -c 'set -e; d=/opt/devconnector/backups; mkdir -p $d; \
  docker compose -f compose.prod.yml exec -T db pg_dump -U devconnector -d devconnector -Fc > $d/db-$(date +%%F).dump; \
  tar -czf $d/uploads-$(date +%%F).tgz -C data uploads; \
  find $d -type f -mtime +14 -delete'
```

`/etc/systemd/system/devconnector-backup.timer`

```ini
[Unit]
Description=DevConnector: backup at 03:30

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

```sh
systemctl daemon-reload && systemctl enable --now devconnector-backup.timer
```

Copy `/opt/devconnector/backups` off the host (Proxmox Backup Server / rsync / restic — the LXC backup of Proxmox also covers it).

Restore:

```sh
docker compose -f compose.prod.yml stop app
docker compose -f compose.prod.yml exec -T db pg_restore -U devconnector -d devconnector --clean --if-exists < backups/db-YYYY-MM-DD.dump
tar -xzf backups/uploads-YYYY-MM-DD.tgz -C data
docker compose -f compose.prod.yml start app
```

## 6. Operations cheat-sheet

| Task | Command |
|---|---|
| Logs | `docker compose -f compose.prod.yml logs -f app` (JSON lines, `LOG_LEVEL` in `.env`) |
| Health / readiness | `curl -s localhost:8080/api/v1/health`, `…/ready` (503 when the database or the uploads volume is unavailable) |
| Create / promote the owner | `docker compose -f compose.prod.yml exec app node dist/scripts/owner-create.js you@example.com 'password'` |
| Import the Supabase dump | MIGRATION.md (`node dist/scripts/import-supabase.js …` inside the container) |
| Apply migrations manually | `docker compose -f compose.prod.yml exec app node dist/scripts/migrate.js` (normally automatic) |
| Update now | `systemctl start devconnector-pull.service` |
| Disk usage | `docker system df`, `du -sh data/*` |
| Container hardening | read-only root FS, `no-new-privileges`, non-root `node`, database never published |

## 7. Gitea (secondary, optional)

Mirror the repository to your Gitea and register a runner **with Docker access**; the same `.github/workflows/ci.yml` runs `check`, `api-integration` and `security`, and the `image-gitea` job pushes a single-arch image when the repository secrets `REGISTRY`, `REGISTRY_USER`, `REGISTRY_TOKEN` exist (a Gitea access token — an existing account, no new service). Point `APP_TAG`/the image name in `compose.prod.yml` at that registry if you want the LXC to pull from Gitea instead of GHCR; private registries then need `docker login` on the LXC once.
