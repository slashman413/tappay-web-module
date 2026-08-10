// tappay-web-module — zero-dependency test suite (node --test).
// Covers the pure logic that does not require a browser DOM:
//   exports/VERSION, SDK URL construction, error normalization,
//   wallet metadata coverage, and client configuration validation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createTapPay,
  TapPayClient,
  TapPayError,
  WALLET_METADATA,
  WalletPayment,
  VERSION,
} from '../src/index.js';

import { loadTapPaySDK, _internal } from '../src/core/loader.js';

test('public API exposes all documented symbols', async () => {
  const mod = await import('../src/index.js');
  for (const name of [
    'TapPayClient',
    'createTapPay',
    'CardPayment',
    'GooglePayment',
    'ApplePayment',
    'SamsungPayment',
    'WalletPayment',
    'WALLET_METADATA',
    'Checkout',
    'TapPayError',
    'loadTapPaySDK',
    'VERSION',
  ]) {
    assert.ok(name in mod, `missing export: ${name}`);
  }
});

test('VERSION matches package.json', async () => {
  const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version, 'src/index.js VERSION must match package.json version');
});

test('SDK URL builder uses modern path for v5.14+ and legacy path below', () => {
  const { tapPaySrc } = _internal;
  assert.equal(tapPaySrc('v5.14.0'), 'https://js.tappaysdk.com/sdk/tpdirect/v5.14.0');
  assert.equal(tapPaySrc('v5.24.0'), 'https://js.tappaysdk.com/sdk/tpdirect/v5.24.0');
  assert.equal(tapPaySrc('v6.0.0'), 'https://js.tappaysdk.com/sdk/tpdirect/v6.0.0');
  assert.equal(tapPaySrc('v5.13.9'), 'https://js.tappaysdk.com/tpdirect/v5.13.9');
});

test('loadTapPaySDK rejects cleanly outside a browser', async () => {
  await assert.rejects(() => loadTapPaySDK(), (err) => {
    assert.ok(err instanceof TapPayError);
    assert.equal(err.code, TapPayError.CODES.SDK_LOAD_FAILED);
    return true;
  });
});

test('TapPayError normalizes meta and exposes stable codes', () => {
  const cause = { status: 123, msg: 'boom' };
  const err = TapPayError.fromPrimeResult(cause);
  assert.equal(err.name, 'TapPayError');
  assert.equal(err.code, 'get_prime_failed');
  assert.equal(err.status, 123);
  assert.equal(err.cause, cause);
  assert.ok(err instanceof Error);
  assert.ok(TapPayError.CODES.GET_PRIME_FAILED);
});

test('client requires appId and appKey', () => {
  assert.throws(() => createTapPay({}), TapPayError);
  assert.throws(() => new TapPayClient({ appId: 1 }), TapPayError);
  const client = createTapPay({ appId: 159881, appKey: 'app_test_key', serverType: 'sandbox' });
  assert.ok(client instanceof TapPayClient);
  assert.equal(client.serverType, 'sandbox');
  assert.equal(client.appId, 159881);
});

test('client defaults serverType to sandbox and exposes wallet helpers', () => {
  const client = createTapPay({ appId: 1, appKey: 'k' });
  assert.equal(client.serverType, 'sandbox');
  assert.equal(typeof client.linePay, 'function');
  assert.equal(typeof client.jkoPay, 'function');
  assert.equal(typeof client.cashOnDelivery, 'function');
  const lp = client.linePay('LINE Pay Express');
  assert.ok(lp instanceof WalletPayment);
  assert.equal(lp.walletType, 'linePay');
  assert.equal(lp.displayName, 'LINE Pay Express');
});

test('WALLET_METADATA covers all 13 token-and-redirect rails', () => {
  const expected = [
    'jkoPay', 'linePay', 'piWallet', 'easyWallet', 'iPassMoney',
    'pxPayPlus', 'plusPay', 'gogoPay', 'opPay', 'payLater',
    'aftee', 'virtualAccount', 'cashOnDelivery',
  ];
  assert.equal(Object.keys(WALLET_METADATA).length, expected.length);
  for (const rail of expected) {
    assert.ok(WALLET_METADATA[rail], `missing metadata for ${rail}`);
    assert.ok(WALLET_METADATA[rail].name, `missing name for ${rail}`);
    assert.ok(WALLET_METADATA[rail].title, `missing title for ${rail}`);
  }
});

test('WalletPayment falls back to metadata title for display name', () => {
  const client = createTapPay({ appId: 1, appKey: 'k' });
  const w = client.jkoPay();
  assert.equal(w.displayName, WALLET_METADATA.jkoPay.title);
  assert.equal(WALLET_METADATA.jkoPay.name, 'JKO Pay');
});
