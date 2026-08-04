// TapPayClient — the single entry point that owns SDK configuration.
//
// It wraps `TPDirect.setupSDK(appId, appKey, serverType)` and hands out the
// payment method objects. Everything downstream (card, google pay) goes
// through a configured client, so credentials live in exactly one place.

import { loadTapPaySDK } from './loader.js';
import { TapPayError } from './errors.js';
import { CardPayment } from '../payments/card.js';
import { GooglePayment } from '../payments/google-pay.js';
import { ApplePayment } from '../payments/apple-pay.js';
import { SamsungPayment } from '../payments/samsung-pay.js';
import { WalletPayment } from '../payments/wallet.js';

export class TapPayClient {
  /**
   * @param {object} config
   * @param {number} config.appId              TapPay App ID (see Portal).
   * @param {string} config.appKey             TapPay App Key.
   * @param {'sandbox'|'production'} [config.serverType='sandbox']
   * @param {string} [config.sdkVersion]       Web SDK version, e.g. "v5.14.0".
   * @param {string} [config.sdkIntegrity]     Optional SRI hash for the SDK.
   */
  constructor(config) {
    if (!config || config.appId == null || !config.appKey) {
      throw new TapPayError('TapPayClient requires { appId, appKey }', {
        code: TapPayError.CODES.NOT_CONFIGURED,
      });
    }
    this.appId = config.appId;
    this.appKey = config.appKey;
    this.serverType = config.serverType || 'sandbox';
    this.sdkVersion = config.sdkVersion;
    this.sdkIntegrity = config.sdkIntegrity;
    this._sdk = null;
    this._ready = null;
  }

  /**
   * Load the SDK and call setupSDK exactly once. Safe to await repeatedly.
   * @param {object} [opts]
   * @param {boolean} [opts.googlePay] Preload Google's pay.js alongside.
   * @returns {Promise<typeof window.TPDirect>}
   */
  ready(opts = {}) {
    if (this._ready) return this._ready;
    this._ready = (async () => {
      const TPDirect = await loadTapPaySDK({
        version: this.sdkVersion,
        integrity: this.sdkIntegrity,
        googlePay: opts.googlePay,
      });
      TPDirect.setupSDK(this.appId, this.appKey, this.serverType);
      this._sdk = TPDirect;
      return TPDirect;
    })();
    return this._ready;
  }

  /**
   * Create a Direct Pay (credit-card) payment instance.
   * @param {import('../payments/card.js').CardOptions} [options]
   */
  card(options = {}) {
    return new CardPayment(this, options);
  }

  /**
   * Create a Google Pay (web) payment instance.
   * @param {import('../payments/google-pay.js').GooglePayOptions} options
   */
  googlePay(options) {
    return new GooglePayment(this, options);
  }

  /**
   * Create an Apple Pay / Payment Request API payment instance.
   * @param {object} [options]
   */
  applePay(options = {}) {
    return new ApplePayment(this, options);
  }

  /**
   * Create a Samsung Pay on the Web payment instance.
   * @param {object} options
   */
  samsungPay(options) {
    return new SamsungPayment(this, options);
  }

  /**
   * Create a generic Wallet or Redirect payment instance.
   * @param {string} walletType
   * @param {string} [displayName]
   */
  wallet(walletType, displayName) {
    return new WalletPayment(this, walletType, displayName);
  }

  // --- Convenience helper methods for regional Taiwan wallets and alternative payment rails ---
  jkoPay(displayName) { return this.wallet('jkoPay', displayName); }
  linePay(displayName) { return this.wallet('linePay', displayName); }
  piWallet(displayName) { return this.wallet('piWallet', displayName); }
  easyWallet(displayName) { return this.wallet('easyWallet', displayName); }
  iPassMoney(displayName) { return this.wallet('iPassMoney', displayName); }
  pxPayPlus(displayName) { return this.wallet('pxPayPlus', displayName); }
  plusPay(displayName) { return this.wallet('plusPay', displayName); }
  gogoPay(displayName) { return this.wallet('gogoPay', displayName); }
  opPay(displayName) { return this.wallet('opPay', displayName); }
  payLater(displayName) { return this.wallet('payLater', displayName); }
  aftee(displayName) { return this.wallet('aftee', displayName); }
  virtualAccount(displayName) { return this.wallet('virtualAccount', displayName); }
  cashOnDelivery(displayName) { return this.wallet('cashOnDelivery', displayName); }
}

/**
 * Convenience factory: `createTapPay({ appId, appKey, serverType })`.
 * @returns {TapPayClient}
 */
export function createTapPay(config) {
  return new TapPayClient(config);
}
