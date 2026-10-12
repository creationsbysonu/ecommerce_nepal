#!/usr/bin/env node
/**
 * Generates the secrets needed to apply render.yaml:
 *   - JWT_SECRET        -> shared by GoTrue + PostgREST (HS256 signing)
 *   - anon key          -> NEXT_PUBLIC_SUPABASE_ANON_KEY (public, safe for client)
 *
 * Writes .render-secrets/keys.txt (gitignored, chmod 600).
 * Run: npm run db:keys
 */
import { createHmac, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64url = (buf) => Buffer.from(buf).toString('base64url');

const jwtSecret = randomBytes(32).toString('base64url');

function signKey(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', jwtSecret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 365 * 10; // 10 years
const anonKey = signKey({ iss: 'supabase', role: 'anon', iat: now, exp });

const outDir = join(root, '.render-secrets');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'keys.txt');
const content = `# Mero Pasal — Render deployment keys (GITIGNORED — never commit)
# Paste these into Render when applying render.yaml (prompted fields):

# env group "meropasal-auth-secrets":
GOTRUE_JWT_SECRET=${jwtSecret}

# env group "meropasal-api-secrets":
PGRST_JWT_SECRET=${jwtSecret}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`;
writeFileSync(outFile, content, { mode: 0o600 });
console.log(`Wrote ${outFile}`);
console.log('Next: paste the values above into Render when it prompts during blueprint apply.');
