const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

function resolvePrismaCli() {
  try {
    return require.resolve('prisma/build/index.js');
  } catch {
    const candidates = [
      path.resolve(__dirname, '../../../node_modules/prisma/build/index.js'),
      path.resolve(__dirname, '../node_modules/prisma/build/index.js'),
      path.resolve(process.cwd(), 'node_modules/prisma/build/index.js'),
    ];
    return candidates.find((file) => existsSync(file)) ?? null;
  }
}

const prismaCli = resolvePrismaCli();
if (!prismaCli) {
  console.warn('[database] prisma CLI not found; skipping generate (will run during build)');
  process.exit(0);
}

try {
  execFileSync(process.execPath, [prismaCli, 'generate'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
} catch (error) {
  console.warn('[database] prisma generate failed during postinstall; continuing');
  console.warn(error instanceof Error ? error.message : error);
  process.exit(0);
}
