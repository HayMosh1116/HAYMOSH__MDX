const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pairRoute = require('../routes/pair');
const { getActiveSessionCount } = require('../mayel/sessionLimiter');

test('pair route rejects missing, repeated and malformed phone numbers before allocating a session', async () => {
  const app = express();
  app.use('/code', pairRoute);
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const before = getActiveSessionCount();
  try {
    for (const query of ['', '?number=123', '?number=1234567890&number=9999999999', '?number=abcdefghij']) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/code/${query}`);
      assert.equal(response.status, 400);
      assert.match(response.headers.get('cache-control') || '', /no-store/);
    }
    assert.equal(getActiveSessionCount(), before);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
