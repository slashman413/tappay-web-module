// Checkout — an opinionated, themeable UI that renders card fields and/or a
// Google Pay button and returns a prime. It is a thin, optional convenience
// layer on top of TapPayClient; if you want full control, use the payment
// classes directly and skip this file.
//
// Render modes:
//   - inline: mounts into a container you pass.
//   - modal:  opens a centered popup overlay (dismissable).
//
// Theming: pass theme 'light' | 'dark' | 'auto'. The root carries
// data-tp-theme so the CSS tokens in checkout.css take over.

import { TapPayError } from '../core/errors.js';

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
   * @param {(res:{method:string,prime:string,card?:object})=>void} [opts.onPrime]
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
      ...opts,
    };
    this._root = null;
    this._overlay = null;
    this._cardPayment = null;
    this._googlePayment = null;
    this._els = {};
  }

  /** Build DOM and mount payment methods. Returns this. */
  async mount() {
    const o = this._opts;
    this._root = buildDom(o, this._els);
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
      els.payBtn.disabled = !this._cardPayment.canGetPrime();
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

function buildDom(o, els) {
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

  if (o.googlePay) {
    els.gpayWrap = el('div');
    els.gpayMount = el('div', 'tp-gpay-mount');
    els.gpayWrap.appendChild(els.gpayMount);
    card.appendChild(els.gpayWrap);
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
  // TapPay status: 0 = valid, 1 = invalid, 2 = empty, 3 = focused-partial.
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
