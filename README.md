# tappay-web-module

A **well-structured, zero-dependency, themeable** web module that wraps the [TapPay **TPDirect** SDK](https://docs.tappaysdk.com/) to empower modern web applications with unified access to **all 18 TapPay payment methods** — including Direct Pay credit cards, mobile wallets (Apple Pay, Google Pay, Samsung Pay), regional Asian e-wallets (LINE Pay, JKO Pay, Easy Wallet), Buy-Now-Pay-Later (AFTEE, Pay Later), and bank/logistics rails.

Featuring a high-performance, drop-in **Dark/Light checkout UI** with glassmorphism and smooth micro-animations, or a promise-based **Low-level Hexagonal Adapter API** for completely customized frontend integrations.

> [!IMPORTANT]
> **Minimal PCI Scope:** TapPay never exposes raw card numbers to your hosting page. Credit card fields are rendered inside isolated TapPay-hosted secure iframes. Your server only ever receives a one-time cryptographic **Prime token**, which is securely exchanged for a transaction charge via TapPay's server-to-server **Pay-by-Prime** API.

```
┌─────────────────────────────────┐           prime             ┌──────────────────────────────────┐         pay-by-prime         ┌──────────────────────────────┐
│     Browser (Client Site)       │ ──────────────────────────▶ │   Merchant Backend Server        │ ───────────────────────────▶ │        TapPay Gateway        │
│  [ tappay-web-module adapters ] │                             │  (Secured with Partner Key)      │                              │     (Acquirer / Bank Rail)   │
└─────────────────────────────────┘                             └──────────────────────────────────┘                              └──────────────────────────────┘
```

---

## 📑 Table of Contents

1. [Supported Payment Methods](#supported-payment-methods)
2. [Domain Modeling & Architecture](#domain-modeling--architecture)
3. [Architecture Decision Records (ADRs) & Trade-offs](#architecture-decision-records-adrs--trade-offs)
4. [Installation](#installation)
5. [Prerequisites & Account Configuration](#prerequisites--account-configuration)
6. [Quick Start — Drop-In Checkout UI](#quick-start--drop-in-checkout-ui)
7. [Popup & Modal Workflows](#popup--modal-workflows)
8. [Theming & Aesthetic Customization](#theming--aesthetic-customization)
9. [Low-Level Adapter API (Bring Your Own UI)](#low-level-adapter-api-bring-your-own-ui)
10. [Server-Side Pay-by-Prime Exchanger](#server-side-pay-by-prime-exchanger)
11. [Content Security Policy (CSP) Requirements](#content-security-policy-csp-requirements)
12. [Comprehensive API Reference](#comprehensive-api-reference)
13. [Running Local Demos & Tests](#running-local-demos--tests)
14. [License & Acknowledgments](#license--acknowledgments)

---

## 💳 Supported Payment Methods

`tappay-web-module` implements unified bounded adapters for all 18 payment integration patterns found across the official TapPay ecosystem:

| Category | Payment Rail | SDK Namespace | Adapter Method / Keyword | Supported UI Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Credit & Debit Cards** | Direct Pay (Hosted Fields) | `TPDirect.card` | `.card()` | Inline Fields & Modal |
| | Direct Pay (iframe) | `TPDirect.card` | `.card()` | Inline Fields & Modal |
| | Direct Pay (CCV Prime) | `TPDirect.card` | `.card()` | Inline Fields & Modal |
| **Global Mobile Wallets** | Apple Pay on the Web | `TPDirect.paymentRequestApi` | `.applePay()` | Branded Sheet / Button |
| | Google Pay on the Web | `TPDirect.googlePay` | `.googlePay()` | Official GPay Mount |
| | Samsung Pay on the Web | `TPDirect.samsungPay` | `.samsungPay()` | Official SPay Mount |
| **Taiwan & Regional Wallets**| LINE Pay | `TPDirect.linePay` | `.linePay()` / `'linePay'` | Express Grid & Redirect |
| | JKO Pay (街口支付) | `TPDirect.jkoPay` | `.jkoPay()` / `'jkoPay'` | Express Grid & Redirect |
| | Easy Wallet (悠遊付) | `TPDirect.easyWallet` | `.easyWallet()` / `'easyWallet'` | Express Grid & Redirect |
| | Pi Wallet (Pi 拍錢包) | `TPDirect.piWallet` | `.piWallet()` / `'piWallet'` | Express Grid & Redirect |
| | iPASS MONEY (一卡通) | `TPDirect.iPassMoney` | `.iPassMoney()` / `'iPassMoney'`| Express Grid & Redirect |
| | PXPay Plus (全支付) | `TPDirect.pxPayPlus` | `.pxPayPlus()` / `'pxPayPlus'`| Express Grid & Redirect |
| | Plus Pay (台灣Pay) | `TPDirect.plusPay` | `.plusPay()` / `'plusPay'` | Express Grid & Redirect |
| | GoGo Pay | `TPDirect.gogoPay` | `.gogoPay()` / `'gogoPay'` | Express Grid & Redirect |
| | OP Pay (OPEN 錢包) | `TPDirect.opPay` | `.opPay()` / `'opPay'` | Express Grid & Redirect |
| **BNPL / Financing** | AFTEE 先享後付 | `TPDirect.aftee` | `.aftee()` / `'aftee'` | Express Grid & Redirect |
| | Pay Later (Atome BNPL) | `TPDirect.payLater` | `.payLater()` / `'payLater'` | Express Grid & Redirect |
| **Bank & Logistics** | ATM Virtual Account | `TPDirect.virtualAccount` | `.virtualAccount()` / `'virtualAccount'` | Express Grid & Redirect |
| | Cash on Delivery (超商取貨)| `TPDirect.cashOnDelivery` | `.cashOnDelivery()` / `'cashOnDelivery'`| Express Grid & Redirect |

---

## 🏗️ Domain Modeling & Architecture

Following rigorous **Software Architecture & Domain-Driven Design (DDD)** principles, the codebase employs a **Hexagonal Architecture (Ports & Adapters)** model combined with a **Bounded Strategy Pattern** to prevent vendor SDK complexity from bleeding into consumer applications.

```
                ┌────────────────────────────────────────────────────────┐
                │             Host Application / Consumer UI             │
                └───────────────────────────┬────────────────────────────┘
                                            │ imports
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              src/index.js (Public Barrel)                              │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│      Presentation & Experience (UI)      │          Domain Adapters & Ports            │
│ ┌───────────────────┐  ┌───────────────┐ │ ┌───────────────┐  ┌──────────────────────┐ │
│ │  Checkout Widget  │  │  Theme Engine │ │ │  CardPayment  │  │    GooglePayment     │ │
│ │  (src/ui/checkout)│  │ (checkout.css)│ │ └───────────────┘  └──────────────────────┘ │
│ └─────────┬─────────┘  └───────┬───────┘ │ ┌───────────────┐  ┌──────────────────────┐ │
│           │ uses               │ styles  │ │ │  ApplePayment │  │    SamsungPayment    │ │
│           ▼                    ▼         │ └───────────────┘  └──────────────────────┘ │
│ ┌──────────────────────────────────────┐ │ ┌─────────────────────────────────────────┐ │
│ │        Modal / Inline Container      │ │ │   WalletPayment (Universal Strategy)    │ │
│ └──────────────────────────────────────┘ │ └────────────────────┬────────────────────┘ │
├──────────────────────────────────────────┴──────────────────────┼──────────────────────┤
│                             Core Engine & Lifecycle (src/core/) │ wraps                │
│  ┌────────────────────────┐   ┌──────────────────────────┐      ▼                      │
│  │      TapPayClient      ├──▶│      Loader & Events     │ ┌─────────────────────────┐ │
│  │  (Singleton & Config)  │   │  (Dynamic Script Engine) │ │ TapPay SDK (TPDirect)   │ │
│  └────────────────────────┘   └──────────────────────────┘ └─────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Responsibilities:
- **`src/core/` (Infrastructure & Lifecycle):** Governs configuration credentials (`TapPayClient`), dynamic script ingestion (`loadTapPaySDK`), SRI cryptographic integrity verification, event emitting, and error normalization (`TapPayError`).
- **`src/payments/` (Domain Adapters):** Encapsulates idiosyncratic vendor SDK signatures (`TPDirect.card`, `TPDirect.googlePay`, `TPDirect.paymentRequestApi`, etc.) behind a clean, unified asynchronous contract: `.init()`, `.renderButton()`, and `.getPrime()`.
- **`src/ui/` (Presentation Layer):** A completely decoupled drop-in user interface (`Checkout`) providing high-conversion aesthetics, responsive grids, dark/light theme persistence, and modal overlay orchestration.

---

## ⚖️ Architecture Decision Records (ADRs) & Trade-offs

### ADR-001: Unified Adapter Strategy over Raw Imperative Callbacks
- **Context:** TapPay's legacy JS SDK utilizes disparate imperative patterns: callbacks with `(err, result)` for some wallets, single `(result)` objects for others, and DOM-scraping events for credit cards.
- **Decision:** Wrap every payment rail in dedicated classes (`CardPayment`, `GooglePayment`, `ApplePayment`, `SamsungPayment`, `WalletPayment`) that expose standardized ES6 Promises and EventEmitter subscriptions.
- **Consequences:** 
  - *Gain:* Type-safe error handling, async/await pipelines, and deterministic state testing.
  - *Trade-off:* Adds minor object-wrapping overhead over executing raw window callback invocations.

### ADR-002: Universal Strategy Adapter for Digital Wallets (`WalletPayment`)
- **Context:** 13 regional payment methods (JKO Pay, LINE Pay, Pi Wallet, Easy Wallet, iPASS MONEY, PXPay Plus, Plus Pay, GoGo Pay, OPPay, Pay Later, AFTEE, ATM, COD) share identical lifecycle behaviors: invoke `getPrime(cb)` followed by server-side payment URL redirect.
- **Decision:** Implement a single parameterized bounded adapter (`WalletPayment`) mapped via metadata definitions (`WALLET_METADATA`) rather than maintaining 13 redundant concrete classes.
- **Consequences:** 
  - *Gain:* Massive reduction in bundle size and maintenance surface area while ensuring complete coverage of Taiwanese & Asian payment rails.
  - *Trade-off:* If TapPay introduces divergent initialization parameters for a single specific wallet in the future, that rail must be promoted to a standalone adapter class.

### ADR-003: Vanilla Web Components & CSS Variables vs. Framework Component Libraries
- **Context:** Delivering a stunning, modern checkout UX across heterogeneous consumer stacks (React, Vue, Next.js, Django, WordPress, plain static HTML).
- **Decision:** Implement zero-dependency native JS DOM assembly styled purely through CSS Custom Properties (`--tp-*`), avoiding Tailwind runtime requirements or framework bundlers.
- **Consequences:** 
  - *Gain:* Universal compatibility, instant startup time, zero production dependencies, and dynamic runtime dark/light theme switching.
  - *Trade-off:* UI components cannot consume application-level React/Vue context engines directly without a slim wrapper.

### Architectural Trade-Off Analysis Matrix

| Design Concern | Selected Approach | Alternative Considered | Why We Chose Our Approach | What We Trade Off |
| :--- | :--- | :--- | :--- | :--- |
| **SDK Dependency** | Dynamic asynchronous injection via `loadTapPaySDK` | Hardcoded HTML `<script src="...">` tags | Eliminates global script block delays and ensures SRI compatibility | Requires async setup awaiting (`await client.ready()`) |
| **Error Handling** | Normalization into typed `TapPayError` objects | Passing raw SDK error codes and strings | Provides standardized error classification and intuitive debugging | Hides vendor-specific console verbose logging by default |
| **State Management**| Event-driven observable hooks (`statuschange`) | Polling DOM states or React state coupling | Decouples DOM form rendering from domain payment validation | Requires explicit event listener cleanup in SPAs |

---

## 📦 Installation

### Option A — Package Managers (Vite, Next.js, Webpack)
```bash
npm install github:slashman413/tappay-web-module
```

```javascript
import { createTapPay, Checkout } from 'tappay-web-module';
import 'tappay-web-module/style.css';
```

### Option B — Native ES Modules (CDN / Static HTML)
Reference the ES module directly from your servers or a Git CDN:

```html
<link rel="stylesheet" href="/path/to/tappay-web-module/src/ui/checkout.css" />
<script type="module">
  import { createTapPay, Checkout } from '/path/to/tappay-web-module/src/index.js';
</script>
```
*(Note: You do **not** need to manually add TapPay or Google Pay `<script>` tags; our dynamic loader handles deduped injection automatically).*

---

## 🔑 Prerequisites & Account Configuration

1. Register or sign in to the **[TapPay Portal](https://accounts.tappaysdk.com/login)**.
2. Under your application settings, retrieve your credentials:
   - **App ID** (Number) & **App Key** (String) → *Safe for Frontend Browser & this module*.
   - **Partner Key** & **Merchant ID** → *Strictly Backend only! Never ship to client code*.
3. Test your integration using `sandbox` environment before switching `serverType: 'production'`.

---

## 🚀 Quick Start — Drop-In Checkout UI

The opinionated `Checkout` widget automatically mounts secure credit card inputs, probes device compatibility for Apple Pay & Google Pay, and displays an elegant interactive grid of digital wallets:

```html
<!-- Container for Inline Checkout -->
<div id="payment-widget"></div>
<link rel="stylesheet" href="./node_modules/tappay-web-module/src/ui/checkout.css" />

<script type="module">
  import { createTapPay, Checkout } from 'tappay-web-module';

  // 1. Initialize Client (using TapPay public sandbox credentials)
  const client = createTapPay({
    appId: 159881,
    appKey: 'app_wh614Aq3T392m8Nu2xEP5Nc0Yq6oMfN7ky4y9GkkjZi3lFDkFC9Kb0nyDcWz',
    serverType: 'sandbox', // Use 'production' for live deployments
  });

  // 2. Instantiate and mount the UI Widget
  const checkout = new Checkout(client, {
    theme: 'auto',              // 'light' | 'dark' | 'auto' (OS theme match)
    mode: 'inline',             // 'inline' | 'modal'
    container: '#payment-widget',
    amount: 1280,
    currency: 'TWD',
    title: 'Order #1024 — Master Class Subscription',
    card: true,                 // Enable Direct Pay credit card form
    googlePay: { merchantName: 'Demo Store' },
    applePay: { merchantIdentifier: 'merchant.com.yourdomain' },
    samsungPay: { merchantName: 'Demo Store' },
    // Select specific digital wallets or pass 'all' / true for complete suite:
    wallets: ['jkoPay', 'linePay', 'easyWallet', 'piWallet', 'plusPay', 'iPassMoney', 'pxPayPlus', 'aftee', 'virtualAccount'],
    onPrime: ({ method, prime, card, result, redirect }) => {
      console.log(`✅ Received ${method} Prime Token:`, prime);
      
      // Step A: Send Prime to YOUR Backend Server
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prime, method, amount: 1280 })
      })
      .then(res => res.json())
      .then(data => {
        // Step B (For Wallets): If backend returns a payment_url, execute redirect!
        if (redirect && data.payment_url) {
          redirect(data.payment_url);
        } else {
          alert('Transaction Complete! Order ID: ' + data.order_id);
        }
      });
    },
    onError: (err) => {
      console.error(`❌ Checkout Error [${err.code}]:`, err.message);
    }
  });

  checkout.mount();
</script>
```

---

## 🗔 Popup & Modal Workflows

To present the checkout as an interactive glassmorphic modal overlay (triggered by a checkout button), set `mode: 'modal'` and omit `container`:

```javascript
const checkout = new Checkout(client, {
  mode: 'modal',
  theme: 'dark', // Sleek dark mode overlay
  amount: 990,
  title: 'Complete your purchase',
  card: true,
  wallets: ['linePay', 'jkoPay', 'easyWallet', 'aftee'],
  onPrime: async ({ method, prime, redirect }) => {
    // Process payment...
    checkout.close(); // Programmatically dismiss overlay upon token receipt
  },
  onClose: () => console.log('User dismissed checkout modal.')
});

document.getElementById('open-checkout-btn').addEventListener('click', () => {
  checkout.mount(); // Pops open the overlay
});
```

---

## 🎨 Theming & Aesthetic Customization

The module is engineered with modern visual excellence—featuring smooth hover transformations, validation micro-animations, and harmonious color contrast. 

You can override any design variable in your application CSS via custom tokens:

```css
:root {
  /* Override TapPay Widget Tokens */
  --tp-accent: #3b82f6;            /* Primary Interactive Accent & Button Color */
  --tp-radius: 16px;               /* Modern rounded geometry */
  --tp-font: 'Outfit', 'Inter', system-ui, sans-serif;
}

/* Custom Dark Theme Adaptations */
.tp-checkout[data-tp-theme="dark"] {
  --tp-bg: #0f172a;                /* Deep Slate Backdrop */
  --tp-surface: #1e293b;           /* Card Field Surface */
  --tp-border: #334155;            /* Subtle Border Contrast */
  --tp-field-focus: #60a5fa;       /* Radiant Focus Ring */
}
```

Switch themes dynamically at runtime without rebuilding DOM:
```javascript
checkout.setTheme('dark'); // 'light' | 'dark' | 'auto'
```

---

## 🛠️ Low-Level Adapter API (Bring Your Own UI)

For complete control over form layout, markup, and validation messaging, bypass the `Checkout` widget entirely and interact with domain adapters directly:

### 1. Direct Pay Credit Card
```javascript
const card = client.card({
  fields: {
    number: '#custom-card-num-el',
    expirationDate: '#custom-exp-el',
    ccv: '#custom-ccv-el',
  },
  styles: {
    'input': { 'color': '#111827', 'font-size': '16px' },
    '.valid': { 'color': '#10b981' },
    '.invalid': { 'color': '#ef4444' },
  }
});

// Subscribe to state validation hooks
card.on('statuschange', (status) => {
  document.getElementById('submit-btn').disabled = !status.canGetPrime;
});

await card.mount();

document.getElementById('submit-btn').onclick = async () => {
  try {
    const { prime, card: cardInfo } = await card.getPrime();
    console.log('Got Card Prime:', prime, 'Last 4 digits:', cardInfo.lastfour);
  } catch (err) {
    console.error('Validation failed:', err.message);
  }
};
```

### 2. Google Pay on the Web
```javascript
const gpay = client.googlePay({
  merchantName: 'Acme Corporation',
  price: 2500,
  currency: 'TWD',
  // googleMerchantId: 'YOUR_PRODUCTION_ID' // Required for live environments
});

// Probe browser/device support before mounting button
if (await gpay.init()) {
  await gpay.renderButton({
    el: '#gpay-container',
    color: 'black',  // 'black' | 'white'
    type: 'long',    // 'long' | 'short'
    onPrime: (prime, result) => console.log('GPay Prime Token:', prime),
    onError: (err) => console.error('GPay Error:', err)
  });
}
```

### 3. Apple Pay & Samsung Pay
```javascript
// Apple Pay via W3C Payment Request API
const applePay = client.applePay({
  merchantIdentifier: 'merchant.com.yourdomain',
  totalPrice: '500',
  totalLabel: 'Premium Upgrade'
});
if (await applePay.init()) {
  document.getElementById('apple-btn').onclick = async () => {
    const { prime } = await applePay.getPrime();
  };
}

// Samsung Pay on the Web
const samsungPay = client.samsungPay({ merchantName: 'Acme', amount: 500 });
await samsungPay.renderButton({
  el: '#spay-mount',
  onPrime: (prime) => console.log('Samsung Pay Prime:', prime)
});
```

### 4. Regional Wallets & BNPL (LINE Pay, JKO Pay, AFTEE, etc.)
All regional digital wallets share a unified async adapter interface:

```javascript
// Example: LINE Pay
const linePay = client.linePay('LINE Pay Express');
const { method, prime } = await linePay.getPrime();

// Send prime to server -> backend returns payment_url
// Execute redirect to open wallet app / confirmation page:
await linePay.redirect(serverResponse.payment_url);
```

You can initialize any supported wallet via explicit client helpers or generic `.wallet()` invocation:
- `client.jkoPay()` / `client.linePay()` / `client.piWallet()` / `client.easyWallet()` / `client.iPassMoney()`
- `client.pxPayPlus()` / `client.plusPay()` / `client.gogoPay()` / `client.opPay()` / `client.payLater()`
- `client.aftee()` / `client.virtualAccount()` / `client.cashOnDelivery()`
- Generic invocation: `client.wallet('jkoPay', '街口支付')`

---

## 🖥️ Server-Side Pay-by-Prime Exchanger

Once your frontend captures a **Prime Token**, transfer it to your server via an HTTPS POST request. Your backend executes the financial debit using your confidential **Partner Key**:

```http
POST https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime
Content-Type: application/json
x-api-key: PARTNER_KEY_SECRET

{
  "prime": "2a1a8c3d-....-prime-token",
  "partner_key": "PARTNER_KEY_SECRET",
  "merchant_id": "MERCHANT_ID_REGISTERED",
  "amount": 1280,
  "currency": "TWD",
  "details": "Order #1024",
  "cardholder": {
    "phone_number": "+886912345678",
    "name": "Wayne Wang",
    "email": "wayne@example.com"
  },
  "result_url": {
    "frontend_redirect_url": "https://yoursite.com/checkout/complete",
    "backend_notify_url": "https://api.yoursite.com/webhooks/tappay"
  }
}
```
*(See [`examples/server.example.js`](examples/server.example.js) for an executive Node.js Express server demonstration).*

---

## 🛡️ Content Security Policy (CSP) Requirements

If your enterprise application deploys strict CSP HTTP response headers, safeline these required domain endpoints:

```http
script-src  https://js.tappaysdk.com https://pay.google.com;
frame-src   https://js.tappaysdk.com https://fraud.tappaysdk.com https://pay.google.com;
connect-src https://js.tappaysdk.com https://sandbox.tappaysdk.com https://prod.tappaysdk.com;
```

---

## 📚 Comprehensive API Reference

### `createTapPay(config) → TapPayClient`
Instantiates an idempotent client engine.
- `config.appId`: `number` (Required)
- `config.appKey`: `string` (Required)
- `config.serverType`: `'sandbox' | 'production'` (Defaults to `'sandbox'`)
- `config.sdkVersion`: `string` (Optional override for TPDirect script version, e.g. `'v5.24.0'`)
- `config.sdkIntegrity`: `string` (Optional SRI SHA-256 hash for strict enterprise verification)

### `TapPayClient` (Core Methods)
- `.ready({ googlePay?: boolean }) → Promise<TPDirect>`: Loads SDK scripts once and calls `setupSDK`.
- `.card(options) → CardPayment`
- `.googlePay(options) → GooglePayment`
- `.applePay(options) → ApplePayment`
- `.samsungPay(options) → SamsungPayment`
- `.wallet(walletType, displayName?) → WalletPayment`

### `Checkout(client, options)` (UI Abstraction)
- `.mount() → Promise<this>`: Assembles DOM and renders payment interfaces.
- `.setTheme(theme: 'light'|'dark'|'auto') → void`: Switches CSS custom token palettes.
- `.close() → void`: Dismantles elements and destroys modal overlay if active.

### `TapPayError`
Normalized error structure thrown across all failures:
- `.message`: Human readable error text.
- `.code`: Machine constant (e.g. `'get_prime_failed'`, `'wallet_unavailable'`, `'not_configured'`, `'user_cancelled'`).
- `.status`: Original vendor status integer or string code.
- `.cause`: Raw underlying exception or SDK failure result object.

---

## 🧪 Running Local Demos & Tests

To interactively audit all 18 payment methods using public sandbox test keys:

```bash
# Navigate to repository root
npm run example
```

This launches a development static server on `http://localhost:3000`. Available test suites:
- `http://localhost:3000/checkout.html`: Responsive inline drop-in checkout with instant theme toggle and full wallet grid.
- `http://localhost:3000/modal.html`: Glassmorphic modal popup checkout experience.
- `http://localhost:3000/low-level.html`: Manual low-level adapter wiring for cards, Google Pay, LINE Pay, and JKO Pay.

### Sandbox Test Card Credentials:
- **Card Number:** `4242 4242 4242 4242` (or any standard Visa/Mastercard test sequences)
- **Expiration Date:** Any valid future month/year (e.g. `12 / 28`)
- **CCV Security Code:** Any 3 digits (e.g. `123`)

---

## 📄 License & Acknowledgments

Licensed under the MIT License © [slashman413](https://github.com/slashman413). See [LICENSE](LICENSE) for complete legal text.

*Built with rigorous Software Architecture discipline. Not officially affiliated with or endorsed by TapPay / Cherri Tech, Inc. Always consult the [official TapPay Documentation](https://docs.tappaysdk.com/) when certifying production payment infrastructures.*
