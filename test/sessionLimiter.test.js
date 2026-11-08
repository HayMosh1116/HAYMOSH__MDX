const test = require('node:test');
const assert = require('node:assert/strict');
const { acquireAuthSession, getActiveSessionCount } = require('../mayel/sessionLimiter');

test('bounds concurrent sessions and releases a slot only once', () => {
  const before = getActiveSessionCount();
  const release = acquireAuthSession(`capacity-${Math.random()}`, { maxActive: before + 1, maxPerIp: 5 });
  assert.equal(typeof release, 'function');
  assert.equal(getActiveSessionCount(), before + 1);
  assert.equal(acquireAuthSession(`capacity-2-${Math.random()}`, { maxActive: before + 1 }), null);
  release();
  release();
  assert.equal(getActiveSessionCount(), before);
});

test('limits recent attempts from a client even after its earlier session ends', () => {
  const ip = `rate-limit-${Math.random()}`;
  const release = acquireAuthSession(ip, { maxActive: 10, maxPerIp: 1, windowMs: 60_000 });
  assert.equal(typeof release, 'function');
  release();
  assert.equal(acquireAuthSession(ip, { maxActive: 10, maxPerIp: 1, windowMs: 60_000 }), null);
});
