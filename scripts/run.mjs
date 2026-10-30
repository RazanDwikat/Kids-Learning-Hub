import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (existsSync('.env')) process.loadEnvFile('.env');
const children = [];
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
function run(args, env = {}) {
  const child = spawn(pnpm, args, {
    cwd: root, stdio: 'inherit', env: { ...process.env, ...env },
    shell: process.platform === 'win32', detached: process.platform !== 'win32',
  });
  children.push(child);
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Command exited ${code}`)));
  });
}
function stop() {
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
    }
  }
}
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });
try {
  const command = process.argv[2];
  if (command === 'db') {
    if (process.env.NODE_ENV === 'production') throw new Error('db:push is development-only. Review production migrations separately.');
    await run(['--filter', '@workspace/db', 'push']);
  } else if (command === 'test') {
    await run(['--filter', '@workspace/api-server', 'test']);
    await run(['--filter', '@workspace/little-sprout', 'exec', 'node', '--test', 'tests/*.test.mjs']);
  } else if (command === 'start') {
    await run(['--filter', '@workspace/api-server', 'start'], { NODE_ENV: 'production', SERVE_WEB: 'true' });
  } else if (command === 'dev' || command === 'native') {
    await run(['--filter', '@workspace/api-server', 'build']);
    const api = run(['--filter', '@workspace/api-server', 'start'], {
      NODE_ENV: 'development', PORT: process.env.PORT || '3000',
      ...(command === 'dev' ? { EXPO_DEV_ORIGIN: 'http://127.0.0.1:8081' } : {}),
    });
    const expo = run(['--filter', '@workspace/little-sprout', 'exec', 'expo', 'start',
      '--lan', '--port', '8081'], { NODE_ENV: 'development' });
    await Promise.all([api, expo]);
  } else throw new Error('Expected dev, native, db, test or start');
} catch (error) {
  console.error(error.message);
  stop();
  process.exitCode = 1;
}
