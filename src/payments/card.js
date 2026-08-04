// Direct Pay — credit-card fields via TPDirect.card.
//
// TapPay renders the card number / expiry / CCV inside cross-origin iframes
// (PCI scope stays with TapPay). This adapter wires those iframes into the
// three <div> mount points you provide, tracks field validity, and returns a
// prime on `getPrime()`. It never sees the raw PAN.

import { TapPayError } from '../core/errors.js';
import { Emitter } from '../core/events.js';

/**
 * @typedef {object} CardFieldMounts
 * @property {string|HTMLElement} number           Mount for the card number field.
 * @property {string|HTMLElement} expirationDate   Mount for the expiry field.
 * @property {string|HTMLElement} ccv              Mount for the CCV field.
 */

/**
 * @typedef {object} CardOptions
 * @property {CardFieldMounts} fields
 * @property {object} [styles]     Per-field CSS applied *inside* the iframes.
 * @property {boolean} [isMaskCreditCardNumber]
 * @property {{beginIndex:number,endIndex:number}} [maskRange]
 * @property {object} [placeholders] { number, expirationDate, ccv }
 */

// Field styling that reads well on both light and dark hosts. TapPay only
// accepts a flat CSS map per state, injected into its iframe.
const DEFAULT_STYLES = {
  'input': {
    color: 'var(--tp-field-color, #1a1a2e)',
    'font-size': '16px',
    'font-family': 'inherit',
  },
  'input.ccv': { 'font-size': '16px' },
  ':focus': { color: 'var(--tp-field-focus, #0b5cff)' },
  '.valid': { color: 'var(--tp-field-valid, #16a34a)' },
  '.invalid': { color: 'var(--tp-field-invalid, #dc2626)' },
};

export class CardPayment {
  /**
   * @param {import('../core/client.js').TapPayClient} client
   * @param {CardOptions} options
   */
  constructor(client, options) {
    this._client = client;
    this._options = options || {};
    this._emitter = new Emitter();
    this._status = null; // last field-status snapshot from TapPay
    this._setup = false;
  }

  /** Subscribe to 'statuschange' | 'ready'. Returns unsubscribe fn. */
  on(event, handler) {
    return this._emitter.on(event, handler);
  }

  /** Mount the TapPay card iframes into the configured elements. */
  async mount() {
    if (this._setup) return this;
    const { fields } = this._options;
    if (!fields || !fields.number || !fields.expirationDate || !fields.ccv) {
      throw new TapPayError('card() requires fields.number, .expirationDate and .ccv', {
        code: TapPayError.CODES.INVALID_FIELDS,
      });
    }
    const TPDirect = await this._client.ready();
    const ph = this._options.placeholders || {};

    TPDirect.card.setup({
      fields: {
        number: { element: resolveEl(fields.number), placeholder: ph.number ?? '**** **** **** ****' },
        expirationDate: { element: resolveEl(fields.expirationDate), placeholder: ph.expirationDate ?? 'MM / YY' },
        ccv: { element: resolveEl(fields.ccv), placeholder: ph.ccv ?? 'CCV' },
      },
      styles: this._options.styles || DEFAULT_STYLES,
      isMaskCreditCardNumber: this._options.isMaskCreditCardNumber ?? true,
      maskCreditCardNumberRange: this._options.maskRange || { beginIndex: 6, endIndex: 11 },
    });

    TPDirect.card.onUpdate((update) => {
      this._status = update;
      this._emitter.emit('statuschange', update);
    });

    this._setup = true;
    this._emitter.emit('ready', this);
    return this;
  }

  /** True when all three fields are valid and a prime can be requested. */
  canGetPrime() {
    return Boolean(this._status?.canGetPrime);
  }

  /** Raw TapPay field-status snapshot (number/expiry/ccv codes). */
  getStatus() {
    return this._status;
  }

  /**
   * Request a prime for the entered card.
   * @returns {Promise<{prime:string, card:object}>}
   */
  async getPrime() {
    const TPDirect = await this._client.ready();
    if (!this._setup) await this.mount();
    if (!this.canGetPrime()) {
      throw new TapPayError('Card fields are not yet valid', {
        code: TapPayError.CODES.INVALID_FIELDS,
        cause: this._status,
      });
    }
    return new Promise((resolve, reject) => {
      TPDirect.card.getPrime((result) => {
        if (result.status !== 0) return reject(TapPayError.fromPrimeResult(result));
        resolve({ prime: result.card.prime, card: result.card });
      });
    });
  }
}

function resolveEl(target) {
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    if (!el) throw new TapPayError(`Card field mount not found: ${target}`, {
      code: TapPayError.CODES.INVALID_FIELDS,
    });
    return el;
  }
  return target;
}

export const _internal = { DEFAULT_STYLES };
