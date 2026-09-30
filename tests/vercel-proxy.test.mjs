import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHandler } from '../vercel/score-proxy.mjs';

async function invoke(fetcher, { path = '/api/scores', method = 'GET', body = '', headers = {} } = {}) {
  const request = Object.assign(Readable.from(body ? [body] : []), { url: path, method, headers: { host: 'bloom.vercel.app', ...headers } });
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } };
  await createHandler(fetcher)(request, response);
  return response;
}
test('forwards score data and statuses without forwarding browser credentials', async () => {
  const payload = JSON.stringify({ id: 'session', token: 'game-token', name: '검증', events: [] });
  const response = await invoke(async (url, options) => {
    assert.equal(url, 'https://bloom-mahjong-garden.kimkirik.chatgpt.site/api/scores');
    assert.equal(options.method, 'POST');
    assert.equal(options.body.toString(), payload);
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Origin, new URL(url).origin);
    return Response.json({ record: { score: 200 } }, { status: 201 });
  }, { method: 'POST', body: payload, headers: { origin: 'https://bloom.vercel.app', cookie: 'private=value', authorization: 'private' } });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.record.score, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});
test('rejects foreign origins, unsupported routes and methods, and oversized bodies before forwarding', async () => {
  const noForward = async () => { assert.fail('must not forward rejected request'); };
  for (const [options, expected] of [
    [{ headers: { origin: 'https://unrelated.invalid' } }, 403],
    [{ path: '/api/anything' }, 404],
    [{ path: '/api/sessions' }, 405],
    [{ method: 'DELETE' }, 405],
    [{ method: 'POST', body: 'x'.repeat(500001) }, 413],
  ]) assert.equal((await invoke(noForward, options)).statusCode, expected);
});
test('preserves upstream validation errors and handles unavailable upstream', async () => {
  const invalid = await invoke(async () => Response.json({ error: '잘못된 기록' }, { status: 400 }));
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.error, '잘못된 기록');
  const offline = await invoke(async () => { throw new Error('network'); });
  assert.equal(offline.statusCode, 503);
});
