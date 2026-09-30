import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.vercel/output');
await rm(output, { recursive: true, force: true });
await build({
  configFile: false,
  root: path.join(root, 'vercel/client'),
  publicDir: path.join(root, 'public'),
  plugins: [react()],
  build: { outDir: path.join(output, 'static'), emptyOutDir: true },
});
for (const endpoint of ['sessions', 'scores']) {
  const directory = path.join(output, 'functions/api', `${endpoint}.func`);
  await mkdir(directory, { recursive: true });
  await copyFile(path.join(root, 'vercel/score-proxy.mjs'), path.join(directory, 'index.mjs'));
  await writeFile(path.join(directory, '.vc-config.json'), JSON.stringify({
    runtime: 'nodejs24.x', handler: 'index.mjs', launcherType: 'Nodejs', maxDuration: 30,
  }));
}
await writeFile(path.join(output, 'config.json'), JSON.stringify({ version: 3 }));
console.log('Vercel static game and score functions built.');
