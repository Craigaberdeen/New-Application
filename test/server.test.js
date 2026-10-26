const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');
let server, origin;
before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
test('home page loads application assets', async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Cabline/);
  for (const asset of ['/app.js', '/style.css']) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 100);
  }
});
test('JavaScript has correct content type and safety header', async () => {
  const r = await fetch(origin + '/app.js');
  assert.match(r.headers.get('content-type'), /javascript/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
test('missing files return 404', async () => {
  assert.equal((await fetch(origin + '/missing.js')).status, 404);
});
test('source and repository files cannot be read', async () => {
  assert.equal((await fetch(origin + '/%2e%2e%2fpackage.json')).status, 403);
});
test('malformed URL returns 400 instead of crashing server', async () => {
  assert.equal((await fetch(origin + '/%XX')).status, 400);
  assert.equal((await fetch(origin)).status, 200);
});
test('unsupported methods are rejected', async () => {
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
});
