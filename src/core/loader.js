// Dynamic SDK loader.
//
// Consumers should NOT have to hand-add <script> tags for the TapPay SDK and
// (optionally) Google's pay.js. This loader injects them on demand, dedupes
// concurrent/repeat calls, and resolves once the global is actually present.
//
// Docs pin the Web SDK path format to:
//   https://js.tappaysdk.com/sdk/tpdirect/v<version>   (>= v5.14.0)
// Older versions use the legacy path https://js.tappaysdk.com/tpdirect/v<...>.

import { TapPayError } from './errors.js';

const DEFAULT_TAPPAY_VERSION = 'v5.14.0';
const GOOGLE_PAY_JS = 'https://pay.google.com/gp/p/js/pay.js';

/** @type {Map<string, Promise<void>>} */
const inflight = new Map();

function tapPaySrc(version) {
  // v5.14.0+ lives under /sdk/tpdirect; earlier builds under /tpdirect.
  const isModern = /^v?5\.(1[4-9]|[2-9]\d)/.test(version) || /^v?[6-9]/.test(version);
  const path = isModern ? 'sdk/tpdirect' : 'tpdirect';
  return `https://js.tappaysdk.com/${path}/${version}`;
}

function injectScript(src, { integrity } = {}) {
  if (inflight.has(src)) return inflight.get(src);

  const promise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new TapPayError('SDK loader requires a browser environment', {
        code: TapPayError.CODES.SDK_LOAD_FAILED,
      }));
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(loadError(src)));
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    if (integrity) {
      el.integrity = integrity;
      el.crossOrigin = 'anonymous';
    }
    el.addEventListener('load', () => {
      el.dataset.loaded = 'true';
      resolve();
    });
    el.addEventListener('error', () => {
      inflight.delete(src);
      reject(loadError(src));
    });
    document.head.appendChild(el);
  });

  inflight.set(src, promise);
  return promise;
}

function loadError(src) {
  return new TapPayError(`Failed to load script: ${src}`, {
    code: TapPayError.CODES.SDK_LOAD_FAILED,
  });
}

/**
 * Ensure the TapPay Web SDK (`window.TPDirect`) is loaded.
 * @param {object} [opts]
 * @param {string} [opts.version]   TapPay SDK version tag, e.g. "v5.14.0".
 * @param {string} [opts.integrity] Optional SRI hash (see TapPay release notes).
 * @param {boolean} [opts.googlePay] Also load Google's pay.js.
 * @returns {Promise<typeof window.TPDirect>}
 */
export async function loadTapPaySDK({ version = DEFAULT_TAPPAY_VERSION, integrity, googlePay = false } = {}) {
  if (typeof window !== 'undefined' && window.TPDirect) {
    if (googlePay) await injectScript(GOOGLE_PAY_JS);
    return window.TPDirect;
  }
  if (googlePay) await injectScript(GOOGLE_PAY_JS);
  await injectScript(tapPaySrc(version), { integrity });
  if (typeof window === 'undefined' || !window.TPDirect) {
    throw new TapPayError('TapPay SDK loaded but window.TPDirect is undefined', {
      code: TapPayError.CODES.SDK_LOAD_FAILED,
    });
  }
  return window.TPDirect;
}

export const _internal = { tapPaySrc, DEFAULT_TAPPAY_VERSION, GOOGLE_PAY_JS };
