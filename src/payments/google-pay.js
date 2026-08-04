// Google Pay on the Web via TPDirect.googlePay.
//
// Flow (per TapPay docs, "Google Pay on the Web"):
//   1. setupGooglePay(setting)          — merchant / card config
//   2. setupPaymentRequest(req, cb)     — probe device support (canUseGooglePay)
//   3. setupTransactionPrice({...}) OR price passed in step 2
//   4. setupGooglePayButton(...)  or  getPrime(cb)  — obtain prime
// The prime is then sent to your server for Pay-by-Prime.

import { TapPayError } from '../core/errors.js';

/**
 * @typedef {object} GooglePayOptions
 * @property {string} [googleMerchantId]  Required in production (Google portal).
 * @property {string} merchantName
 * @property {string[]} [allowedCardAuthMethods]  Default ["PAN_ONLY","CRYPTOGRAM_3DS"].
 * @property {string[]} [allowedNetworks]         Default ["AMEX","JCB","MASTERCARD","VISA"].
 * @property {string[]} [allowedCountryCodes]     Default ["TW"].
 * @property {boolean} [emailRequired]
 * @property {boolean} [phoneNumberRequired]
 * @property {boolean} [shippingAddressRequired]
 * @property {boolean} [billingAddressRequired]
 * @property {'MIN'|'FULL'} [billingAddressFormat]
 * @property {boolean} [allowPrepaidCards]
 * @property {string|number} [price]
 * @property {string} [currency]  Default "TWD".
 */

const DEFAULTS = {
  allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  allowedNetworks: ['AMEX', 'JCB', 'MASTERCARD', 'VISA'],
  allowedCountryCodes: ['TW'],
  billingAddressFormat: 'MIN',
  currency: 'TWD',
};

export class GooglePayment {
  /**
   * @param {import('../core/client.js').TapPayClient} client
   * @param {GooglePayOptions} options
   */
  constructor(client, options) {
    if (!options || !options.merchantName) {
      throw new TapPayError('googlePay() requires a merchantName', {
        code: TapPayError.CODES.NOT_CONFIGURED,
      });
    }
    this._client = client;
    this._options = { ...DEFAULTS, ...options };
    this._available = false;
    this._configured = false;
  }

  /** Whether the browser/device reported it can use Google Pay. */
  get available() {
    return this._available;
  }

  /**
   * Run setupGooglePay + setupPaymentRequest and resolve device availability.
   * @returns {Promise<boolean>} canUseGooglePay
   */
  async init() {
    const TPDirect = await this._client.ready({ googlePay: true });
    const o = this._options;

    TPDirect.googlePay.setupGooglePay({
      googleMerchantId: o.googleMerchantId,
      allowedCardAuthMethods: o.allowedCardAuthMethods,
      merchantName: o.merchantName,
      emailRequired: o.emailRequired,
      shippingAddressRequired: o.shippingAddressRequired,
      billingAddressRequired: o.billingAddressRequired,
      billingAddressFormat: o.billingAddressFormat,
      allowPrepaidCards: o.allowPrepaidCards,
      allowedCountryCodes: o.allowedCountryCodes,
      phoneNumberRequired: o.phoneNumberRequired,
    });

    this._available = await new Promise((resolve) => {
      TPDirect.googlePay.setupPaymentRequest(
        {
          allowedNetworks: o.allowedNetworks,
          price: o.price != null ? String(o.price) : undefined,
          currency: o.currency,
        },
        (_err, result) => resolve(Boolean(result && result.canUseGooglePay)),
      );
    });
    this._configured = true;
    return this._available;
  }

  /** Update the amount before requesting a prime (optional if set in init). */
  async setPrice(price, currency = this._options.currency) {
    const TPDirect = await this._client.ready({ googlePay: true });
    TPDirect.googlePay.setupTransactionPrice({ price: String(price), currency });
  }

  /**
   * Render TapPay's official Google Pay button into `el`. When the user
   * completes the sheet, `onPrime` receives the prime string.
   * @param {object} cfg
   * @param {string|HTMLElement} cfg.el
   * @param {'black'|'white'} [cfg.color]
   * @param {'long'|'short'} [cfg.type]
   * @param {(prime:string, result:object)=>void} cfg.onPrime
   * @param {(err:TapPayError)=>void} [cfg.onError]
   */
  async renderButton(cfg) {
    if (!this._configured) await this.init();
    if (!this._available) {
      const err = new TapPayError('Google Pay is not available on this device', {
        code: TapPayError.CODES.GOOGLE_PAY_UNAVAILABLE,
      });
      cfg.onError?.(err);
      throw err;
    }
    const TPDirect = await this._client.ready({ googlePay: true });
    TPDirect.googlePay.setupGooglePayButton({
      el: typeof cfg.el === 'string' ? cfg.el : cfg.el,
      color: cfg.color || 'black',
      type: cfg.type || 'long',
      getPrimeCallback: (err, prime, result) => {
        if (err) return cfg.onError?.(toError(err));
        cfg.onPrime(prime, result);
      },
    });
  }

  /**
   * Trigger the Google Pay sheet programmatically and resolve with a prime.
   * Use when you render your own button instead of `renderButton`.
   * @returns {Promise<{prime:string, result:object}>}
   */
  async getPrime() {
    if (!this._configured) await this.init();
    if (!this._available) {
      throw new TapPayError('Google Pay is not available on this device', {
        code: TapPayError.CODES.GOOGLE_PAY_UNAVAILABLE,
      });
    }
    const TPDirect = await this._client.ready({ googlePay: true });
    return new Promise((resolve, reject) => {
      TPDirect.googlePay.getPrime((err, prime, result) => {
        if (err) return reject(toError(err));
        resolve({ prime, result });
      });
    });
  }
}

function toError(err) {
  if (err instanceof TapPayError) return err;
  return new TapPayError(err?.msg || 'Google Pay getPrime failed', {
    status: err?.status,
    code: TapPayError.CODES.GET_PRIME_FAILED,
    cause: err?.originalError ?? err,
  });
}

export const _internal = { DEFAULTS };
