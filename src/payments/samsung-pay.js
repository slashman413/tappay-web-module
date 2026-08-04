// Samsung Pay on the Web adapter via TPDirect.samsungPay.
//
// Flow (per TapPay Samsung Pay on the Web docs):
//   1. setup({ country_code: 'TW' }) — registers localization.
//   2. setupPaymentRequest(paymentRequest) — configures accepted cards, merchant name, amount.
//   3. setupSamsungPayButton(selector, options) — mounts verified Samsung Pay button.
//   4. getPrime(cb) — initiates Samsung Pay auth flow and returns prime token.

import { TapPayError } from '../core/errors.js';

export class SamsungPayment {
  /**
   * @param {import('../core/client.js').TapPayClient} client
   * @param {object} options
   * @param {string} options.merchantName      Merchant business name displayed in Samsung Pay sheet
   * @param {string} [options.countryCode='TW'] Localization code (e.g. 'TW', 'KR', 'US')
   * @param {string} [options.currency='TWD']
   * @param {string|number} [options.amount='1']
   * @param {string[]} [options.supportedNetworks=['VISA', 'MASTERCARD', 'AMEX', 'JCB']]
   */
  constructor(client, options = {}) {
    if (!options || !options.merchantName) {
      throw new TapPayError('samsungPay() requires a merchantName', {
        code: TapPayError.CODES.NOT_CONFIGURED,
      });
    }
    this._client = client;
    this._options = {
      countryCode: 'TW',
      currency: 'TWD',
      amount: '1',
      supportedNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'JCB'],
      ...options,
    };
    this._configured = false;
  }

  /**
   * Configure Samsung Pay SDK parameters and transaction request.
   * @returns {Promise<void>}
   */
  async init() {
    const TPDirect = await this._client.ready();
    const o = this._options;

    if (!TPDirect.samsungPay) {
      throw new TapPayError('Samsung Pay SDK namespace not available in loaded TPDirect SDK', {
        code: TapPayError.CODES.SAMSUNG_PAY_UNAVAILABLE,
      });
    }

    TPDirect.samsungPay.setup({
      country_code: o.countryCode,
    });

    const request = {
      supportedNetworks: o.supportedNetworks,
      merchantName: o.merchantName,
      amount: String(o.amount),
      currency: o.currency,
    };

    TPDirect.samsungPay.setupPaymentRequest(request);
    this._configured = true;
  }

  /**
   * Mount official Samsung Pay branded button into a DOM container and bind getPrime callback.
   * @param {object} cfg
   * @param {string|HTMLElement} cfg.el
   * @param {(prime:string, result:object)=>void} cfg.onPrime
   * @param {(err:TapPayError)=>void} [cfg.onError]
   */
  async renderButton(cfg) {
    if (!this._configured) await this.init();
    const TPDirect = await this._client.ready();

    const selector = typeof cfg.el === 'string' ? cfg.el : `#${cfg.el.id || 'samsung-pay-mount'}`;
    if (typeof cfg.el !== 'string' && !cfg.el.id) {
      cfg.el.id = `spay-${Math.random().toString(36).substr(2, 6)}`;
    }

    try {
      TPDirect.samsungPay.setupSamsungPayButton(selector, {
        onClick: async () => {
          try {
            const { prime, result } = await this.getPrime();
            cfg.onPrime(prime, result);
          } catch (err) {
            const error = err instanceof TapPayError ? err : new TapPayError(String(err), { cause: err });
            cfg.onError?.(error);
          }
        }
      });
    } catch (err) {
      const error = new TapPayError(`Failed to setup Samsung Pay button: ${err}`, {
        code: TapPayError.CODES.SAMSUNG_PAY_UNAVAILABLE,
        cause: err
      });
      cfg.onError?.(error);
      throw error;
    }
  }

  /**
   * Programmatically trigger Samsung Pay verification sheet to retrieve a prime.
   * @returns {Promise<{prime:string, result:object}>}
   */
  async getPrime() {
    if (!this._configured) await this.init();
    const TPDirect = await this._client.ready();

    return new Promise((resolve, reject) => {
      TPDirect.samsungPay.getPrime((result) => {
        if (!result || (result.status !== 0 && result.status !== '0')) {
          return reject(
            new TapPayError(result?.msg || 'Samsung Pay verification failed or cancelled', {
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
