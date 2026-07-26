import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRANDS_DIR, loadBrand, ROOT } from './brand.mjs';

const brand = loadBrand();
const configDir = join(ROOT, 'src', 'config');
mkdirSync(configDir, { recursive: true });
const source = `const activeBrand = ${JSON.stringify(brand, null, 2)};\n\nexport default activeBrand;\n`;
writeFileSync(join(configDir, 'activeBrand.ts'), source, 'utf8');

const packagePath = join(ROOT, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const build = packageJson.build || {};
build.appId = brand.appId;
build.productName = brand.productName;
build.win = { ...(build.win || {}), executableName: brand.id };
build.nsis = { ...(build.nsis || {}), shortcutName: brand.productName, uninstallDisplayName: brand.productName };
writeFileSync(join(ROOT, 'electron-builder.generated.json'), `${JSON.stringify(build, null, 2)}\n`, 'utf8');
console.log(`[brand] ${brand.id}: ${brand.productName}`);
