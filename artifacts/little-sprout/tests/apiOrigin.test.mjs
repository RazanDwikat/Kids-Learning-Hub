import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nativeApiOrigin } from '../hooks/apiOrigin.ts';

test('native API accepts LAN development origins and requires HTTPS in release', () => {
  assert.equal(nativeApiOrigin('http://192.168.1.10:3000', true), 'http://192.168.1.10:3000');
  assert.equal(nativeApiOrigin('http://localhost:3000/', true), 'http://localhost:3000');
  assert.equal(nativeApiOrigin('http://10.0.2.2:3000', false), null);
  assert.equal(nativeApiOrigin('https://example.com/', false), 'https://example.com');
});
test('native API rejects missing, malformed and credential-bearing URLs', () => {
  for (const value of [undefined, '', 'example.com', 'file:///tmp/api', 'https://example.com/api',
    'https://user:password@example.com', 'https://example.com?token=1', 'https://example.com#fragment']) {
    assert.equal(nativeApiOrigin(value, true), null);
    assert.equal(nativeApiOrigin(value, false), null);
  }
});
