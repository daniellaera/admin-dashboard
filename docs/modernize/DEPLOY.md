# DEPLOY — pull-based delivery on a Proxmox LXC behind Nginx Proxy Manager

What runs where (ADR-010, D-016):

```
Internet ─TLS─▶ Nginx Proxy Manager ─http─▶ <lxc-ip>:8080  app (ghcr.io/daniellaera/admin-dashboard)
                                                            └─▶ db  (postgres:18, compose network only)
GitHub Actions (main) ─▶ ghcr.io image :<sha> + :main ◀── systemd timer: docker compose pull && up -d (every 5 min)
```

No deploy step runs in CI and no CI credential reaches the server: the container pulls a **public** image, so the LXC needs no registry login. Rollback = pin a commit sha.

**Production (first deployed 2026-10-27):** LXC CT 107 `devconnector` on Proxmox, `192.168.1.107`, Debian 13, Docker 29.9 / Compose v5.6, app on `0.0.0.0:8080`, public URL `https://devconnector.daniellaera.com`. The package `ghcr.io/daniellaera/admin-dashboard` could be pulled anonymously right after the first `main` publish (a package published from a public repository's workflow); check *Package settings → visibility* if a pull ever asks for credentials.

## 1. The LXC (Proxmox)

Create an **unprivileged** container (Debian 13 template, 2 vCPU, 2 GB RAM, 16 GB disk is plenty). Docker needs two features; set them in the container options (or in `/etc/pve/lxc/<id>.conf`):

```
features: nesting=1,keyctl=1
```

Inside the container:

```sh
apt update && apt install -y ca-certificates curl locales
sed -i 's/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen
update-locale LANG=en_US.UTF-8
curl -fsSL https://get.docker.com | sh           # Docker Engine + Compose plugin
systemctl enable --now docker
docker run --rm hello-world                       # sanity check (nesting works)
```

The Debian template ships without a generated locale, and macOS's `ssh` forwards `LC_CTYPE=UTF-8`, which is not a Linux locale name. The result is "Cannot set LC_CTYPE" / perl warnings in every session. Generating `en_US.UTF-8` is not enough on its own, so also stop sshd from accepting the forwarded variables. In `/etc/ssh/sshd_config`, change `AcceptEnv LANG LC_* COLORTERM NO_COLOR` to `AcceptEnv COLORTERM NO_COLOR`, then run `sshd -t`. Debian 13 starts sshd through `ssh.socket`, so new connections pick up the change without a reload, and `systemctl reload ssh` may report a failure that is harmless.

Unprivileged containers map uid 0 to a high host uid; nothing below needs to change for that, but the **bind mounts must be owned by the container users** that write to them (uid 70 = Postgres in the alpine image, uid 1000 = `node` in the app image).

## 2. Files on the server

```sh
mkdir -p /opt/devconnector && cd /opt/devconnector
curl -fsSLO https://raw.githubusercontent.com/daniellaera/admin-dashboard/main/compose.prod.yml
mkdir -p data/postgres data/uploads backups
chown 70:70 data/postgres
chown 1000:1000 data/uploads
chmod 700 backups
```

Write `.env` from scratch (`umask 077`, mode **600**) rather than copying `.env.example`. That file is the development template, and `compose.prod.yml` loads `.env` as the container's `env_file`. Its `NODE_ENV=development`, `LOG_LEVEL=debug` and localhost SMTP would override the image's production defaults. This is the production file as deployed:

```sh
# /opt/devconnector/.env — mode 600, never committed
NODE_ENV=production
APP_URL='https://devconnector.daniellaera.com'
LOG_LEVEL=info

AUTH_SECRET=<openssl rand -hex 48>
AUTH_REQUIRE_EMAIL_VERIFICATION=true
COOKIE_SECURE=auto
# GitHub OAuth disabled: GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET left unset (no button shown).

# First boot only (ADR-013) — delete both lines once the owner exists, then `up -d` again.
OWNER_EMAIL='you@example.com'
OWNER_PASSWORD=<openssl rand -hex 32>   # throwaway: set the real one with "Forgot password"

SMTP_HOST='mail.infomaniak.com'
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER='partnerships@daniellaera.com'          # the mailbox that authenticates…
SMTP_PASS='<mailbox password>'
MAIL_FROM='DevConnector <no-reply@daniellaera.com>' # …sending as one of its aliases

POSTGRES_PASSWORD=<openssl rand -hex 24>
APP_TAG=main
APP_PORT=8080
APP_BIND=0.0.0.0
```

| Variable | Notes |
|---|---|
| `APP_URL` | the public URL: links in e-mails, cookie `Secure`, CSRF origin, OAuth callback |
| `AUTH_SECRET` / `POSTGRES_PASSWORD` | random. Use **hex**, not base64: compose embeds `POSTGRES_PASSWORD` in `DATABASE_URL`, and a base64 `/` or `+` breaks the URL |
| `SMTP_*` / `MAIL_FROM` | `SMTP_SECURE=true` for 465. STARTTLS is negotiated on 587 |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | first boot only (ADR-013). The log shows `owner account created`. Skip them when you import data and promote your account with `owner:create` (MIGRATION.md §5) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional. When unset, `GET /api/v1/auth/providers` returns `{"github":false}` and the button is hidden. Callback: `${APP_URL}/api/v1/auth/github/callback` |
| `APP_TAG` | `main` (default) or a commit sha |
| `APP_PORT` / `APP_BIND` | `8080` / `0.0.0.0` (NPM on another host). Use `127.0.0.1` when NPM runs on this LXC |

**Quoting:** compose interpolates `$` in `.env`, both bare and inside double quotes. Put any value that may contain `$` (passwords) in **single quotes**, which compose passes through literally. Single quotes cannot be escaped inside such a value, so a password containing `'` needs a different password.

Everything else keeps its default (`TRUST_PROXY=true` and `MIGRATE_ON_START=true` are set by the compose file / image).

First start:

```sh
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d --wait     # db healthy, then app healthy
docker compose -f compose.prod.yml logs app         # "database migrations up to date", "owner account created", "API listening"
curl -s http://127.0.0.1:8080/api/v1/ready          # {"status":"ready","checks":{"database":true,"uploads":true}}
sed -i '/^OWNER_PASSWORD=/d; /^OWNER_EMAIL=/d' .env && docker compose -f compose.prod.yml up -d --wait
```

The owner's e-mail is created verified. Set its password with **Forgot password** on the login page.

### Verifying a deployment (from the LAN)

```sh
curl -s http://<lxc-ip>:8080/api/v1/health                      # {"status":"ok",…}
curl -s http://<lxc-ip>:8080/api/v1/ready                       # {"status":"ready",…}
curl -s -D - -o /dev/null --max-time 3 http://<lxc-ip>:8080/api/v1/events | grep -i x-accel   # x-accel-buffering: no
# a real e-mail (JSON without Origin passes the CSRF check; if you send Origin, it must equal APP_URL):
curl -s -X POST http://<lxc-ip>:8080/api/v1/auth/forgot-password -H 'Content-Type: application/json' \
  --data '{"email":"you@example.com"}'                             # 202
docker compose -f compose.prod.yml exec -T db psql -U devconnector -d devconnector \
  -Atc "select id, subject, sent_at, attempts, last_error from email_outbox order by id desc limit 3"
```

`sent_at` set and `last_error` empty means the SMTP server accepted the message. Never `select *` from `email_outbox`: the `html`/`text` columns hold the one-time links.

## 3. Continuous delivery: the pull timer

`/etc/systemd/system/devconnector-pull.service`

```ini
[Unit]
Description=DevConnector: pull the latest image and restart if it changed
After=docker.service network-online.target
Wants=network-online.target
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
cd /opt/devconnector
# find the full 40-char sha of the last good commit (git log on main, or the GHCR package page)
sed -i 's/^APP_TAG=.*/APP_TAG=<sha>/' .env     # or add the line
systemctl start devconnector-pull.service      # pulls that exact image and restarts
docker compose -f compose.prod.yml ps          # IMAGE column shows the pinned tag
```

CI tags images with the full commit sha (`github.sha`), so short shas do not exist as tags. While `APP_TAG` is pinned, the timer keeps the pinned image and nothing new is deployed.

Put `APP_TAG=main` back to resume following `main`. Database migrations are forward-only; a rollback across a migration needs the backup below.

## 4. Nginx Proxy Manager

Add a **Proxy Host**:

- Domain: `devconnector.daniellaera.com`, scheme `http`, forward host `192.168.1.107` (`<lxc-ip>`), port `8080`.
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

The dump runs from a script rather than an inline `sh -c` in the unit. systemd expands `$d` in `ExecStart=` itself, before the shell sees it, so the inline version wrote to `/db-<date>.dump`.

`/usr/local/sbin/devconnector-backup` (mode 755)

```sh
#!/bin/sh
# Nightly database dump + uploads snapshot, 14 days kept (DEPLOY.md §5).
set -eu
cd /opt/devconnector
umask 077
d=/opt/devconnector/backups
day=$(date +%F)
mkdir -p "$d"
docker compose -f compose.prod.yml exec -T db pg_dump -U devconnector -d devconnector -Fc > "$d/db-$day.dump.tmp"
mv "$d/db-$day.dump.tmp" "$d/db-$day.dump"
tar -czf "$d/uploads-$day.tgz" -C data uploads
find "$d" -type f -mtime +14 -delete
echo "backup ok: $(du -h "$d/db-$day.dump" | cut -f1) db, $(du -h "$d/uploads-$day.tgz" | cut -f1) uploads"
```

`/etc/systemd/system/devconnector-backup.service`

```ini
[Unit]
Description=DevConnector: nightly database dump + uploads snapshot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/devconnector-backup
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
systemctl start devconnector-backup.service && journalctl -u devconnector-backup.service -n 3 -o cat   # "backup ok: …"
docker run --rm -i postgres:18-alpine pg_restore --list < backups/db-$(date +%F).dump | grep -c 'TABLE DATA'   # dump is readable
```

The Debian template runs in **UTC**, so 03:30 here is 04:30/05:30 in Switzerland. Set `timedatectl set-timezone Europe/Zurich` if you prefer local times in logs and timers.

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
| Create / promote the owner | `docker compose -f compose.prod.yml exec app node dist/scripts/owner-create.js you@example.com "$(openssl rand -hex 32)"` (then "Forgot password") |
| Mail delivery status | `… exec -T db psql -U devconnector -d devconnector -Atc "select id, subject, sent_at, attempts, last_error from email_outbox order by id desc limit 10"` |
| Import the Supabase dump | MIGRATION.md (`node dist/scripts/import-supabase.js …` inside the container) |
| Apply migrations manually | `docker compose -f compose.prod.yml exec app node dist/scripts/migrate.js` (normally automatic) |
| Update now | `systemctl start devconnector-pull.service` |
| Disk usage | `docker system df`, `du -sh data/*` |
| Container hardening | read-only root FS, `no-new-privileges`, non-root `node`, database never published |

## 7. Gitea (secondary, optional)

Mirror the repository to your Gitea and register a runner **with Docker access**; the same `.github/workflows/ci.yml` runs `check`, `api-integration` and `security`, and the `image-gitea` job pushes a single-arch image when the repository secrets `REGISTRY`, `REGISTRY_USER`, `REGISTRY_TOKEN` exist (a Gitea access token — an existing account, no new service). Point `APP_TAG`/the image name in `compose.prod.yml` at that registry if you want the LXC to pull from Gitea instead of GHCR; private registries then need `docker login` on the LXC once.
