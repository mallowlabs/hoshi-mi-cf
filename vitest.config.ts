import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            API_TOKEN: 'test-token',
          },
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
      globals: true,
      setupFiles: ['./src/test/apply-migrations.ts'],
    },
  };
});
