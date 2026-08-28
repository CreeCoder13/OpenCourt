import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptPath = fileURLToPath(
  new URL('../scripts/check-openc-api-key.mjs', import.meta.url),
);

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
