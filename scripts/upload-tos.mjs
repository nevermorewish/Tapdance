import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const TOS_BUCKET = 'huanxing';
const TOS_ENDPOINT = 'https://tos-cn-beijing.volces.com';
const TOS_OBJECT_PREFIX = 'package/Tapdance';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeEndpoint(endpoint, bucket) {
  const value = endpoint.trim();
  const withProtocol = /^https?:\/\//u.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  const bucketPrefix = `${bucket.toLowerCase()}.`;
  const host = url.host.toLowerCase().startsWith(bucketPrefix)
    ? url.host.slice(bucketPrefix.length)
    : url.host;
  return host.replace(/\/+$/u, '');
}

function contentTypeFor(fileName) {
  switch (extname(fileName).toLowerCase()) {
    case '.exe':
      return 'application/vnd.microsoft.portable-executable';
    case '.yml':
      return 'text/yaml; charset=utf-8';
    case '.blockmap':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function main() {
  const sourceDir = resolve(process.argv[2] || 'release');
  const brand = requiredEnv('BRAND');
  const version = JSON.parse(await readFile('package.json', 'utf8')).version;
  const bucket = TOS_BUCKET;
  const endpoint = TOS_ENDPOINT;
  const objectPrefix = TOS_OBJECT_PREFIX;
  const brandPrefix = `${objectPrefix}/${brand}`;
  const versionPrefix = `${brandPrefix}/v${version}`;
  const latestPrefix = `${brandPrefix}/latest`;

  const files = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name !== 'builder-debug.yml')
    .map((entry) => entry.name)
    .sort();
  if (files.length === 0) {
    throw new Error(`No package files found under ${sourceDir}`);
  }

  for (const fileName of files) {
    const filePath = join(sourceDir, fileName);
    const body = await readFile(filePath);
    for (const prefix of [versionPrefix, latestPrefix]) {
      const key = `${prefix}/${fileName}`;
      const publicUrl = `https://${bucket}.${normalizeEndpoint(endpoint, bucket)}/${key}`;
      const response = await fetch(publicUrl, {
        method: 'PUT',
        headers: {
          'content-type': contentTypeFor(fileName),
          'content-length': String(body.byteLength),
        },
        body,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Anonymous TOS upload failed (${response.status}) for ${key}${detail ? `: ${detail}` : ''}`);
      }
      console.log(`Uploaded ${relative(process.cwd(), filePath)} -> ${publicUrl}`);
    }
  }
}

main().catch((error) => {
  console.error(`[TOS] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
