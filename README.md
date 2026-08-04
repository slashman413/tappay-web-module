# tappay-web-module

A **well-structured, zero-dependency, themeable** web module that wraps the
[TapPay **TPDirect** SDK](https://docs.tappaysdk.com/) so you can add
**Direct Pay (credit card)** and **Google Pay on the Web** to any site in a few
lines — with a drop-in **dark / light** checkout UI, or a low-level API if you
want to build your own.

> TapPay never exposes the raw card number to your page. Card fields render
> inside TapPay-hosted iframes, and your server only ever receives a one-time
> **prime** token, which you exchange for a charge via TapPay's
> **Pay-by-Prime** backend API. This keeps your PCI scope minimal.

```
┌──────────────┐   prime    ┌──────────────┐  pay-by-prime  ┌──────────────┐
│  Browser     │ ─────────▶ │  Your server │ ─────────────▶ │  TapPay      │
│ (this module)│            │ (partner key)│                │  gateway     │
└──────────────┘            └──────────────┘                └──────────────┘
```

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Install](#install)
4. [Prerequisites — TapPay account & keys](#prerequisites--tappay-account--keys)
5. [Quick start (drop-in Checkout UI)](#quick-start-drop-in-checkout-ui)
6. [Popup / modal mode](#popup--modal-mode)
7. [Theming (dark / light)](#theming-dark--light)
8. [Low-level API](#low-level-api)
9. [Google Pay setup & production approval](#google-pay-setup--production-approval)
10. [Completing the payment (server side)](#completing-the-payment-server-side)
11. [Content Security Policy](#content-security-policy)
12. [API reference](#api-reference)
13. [Running the examples](#running-the-examples)
14. [License](#license)

---

## Features

- **Two payment methods, one API** — Direct Pay credit card + Google Pay on the Web.
- **Zero dependencies, no build step required.** Ships as native ES modules.
- **Dynamic SDK loading.** No manual `<script>` tags — the module injects
  `TPDirect` (and Google's `pay.js`) on demand, deduped, with optional SRI.
- **Dark / light / auto theming** via CSS custom properties.
- **Inline or popup (modal) checkout.**
- **Framework-agnostic.** Works with plain HTML, React, Vue, Svelte, etc.
- **Typed.** Ships `types/index.d.ts`.
- **Normalised errors.** Every failure is a `TapPayError` with a stable `.code`.

## Architecture

```
src/
├── index.js                 # public API barrel
├── core/
│   ├── client.js            # TapPayClient — owns setupSDK + credentials
│   ├── loader.js            # dynamic, deduped SDK <script> injection
│   ├── events.js            # tiny event emitter (no deps)
│   └── errors.js            # TapPayError + stable error codes
├── payments/
│   ├── card.js              # Direct Pay (TPDirect.card hosted fields)
│   └── google-pay.js        # Google Pay web (TPDirect.googlePay)
└── ui/
    ├── checkout.js          # optional drop-in themeable widget (inline/modal)
    └── checkout.css         # theme tokens (light/dark/auto)
```

The design separates **transport/config** (`core`), **domain payment methods**
(`payments`), and an **optional presentation layer** (`ui`). You can use the
`payments` classes on their own and render your own markup; the `Checkout`
widget is a convenience only.

## Install

**Option A — npm (bundlers: Vite, webpack, Next.js, etc.)**

```bash
npm install github:slashman413/tappay-web-module
# or, once published: npm install tappay-web-module
```

```js
import { createTapPay, Checkout } from 'tappay-web-module';
import 'tappay-web-module/style.css';
```

**Option B — no bundler, native ES modules**

Copy the `src/` folder into your project (or reference it from a CDN that
serves the repo) and import directly:

```html
<link rel="stylesheet" href="/tappay-web-module/src/ui/checkout.css" />
<script type="module">
  import { createTapPay, Checkout } from '/tappay-web-module/src/index.js';
</script>
```

You do **not** need to add the TapPay `<script>` tag yourself — it is loaded
for you. (If you prefer to pin/host it manually you still can; the loader
detects an already-present `window.TPDirect` and reuses it.)

## Prerequisites — TapPay account & keys

1. Register and log in to the **[TapPay Portal](https://accounts.tappaysdk.com/login)**.
2. From the Portal, obtain your **App ID**, **App Key** (frontend), and
   **Partner Key** (backend only — never ship this to the browser).
3. Use the **Sandbox** keys while developing; switch to **Production** keys
   (`serverType: 'production'`) when you go live.

| Value | Where it lives | Used by |
|-------|----------------|---------|
| `appId` (number) | browser | `createTapPay` |
| `appKey` (string) | browser | `createTapPay` |
| Partner Key | **server only** | Pay-by-Prime call |
| Merchant ID | server | Pay-by-Prime call |

## Quick start (drop-in Checkout UI)

```html
<link rel="stylesheet" href="/tappay-web-module/src/ui/checkout.css" />
<div id="checkout"></div>

<script type="module">
  import { createTapPay, Checkout } from '/tappay-web-module/src/index.js';

  const client = createTapPay({
    appId: 123456,
    appKey: 'app_XXXXXXXXXXXXXXXX',
    serverType: 'sandbox', // 'production' when live
  });

  const checkout = new Checkout(client, {
    theme: 'auto',            // 'light' | 'dark' | 'auto'
    mode: 'inline',           // 'inline' | 'modal'
    container: '#checkout',
    amount: 1280,
    currency: 'TWD',
    title: 'Order #1024',
    card: true,               // show credit-card form
    googlePay: { merchantName: 'My Store' }, // or false to hide
    onPrime: ({ method, prime }) => {
      // Send `prime` to YOUR server, which calls TapPay Pay-by-Prime.
      fetch('/api/pay', { method: 'POST', body: JSON.stringify({ prime, method }) });
    },
    onError: (err) => console.error(err.code, err.message),
  });

  checkout.mount();
</script>
```

## Popup / modal mode

Set `mode: 'modal'` and omit `container` — the widget renders itself in a
centered, dismissable overlay (click the backdrop or the × to close):

```js
const checkout = new Checkout(client, {
  mode: 'modal',
  theme: 'dark',
  amount: 990,
  title: 'Complete your purchase',
  googlePay: { merchantName: 'My Store' },
  onPrime: ({ prime }) => { /* ... */ checkout.close(); },
});
document.querySelector('#buy').onclick = () => checkout.mount();
```

## Theming (dark / light)

Theme is controlled by the `theme` option, which sets `data-tp-theme` on the
widget root. Everything is driven by CSS custom properties, so you can override
any token from your own stylesheet:

```css
.tp-checkout {
  --tp-accent: #ff5a5f;         /* pay button / focus color */
  --tp-radius: 16px;
  --tp-font: "Inter", sans-serif;
}
.tp-checkout[data-tp-theme="dark"] {
  --tp-bg: #101418;
  --tp-surface: #182028;
}
```

Switch at runtime with `checkout.setTheme('dark' | 'light' | 'auto')`.
`auto` follows the user's `prefers-color-scheme`.

## Low-level API

Prefer to build your own markup? Skip the `Checkout` widget and mount the
payment methods into your own elements.

**Direct Pay (credit card):**

```js
const card = client.card({
  fields: {
    number: '#card-number',           // your empty <div>s
    expirationDate: '#card-exp',
    ccv: '#card-ccv',
  },
});
card.on('statuschange', (u) => { payBtn.disabled = !u.canGetPrime; });
await card.mount();

payBtn.onclick = async () => {
  const { prime, card: info } = await card.getPrime();
  // POST prime to your server
};
```

**Google Pay:**

```js
const gpay = client.googlePay({
  merchantName: 'My Store',
  price: 300,
  currency: 'TWD',
  // googleMerchantId: '...',  // required in production
});

if (await gpay.init()) {              // device support probe
  await gpay.renderButton({
    el: '#gpay',
    color: 'black',                   // 'black' | 'white'
    type: 'long',                     // 'long' | 'short'
    onPrime: (prime) => { /* send to server */ },
  });
}
```

Both flows follow TapPay's documented steps: `setupSDK` → (card fields |
`setupGooglePay` + `setupPaymentRequest`) → `getPrime`.

## Google Pay setup & production approval

Google Pay **on the web** needs both TapPay configuration and a **Google Pay
Business Console** approval before it works in production. Summary of the
official flow (see `Google Pay - 申請註冊流程` for annotated screenshots):

1. Go to **<https://pay.google.com/business/console/>**, sign in, and enter
   your **legal business name** and **location**, then continue.
2. **Business profile → Get started**, and complete every business-profile
   field, then **Save**.
3. **Google Pay API → Integrate with your website → Add website.**
4. Enter the **exact domain** you'll serve Google Pay from. It must be
   **HTTPS** and the full label path up to the DNS root
   (`www.example.com`, not `example.com`).
5. For **integration type** choose **Gateway** (TapPay is your gateway/PSP).
6. Upload **screenshots of every step of your buy flow** (item selection,
   pre-purchase, payment-method screen, and the Google Pay payment screen) for
   Google's review.
7. Click **Submit for approval**.
8. Approval typically takes **~1 week**. Questions → TapPay support
   `support@cherri.tech`.

Notes for this module:
- `googleMerchantId` is **optional in sandbox** but **required in production** —
  pass it in the `googlePay` options once you have it.
- Google Pay only appears on supported devices/browsers; `gpay.init()` (and the
  `Checkout` widget) auto-hides the button when the device can't use it.
- **Direct Pay (credit card) requires no Google approval** and works immediately
  in sandbox — a good default while Google review is pending.

## Completing the payment (server side)

The browser only produces a **prime**. Charging happens **server-side** with
your **Partner Key** (keep it secret). Send the prime to your backend, then call
TapPay's Pay-by-Prime API:

```
POST https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime   (sandbox)
POST https://prod.tappaysdk.com/tpc/payment/pay-by-prime       (production)
Headers: { "Content-Type": "application/json", "x-api-key": "<PARTNER_KEY>" }
Body: {
  "prime": "<prime from this module>",
  "partner_key": "<PARTNER_KEY>",
  "merchant_id": "<YOUR_MERCHANT_ID>",
  "amount": 1280,
  "currency": "TWD",
  "details": "Order #1024",
  "cardholder": { "phone_number": "+886900000000", "name": "Buyer", "email": "b@example.com" }
}
```

A minimal Node.js example lives in [`examples/server.example.js`](examples/server.example.js).
See the TapPay **Backend** docs for the full field list and response codes.

## Content Security Policy

If you set a CSP, allow these origins (per TapPay docs). Google Pay needs the
`frame-src` entries; Direct Pay needs `js.tappaysdk.com` for scripts/frames.

```
script-src  https://js.tappaysdk.com https://pay.google.com;
frame-src   https://js.tappaysdk.com https://fraud.tappaysdk.com https://pay.google.com;
connect-src https://js.tappaysdk.com https://sandbox.tappaysdk.com https://prod.tappaysdk.com;
```

## API reference

### `createTapPay(config) → TapPayClient`
`config`: `{ appId: number, appKey: string, serverType?: 'sandbox'|'production',
sdkVersion?: string, sdkIntegrity?: string }`

### `TapPayClient`
- `ready({ googlePay? })` → loads SDK + `setupSDK` once (idempotent).
- `card(options)` → `CardPayment`
- `googlePay(options)` → `GooglePayment`

### `CardPayment`
- `mount()` → mounts hosted iframes.
- `on('statuschange'|'ready', fn)` → returns unsubscribe.
- `canGetPrime()` → `boolean`
- `getPrime()` → `Promise<{ prime, card }>`

### `GooglePayment`
- `init()` → `Promise<boolean>` (device support).
- `setPrice(price, currency?)`
- `renderButton({ el, color?, type?, onPrime, onError? })`
- `getPrime()` → `Promise<{ prime, result }>`

### `Checkout`
- `new Checkout(client, options)` — see [Quick start](#quick-start-drop-in-checkout-ui).
- `mount()`, `setTheme(theme)`, `close()`

### `TapPayError`
`{ message, code, status?, cause? }`. Codes: `sdk_load_failed`,
`not_configured`, `invalid_fields`, `get_prime_failed`,
`google_pay_unavailable`, `user_cancelled`, `unknown`.

## Running the examples

```bash
npm run example   # serves examples/ (needs npx serve)
# then open http://localhost:3000/checkout.html
```

The examples use TapPay's **public sandbox** test keys. Sandbox test cards are
listed in the TapPay docs (e.g. `4242 4242 4242 4242`, any future expiry, any
3-digit CCV).

Example pages:
- `examples/checkout.html` — inline drop-in widget with a theme toggle.
- `examples/modal.html` — popup/modal checkout.
- `examples/low-level.html` — manual wiring of card + Google Pay.

## License

MIT © slashman413. See [LICENSE](LICENSE).

---

*Built by [@slashman413](https://github.com/slashman413). Not affiliated with or
endorsed by TapPay / Cherri Tech; "TapPay" and "Google Pay" are trademarks of
their respective owners. Always verify against the official
[TapPay documentation](https://docs.tappaysdk.com/).*
