const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

const SESSION_PREFIX = 'HAYWHY_MDX2!';
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;

async function collectFiles(root, current = root, files = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error('Auth state must not contain symbolic links');
    }
    if (entry.isDirectory()) {
      await collectFiles(root, absolutePath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    if (!/^[A-Za-z0-9._/-]+\.json$/.test(relativePath) || relativePath.split('/').some(part => part === '.' || part === '..')) {
      throw new Error('Unexpected file in auth state');
    }
    const data = await fs.readFile(absolutePath);
    if (data.length > MAX_FILE_BYTES) throw new Error('Auth-state file exceeds the allowed size');
    files.push({ path: relativePath, data: data.toString('base64') });
    if (files.length > MAX_FILES) throw new Error('Auth state contains too many files');
  }
  return files;
}

async function serializeSessionDirectory(authDirectory) {
  const root = path.resolve(authDirectory);
  const files = await collectFiles(root);
  const creds = files.find(file => file.path === 'creds.json');
  if (!creds) throw new Error('Auth state is missing creds.json');
  const totalBytes = files.reduce((sum, file) => sum + Buffer.byteLength(file.data, 'base64'), 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error('Auth state exceeds the allowed size');
  const credsValue = JSON.parse(Buffer.from(creds.data, 'base64').toString('utf8'));
  if (!credsValue || typeof credsValue !== 'object' || Array.isArray(credsValue)) {
    throw new Error('Auth credentials are invalid');
  }
  const serialized = Buffer.from(JSON.stringify({ version: 2, files }), 'utf8');
  const compressed = zlib.gzipSync(serialized);
  if (compressed.length > MAX_ARCHIVE_BYTES) throw new Error('Compressed auth state exceeds the allowed size');
  return SESSION_PREFIX + compressed.toString('base64');
}

module.exports = { SESSION_PREFIX, serializeSessionDirectory };
