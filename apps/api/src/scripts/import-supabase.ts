import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createDatabase } from '../db/client.ts';
import { importSupabase } from '../db/import-supabase.ts';
import { runMigrations } from '../db/migrate.ts';
import { loadEnv } from '../env.ts';
import { createLogger } from '../lib/logger.ts';
import { createLocalStorage } from '../lib/storage.ts';
import { createFilesService } from '../modules/files/service.ts';

const USAGE = `Import a restored Supabase dump into this database (ADR-012, docs/modernize/MIGRATION.md).

  pnpm import:supabase -- --source postgres://user:pass@localhost:5433/legacy [options]

  --source <url>         scratch PostgreSQL where the dump was restored (required)
  --dry-run              compute the report, write nothing
  --keep-visibility      keep the legacy isPublic flag (default: every imported profile is public)
  --avatars              download avatars from the public bucket (needs --supabase-url)
  --supabase-url <url>   https://<ref>.supabase.co
  --report <file>        where to write the JSON report (default: import-report.json)
`;

const { values } = parseArgs({
  options: {
    source: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'keep-visibility': { type: 'boolean', default: false },
    avatars: { type: 'boolean', default: false },
    'supabase-url': { type: 'string' },
    report: { type: 'string', default: 'import-report.json' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || !values.source) {
  process.stdout.write(USAGE);
  process.exit(values.help ? 0 : 1);
}
if (values.avatars && !values['supabase-url']) {
  console.error('--avatars needs --supabase-url https://<ref>.supabase.co');
  process.exit(1);
}

const env = loadEnv();
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL, logger);
try {
  await runMigrations(database.db);
  const files = createFilesService({
    db: database.db,
    storage: createLocalStorage(env.UPLOADS_DIR),
    maxUploadBytes: env.MAX_UPLOAD_MB * 1024 * 1024,
    log: logger,
  });
  const report = await importSupabase({
    sourceUrl: values.source,
    db: database.db,
    dryRun: values['dry-run'],
    keepVisibility: values['keep-visibility'],
    avatars:
      values.avatars && values['supabase-url']
        ? { supabaseUrl: values['supabase-url'], files }
        : undefined,
    logger,
  });
  writeFileSync(values.report, JSON.stringify(report, null, 2));
  logger.info({ report: values.report }, 'report written');
  if (report.skipped.length || report.avatarFailures.length) {
    logger.warn(
      { skipped: report.skipped.length, avatarFailures: report.avatarFailures.length },
      'some rows were skipped — see the report',
    );
  }
} finally {
  await database.close();
}
