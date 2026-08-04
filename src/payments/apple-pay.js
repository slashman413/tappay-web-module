// Apple Pay & Web Payment Request API adapter via TPDirect.paymentRequestApi.
//
// Flow (per TapPay Apple Pay on the Web docs):
//   1. checkAvailability() — probes if Safari / browser supports Apple Pay & Payment Request.
//   2. setupApplePay(options) — registers merchant identifier, country, and currency.
//   3. setupPaymentRequest(paymentRequest, cb) — configures cart total and line items.
//   4. getPrime(cb) — triggers Apple Pay sheet and returns prime token upon biometric validation.

import { TapPayError } from '../core/errors.js';

export class ApplePayment {
  /**
   * @param {import('../core/client.js').TapPayClient} client
   * @param {object} options
   * @param {string} options.merchantIdentifier  Apple Merchant ID (e.g. "merchant.com.yourdomain")
   * @param {string} [options.countryCode='TW']
   * @param {string} [options.currency='TWD']
   * @param {string|number} [options.totalPrice='1']
   * @param {string} [options.totalLabel='Total']
   * @param {object[]} [options.displayItems=[]] Line items to show in payment sheet
   * @param {string[]} [options.supportedNetworks=['AMEX', 'MASTERCARD', 'VISA', 'JCB']]
   */
  constructor(client, options = {}) {
    this._client = client;
    this._options = {
      countryCode: 'TW',
      currency: 'TWD',
      totalPrice: '1',
      totalLabel: 'Total',
      displayItems: [],
      supportedNetworks: ['AMEX', 'MASTERCARD', 'VISA', 'JCB'],
      ...options,
    };
    this._available = false;
    this._configured = false;
  }

  /** Whether Apple Pay / Payment Request API is available on this device and browser. */
  get available() {
    return this._available;
  }

  /**
   * Initialize SDK and check browser availability for Apple Pay / Payment Request API.
   * @returns {Promise<boolean>}
   */
  async init() {
    const TPDirect = await this._client.ready();
    const o = this._options;

    // Check availability in Safari / WebKit
    this._available = Boolean(
      TPDirect.paymentRequestApi &&
      typeof TPDirect.paymentRequestApi.checkAvailability === 'function' &&
      TPDirect.paymentRequestApi.checkAvailability()
    );

    if (!this._available) {
      this._configured = true;
      return false;
    }

    if (o.merchantIdentifier && typeof TPDirect.paymentRequestApi.setupApplePay === 'function') {
      TPDirect.paymentRequestApi.setupApplePay({
        merchantIdentifier: o.merchantIdentifier,
        countryCode: o.countryCode,
      });
    }

    const requestData = {
      supportedNetworks: o.supportedNetworks,
      supportedMethods: ['apple_pay'],
      displayItems: o.displayItems,
      total: {
        label: o.totalLabel,
        amount: {
          currency: o.currency,
          value: String(o.totalPrice),
        },
      },
    };

    return new Promise((resolve) => {
      TPDirect.paymentRequestApi.setupPaymentRequest(requestData, (result) => {
        this._available = Boolean(result && (result.canUseApplePay || result.canUsePaymentRequest || result === true));
        this._configured = true;
        resolve(this._available);
      });
    });
  }

  /**
   * Trigger the Apple Pay verification sheet and resolve with Prime.
   * @returns {Promise<{prime:string, result:object}>}
   */
  async getPrime() {
    if (!this._configured) await this.init();
    if (!this._available) {
      throw new TapPayError('Apple Pay / Payment Request API is not available on this device/browser', {
        code: TapPayError.CODES.APPLE_PAY_UNAVAILABLE,
      });
    }

    const TPDirect = await this._client.ready();
    return new Promise((resolve, reject) => {
      TPDirect.paymentRequestApi.getPrime((result) => {
        if (!result || (result.status !== 0 && result.status !== '0')) {
          return reject(
            new TapPayError(result?.msg || 'Apple Pay verification failed', {
              status: result?.status,
              code: TapPayError.CODES.GET_PRIME_FAILED,
              cause: result,
            })
          );
        }
        resolve({
          prime: result.prime,
          result: result,
        });
      });
    });
  }
}
