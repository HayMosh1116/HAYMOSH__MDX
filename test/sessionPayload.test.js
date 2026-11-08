const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { SESSION_PREFIX, serializeSessionDirectory } = require('../mayel/sessionPayload');

test('serializes credentials and Signal keys into the versioned session token', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'haywhy-session-'));
  try {
    await fs.mkdir(path.join(root, 'keys'), { mode: 0o700 });
    await fs.writeFile(path.join(root, 'creds.json'), JSON.stringify({ registered: true, me: { id: '123@s.whatsapp.net' } }));
    await fs.writeFile(path.join(root, 'keys', 'app-state-sync-key-1.json'), JSON.stringify({ keyData: 'fixture' }));
    const token = await serializeSessionDirectory(root);
    assert.ok(token.startsWith(SESSION_PREFIX));
    const decoded = JSON.parse(zlib.gunzipSync(Buffer.from(token.slice(SESSION_PREFIX.length), 'base64')).toString('utf8'));
    assert.equal(decoded.version, 2);
    assert.deepEqual(decoded.files.map(file => file.path).sort(), ['creds.json', 'keys/app-state-sync-key-1.json']);
    assert.equal(JSON.parse(Buffer.from(decoded.files.find(file => file.path === 'keys/app-state-sync-key-1.json').data, 'base64').toString()).keyData, 'fixture');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('rejects an incomplete auth directory and symbolic links', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'haywhy-session-'));
  try {
    await assert.rejects(serializeSessionDirectory(root), /missing creds\.json/);
    await fs.writeFile(path.join(root, 'creds.json'), JSON.stringify({ registered: false }));
    const linkedFile = path.join(root, 'linked.json');
    await fs.writeFile(path.join(root, 'source.json'), '{}');
    await fs.symlink(path.join(root, 'source.json'), linkedFile);
    await assert.rejects(serializeSessionDirectory(root), /symbolic links/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
