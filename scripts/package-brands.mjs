#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BRANDS_DIR, ROOT, listBrands } from './brand.mjs';

const target = process.argv.includes('--mac') ? '--mac' : '--win';
const brands = listBrands();
if (brands.length === 0) throw new Error(`品牌目录为空：${BRANDS_DIR}`);

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

for (const brand of brands) {
  console.log(`\n[brand-pack] ${brand} (${target})`);
  const env = { BRAND: brand };
  run(process.platform === 'win32' ? 'node.exe' : 'node', ['scripts/generate-brand.mjs'], env);
  run(process.platform === 'win32' ? 'electron-vite.cmd' : 'electron-vite', ['build'], env);
  const output = join('release', brand);
  run(process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder', [target, '--config', 'electron-builder.generated.json', `--config.directories.output=${output}`], env);
  if (!existsSync(join(ROOT, output))) throw new Error(`品牌安装包输出目录不存在：${output}`);
}

// Keep the checked-in development defaults deterministic after a matrix build.
run(process.platform === 'win32' ? 'node.exe' : 'node', ['scripts/generate-brand.mjs'], { BRAND: 'huanxing' });
