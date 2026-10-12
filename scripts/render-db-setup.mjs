#!/usr/bin/env node
/**
 * Applies the full schema to a Render Postgres database, in order:
 *   1. supabase/render/00-bootstrap.sql  (roles, grants, auth.uid)
 *   2. supabase/migrations/*.sql         (app schema)
 *
 * Prerequisite: the mero-pasal-auth service (GoTrue) must have booted at
 * once so auth.users exists — the script waits for it automatically.
 *
 * Usage:
 *   RENDER_DB_URL="postgres://..." npm run db:render
 * (Use the database's External Connection string from the Render dashboard.)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.RENDER_DB_URL || process.env.DATABASE_URL;

if (!url) {
  console.error('ERROR: set RENDER_DB_URL to your Render Postgres External Connection string.');
  console.error('  Render Dashboard -> meropasal-db -> Connections -> External Database URL');
  process.exit(1);
}

const MAX_WAIT_MS = 5 * 60 * 1000;
const WAIT_INTERVAL_MS = 10_000;

async function waitForAuthUsers(client) {
  const started = Date.now();
  for (;;) {
    const { rows } = await client.query(
      "SELECT to_regclass('auth.users') AS t"
    );
    if (rows[0].t) {
      console.log('auth.users present (GoTrue has booted).');
      return;
    }
    if (Date.now() - started > MAX_WAIT_MS) {
      console.error(
        'ERROR: auth.users still missing after 5 min.\n' +
        '  Check the mero-pasal-auth service logs in Render (it creates auth.users on first boot).'
      );
      process.exit(1);
    }
    console.log('Waiting for auth.users (GoTrue first boot)…');
    await new Promise((r) => setTimeout(r, WAIT_INTERVAL_MS));
  }
}

async function runFile(client, path) {
  const sql = readFileSync(path, 'utf8');
  console.log(`Applying ${path.replace(root + '/', '')} …`);
  await client.query(sql); // simple-query protocol: multi-statement, one implicit txn
}

async function main() {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Render Postgres.');

    await waitForAuthUsers(client);

    await runFile(client, join(root, 'supabase/render/00-bootstrap.sql'));

    const migDir = join(root, 'supabase/migrations');
    const files = readdirSync(migDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const f of files) {
      await runFile(client, join(migDir, f));
    }

    const { rows } = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log(`Done. public schema now has ${rows[0].count} tables.`);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
