// Checkout — an opinionated, themeable UI that renders card fields, digital wallets,
// and express checkout buttons (Google Pay, Apple Pay, Samsung Pay, JKO Pay, Line Pay, etc.)
// and returns a prime token. It is a convenient abstraction over TapPayClient.

import { TapPayError } from '../core/errors.js';
import { WALLET_METADATA } from '../payments/wallet.js';

const CURRENCY_SYMBOLS = { TWD: 'NT$', USD: '$', JPY: '¥', HKD: 'HK$', EUR: '€', GBP: '£' };

export class Checkout {
  /**
   * @param {import('../core/client.js').TapPayClient} client
   * @param {object} opts
   * @param {'light'|'dark'|'auto'} [opts.theme='auto']
   * @param {'inline'|'modal'} [opts.mode='inline']
   * @param {string|HTMLElement} [opts.container]  Required for inline mode.
   * @param {number} [opts.amount]     Amount to display / charge.
   * @param {string} [opts.currency='TWD']
   * @param {string} [opts.title='Payment']
   * @param {string} [opts.payButtonText]  Defaults to "Pay {amount}".
   * @param {boolean} [opts.card=true]     Show Direct Pay card form.
   * @param {object|false} [opts.googlePay]  Google Pay options, or false to hide.
   * @param {object|false} [opts.applePay]   Apple Pay options, or false to hide.
   * @param {object|false} [opts.samsungPay] Samsung Pay options, or false to hide.
   * @param {string[]|'all'|boolean} [opts.wallets] Array of wallet keys (e.g. ['linePay', 'jkoPay', 'aftee']), 'all', or false.
   * @param {(res:{method:string,prime:string,card?:object,result?:object,redirect?:(url:string)=>void})=>void} [opts.onPrime]
   * @param {(err:TapPayError)=>void} [opts.onError]
   * @param {()=>void} [opts.onClose]
   */
  constructor(client, opts = {}) {
    this._client = client;
    this._opts = {
      theme: 'auto',
      mode: 'inline',
      currency: 'TWD',
      title: 'Payment',
      card: true,
      googlePay: false,
      applePay: false,
      samsungPay: false,
      wallets: false,
      ...opts,
    };
    this._root = null;
    this._overlay = null;
    this._cardPayment = null;
    this._googlePayment = null;
    this._applePayment = null;
    this._samsungPayment = null;
    this._els = {};
  }

  /** Build DOM and mount payment methods. Returns this. */
  async mount() {
    const o = this._opts;
    const walletKeys = o.wallets === true || o.wallets === 'all'
      ? Object.keys(WALLET_METADATA)
      : (Array.isArray(o.wallets) ? o.wallets : []);

    this._root = buildDom(o, walletKeys, this._els);
    this._root.setAttribute('data-tp-theme', o.theme);

    if (o.mode === 'modal') {
      this._overlay = document.createElement('div');
      this._overlay.className = 'tp-modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'tp-modal';
      const close = document.createElement('button');
      close.className = 'tp-modal-close';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '×';
      close.addEventListener('click', () => this.close());
      modal.appendChild(this._root);
      modal.appendChild(close);
      this._overlay.appendChild(modal);
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) this.close();
      });
      document.body.appendChild(this._overlay);
    } else {
      const container = resolveContainer(o.container);
      container.appendChild(this._root);
    }

    if (o.card) await this._mountCard();
    if (o.googlePay) await this._mountGooglePay();
    if (o.applePay) await this._mountApplePay();
    if (o.samsungPay) await this._mountSamsungPay();
    if (walletKeys.length > 0) this._mountWallets(walletKeys);
    return this;
  }

  async _mountCard() {
    const els = this._els;
    this._cardPayment = this._client.card({
      fields: { number: els.number, expirationDate: els.expiry, ccv: els.ccv },
    });
    this._cardPayment.on('statuschange', (u) => {
      toggleField(els.number, u.status.number);
      toggleField(els.expiry, u.status.expiry);
      toggleField(els.ccv, u.status.ccv);
      if (els.payBtn) els.payBtn.disabled = !u.canGetPrime;
    });
    await this._cardPayment.mount();
    els.payBtn.disabled = true;
    els.payBtn.addEventListener('click', () => this._payWithCard());
  }

  async _payWithCard() {
    this._setError('');
    const els = this._els;
    els.payBtn.disabled = true;
    try {
      const { prime, card } = await this._cardPayment.getPrime();
      this._opts.onPrime?.({ method: 'card', prime, card });
    } catch (err) {
      const e = err instanceof TapPayError ? err : new TapPayError(String(err));
      this._setError(e.message);
      this._opts.onError?.(e);
    } finally {
      if (this._cardPayment) {
        els.payBtn.disabled = !this._cardPayment.canGetPrime();
      }
    }
  }

  async _mountGooglePay() {
    const o = this._opts;
    this._googlePayment = this._client.googlePay({
      price: o.amount,
      currency: o.currency,
      ...o.googlePay,
    });
    try {
      const ok = await this._googlePayment.init();
      if (!ok) {
        this._els.gpayWrap?.classList.add('tp-hidden');
        return;
      }
      await this._googlePayment.renderButton({
        el: this._els.gpayMount,
        color: o.theme === 'dark' ? 'white' : 'black',
        type: 'long',
        onPrime: (prime, result) => this._opts.onPrime?.({ method: 'google-pay', prime, result }),
        onError: (err) => {
          this._setError(err.message);
          this._opts.onError?.(err);
        },
      });
    } catch (err) {
      this._els.gpayWrap?.classList.add('tp-hidden');
    }
  }

  async _mountApplePay() {
    const o = this._opts;
    this._applePayment = this._client.applePay({
      totalPrice: o.amount || '1',
      currency: o.currency,
      totalLabel: o.title || 'Total',
      ...o.applePay,
    });
    try {
      const available = await this._applePayment.init();
      if (!available) {
        this._els.applePayWrap?.classList.add('tp-hidden');
        return;
      }
      if (this._els.applePayBtn) {
        this._els.applePayBtn.addEventListener('click', async () => {
          this._setError('');
          try {
            const { prime, result } = await this._applePayment.getPrime();
            this._opts.onPrime?.({ method: 'apple-pay', prime, result });
          } catch (err) {
            const e = err instanceof TapPayError ? err : new TapPayError(String(err));
            this._setError(e.message);
            this._opts.onError?.(e);
          }
        });
      }
    } catch (err) {
      this._els.applePayWrap?.classList.add('tp-hidden');
    }
  }

  async _mountSamsungPay() {
    const o = this._opts;
    this._samsungPayment = this._client.samsungPay({
      amount: o.amount || '1',
      currency: o.currency,
      merchantName: o.title || 'Merchant',
      ...o.samsungPay,
    });
    try {
      await this._samsungPayment.renderButton({
        el: this._els.spayMount,
        onPrime: (prime, result) => this._opts.onPrime?.({ method: 'samsung-pay', prime, result }),
        onError: (err) => {
          this._setError(err.message);
          this._opts.onError?.(err);
        },
      });
    } catch (err) {
      this._els.spayWrap?.classList.add('tp-hidden');
    }
  }

  _mountWallets(walletKeys) {
    for (const key of walletKeys) {
      const btn = this._els.walletBtns?.[key];
      if (!btn) continue;
      const wallet = this._client.wallet(key);
      btn.addEventListener('click', async () => {
        this._setError('');
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '⌛ Connecting...';
        try {
          const { method, prime, result } = await wallet.getPrime();
          this._opts.onPrime?.({
            method: method,
            prime: prime,
            result: result,
            redirect: (paymentUrl) => wallet.redirect(paymentUrl)
          });
        } catch (err) {
          const e = err instanceof TapPayError ? err : new TapPayError(String(err));
          this._setError(e.message);
          this._opts.onError?.(e);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      });
    }
  }

  _setError(msg) {
    if (this._els.error) this._els.error.textContent = msg || '';
  }

  /** Switch theme at runtime. */
  setTheme(theme) {
    this._opts.theme = theme;
    this._root?.setAttribute('data-tp-theme', theme);
  }

  /** Remove the widget (and overlay in modal mode). */
  close() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    } else {
      this._root?.remove();
    }
    this._opts.onClose?.();
  }
}

// ---- DOM building helpers ----

function buildDom(o, walletKeys, els) {
  const root = document.createElement('div');
  root.className = 'tp-checkout';

  const card = el('div', 'tp-card');
  root.appendChild(card);

  const header = el('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'baseline';
  const title = el('h3', 'tp-modal-title');
  title.textContent = o.title;
  header.appendChild(title);
  if (o.amount != null) {
    const amt = el('div', 'tp-amount');
    amt.innerHTML = `${symbol(o.currency)}${formatAmount(o.amount)} <small>${o.currency}</small>`;
    header.appendChild(amt);
  }
  card.appendChild(header);

  const hasExpress = o.googlePay || o.applePay || o.samsungPay || walletKeys.length > 0;
  if (hasExpress) {
    const expressSection = el('div', 'tp-express-section');
    
    if (o.applePay) {
      els.applePayWrap = el('div');
      els.applePayBtn = el('button', 'tp-apple-pay-btn');
      els.applePayBtn.type = 'button';
      els.applePayBtn.innerHTML = ' Apple Pay';
      els.applePayWrap.appendChild(els.applePayBtn);
      expressSection.appendChild(els.applePayWrap);
    }

    if (o.googlePay) {
      els.gpayWrap = el('div');
      els.gpayMount = el('div', 'tp-gpay-mount');
      els.gpayWrap.appendChild(els.gpayMount);
      expressSection.appendChild(els.gpayWrap);
    }

    if (o.samsungPay) {
      els.spayWrap = el('div');
      els.spayMount = el('div', 'tp-spay-mount');
      els.spayWrap.appendChild(els.spayMount);
      expressSection.appendChild(els.spayWrap);
    }

    if (walletKeys.length > 0) {
      const grid = el('div', 'tp-wallets-grid');
      els.walletBtns = {};
      for (const key of walletKeys) {
        const meta = WALLET_METADATA[key] || { name: key, title: key, icon: '💳' };
        const btn = el('button', 'tp-wallet-btn');
        btn.type = 'button';
        btn.innerHTML = `<span class="tp-wallet-icon">${meta.icon}</span> <span class="tp-wallet-label">${meta.title}</span>`;
        grid.appendChild(btn);
        els.walletBtns[key] = btn;
      }
      expressSection.appendChild(grid);
    }

    card.appendChild(expressSection);

    if (o.card) {
      const div = el('div', 'tp-divider');
      div.textContent = 'or pay by card';
      card.appendChild(div);
    }
  }

  if (o.card) {
    card.appendChild(labelled('Card number', (els.number = el('div', 'tp-field'))));
    const row = el('div', 'tp-row');
    row.appendChild(labelled('Expiry', (els.expiry = el('div', 'tp-field'))));
    row.appendChild(labelled('CCV', (els.ccv = el('div', 'tp-field'))));
    card.appendChild(row);
  }

  els.error = el('p', 'tp-error');
  card.appendChild(els.error);

  if (o.card) {
    els.payBtn = el('button', 'tp-pay-btn');
    els.payBtn.type = 'button';
    els.payBtn.textContent =
      o.payButtonText || (o.amount != null ? `Pay ${symbol(o.currency)}${formatAmount(o.amount)}` : 'Pay');
    card.appendChild(els.payBtn);
  }

  return root;
}

function labelled(text, field) {
  const wrap = el('div');
  const label = el('label', 'tp-label');
  label.textContent = text;
  wrap.appendChild(label);
  wrap.appendChild(field);
  return wrap;
}

function toggleField(fieldEl, statusCode) {
  if (!fieldEl) return;
  fieldEl.classList.toggle('tp-field--invalid', statusCode === 1);
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function resolveContainer(container) {
  if (!container) {
    throw new TapPayError('inline mode requires opts.container', {
      code: TapPayError.CODES.NOT_CONFIGURED,
    });
  }
  const node = typeof container === 'string' ? document.querySelector(container) : container;
  if (!node) throw new TapPayError(`Container not found: ${container}`, {
    code: TapPayError.CODES.NOT_CONFIGURED,
  });
  return node;
}

function symbol(currency) {
  return CURRENCY_SYMBOLS[currency] || '';
}
function formatAmount(amount) {
  return Number(amount).toLocaleString();
}
