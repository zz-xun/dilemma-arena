import { startVitest } from 'vitest/node';

const testRun = await startVitest('test', [], {
  run: true,
  watch: false,
  cache: false,
  include: ['src/domain/__tests__/**/*.test.ts'],
}, {
  configFile: false,
});

if (!testRun || process.exitCode) process.exit(process.exitCode || 1);
