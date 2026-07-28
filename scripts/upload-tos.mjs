import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { request as httpsRequest } from 'node:https';
import { extname, join, relative, resolve } from 'node:path';

const TOS_BUCKET = 'huanxing';
const TOS_ENDPOINT = 'https://tos-cn-beijing.volces.com';
const TOS_OBJECT_PREFIX = 'package/Tapdance';
const MAX_UPLOAD_ATTEMPTS = 2;

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

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function uploadFile(filePath, publicUrl, contentType, contentLength) {
  return new Promise((resolveUpload, rejectUpload) => {
    let uploadedBytes = 0;
    let responseBody = '';
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearInterval(progressTimer);
      if (error) rejectUpload(error);
      else resolveUpload();
    };

    const request = httpsRequest(publicUrl, {
      method: 'PUT',
      headers: {
        'content-type': contentType,
        'content-length': String(contentLength),
      },
    }, (response) => {
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        if (responseBody.length < 64 * 1024) responseBody += chunk;
      });
      response.on('aborted', () => finish(new Error(`TOS response aborted for ${publicUrl}`)));
      response.on('end', () => {
        const statusCode = response.statusCode || 0;
        if (statusCode < 200 || statusCode >= 300) {
          const detail = responseBody.trim();
          finish(new Error(`Anonymous TOS upload failed (${statusCode}) for ${publicUrl}${detail ? `: ${detail}` : ''}`));
          return;
        }
        finish();
      });
    });

    request.on('error', (error) => {
      finish(new Error(`Anonymous TOS upload request failed for ${publicUrl}: ${error.message}`, { cause: error }));
    });

    const source = createReadStream(filePath);
    source.on('data', (chunk) => {
      uploadedBytes += chunk.byteLength;
    });
    source.on('error', (error) => request.destroy(error));
    source.pipe(request);

    const progressTimer = setInterval(() => {
      const percent = contentLength > 0 ? ((uploadedBytes / contentLength) * 100).toFixed(1) : '100.0';
      console.log(`Uploading ${relative(process.cwd(), filePath)}: ${percent}% (${formatMegabytes(uploadedBytes)}/${formatMegabytes(contentLength)})`);
    }, 30_000);
  });
}

async function uploadFileWithRetry(filePath, publicUrl, contentType, contentLength) {
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      console.log(`Uploading ${relative(process.cwd(), filePath)} -> ${publicUrl} (${formatMegabytes(contentLength)}, attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS})`);
      await uploadFile(filePath, publicUrl, contentType, contentLength);
      return;
    } catch (error) {
      if (attempt === MAX_UPLOAD_ATTEMPTS) throw error;
      console.warn(`[TOS] ${error instanceof Error ? error.message : String(error)}; retrying...`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000));
    }
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
    const { size } = await stat(filePath);
    for (const prefix of [versionPrefix, latestPrefix]) {
      const key = `${prefix}/${fileName}`;
      const publicUrl = `https://${bucket}.${normalizeEndpoint(endpoint, bucket)}/${key}`;
      await uploadFileWithRetry(filePath, publicUrl, contentTypeFor(fileName), size);
      console.log(`Uploaded ${relative(process.cwd(), filePath)} -> ${publicUrl}`);
    }
  }
}

main().catch((error) => {
  console.error(`[TOS] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
