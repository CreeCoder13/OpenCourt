import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';

const scriptPath = fileURLToPath(
  new URL('../scripts/check-openc-api-key.mjs', import.meta.url),
);
const projectRoot = dirname(dirname(scriptPath));

test('preflight fails clearly when OPENC_API_KEY is missing', () => {
  const env = { ...process.env };
  delete env.OPENC_API_KEY;

  assert.throws(
    () => execFileSync(process.execPath, [scriptPath], { env, stdio: 'pipe' }),
    (error) => {
      assert.match(error.stderr.toString(), /OPENC_API_KEY is not configured/);
      return true;
    },
  );
});

test('preflight confirms configuration without printing the value', () => {
  const value = 'test-only-value';
  const output = execFileSync(process.execPath, [scriptPath], {
    env: { ...process.env, OPENC_API_KEY: value },
    encoding: 'utf8',
  });

  assert.match(output, /OPENC_API_KEY is configured/);
  assert.doesNotMatch(output, new RegExp(value));
});

test('browser-facing source never references OPENC_API_KEY', () => {
  const roots = ['app', 'components', 'public'];
  const files = [];
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const target = join(path, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (/\.(?:js|jsx|ts|tsx|html|css|map)$/.test(entry.name)) files.push(target);
    }
  };
  for (const root of roots) visit(join(projectRoot, root));
  for (const file of files) assert.doesNotMatch(readFileSync(file, 'utf8'), /OPENC_API_KEY/);
});
