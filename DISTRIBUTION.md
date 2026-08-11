# Distribution Starter Kit — tappay-web-module

Goal: make `tappay-web-module` the de-facto community SDK for TapPay.
A published-but-invisible package does nothing — this kit is the adoption play.

Assets already in the repo: `examples/` (checkout.html, modal.html,
low-level.html vanilla demos + react-example.jsx + vue-example.vue +
node-express-server.mjs), README quickstart, live docs site
https://slashmantools.us/tappay-web-module/.

---

## 1. Show HN blurb (draft)

> **Show HN: One JS module for all 18 TapPay payment rails (Taiwan/APAC)**
>
> TapPay is the dominant payment gateway in Taiwan and one of the biggest in
> APAC — credit cards, Google/Apple/Samsung Pay, LINE Pay, JKO Pay, AFTEE
> BNPL, and more. But the official SDK is a script tag with a promise-based
> API and zero community wrapper. Until now.
>
> `tappay-web-module` is a zero-dependency, themeable wrapper covering all 18
> rails:
>
> - Drop-in dark/light checkout UI (inline or modal) that auto-probes Apple
>   Pay / Google Pay device support and shows the wallets that actually work
>   for your shopper
> - Hexagonal low-level adapters (`card()`, `googlePay()`, `linePay()`, …) if
>   you want your own UI
> - Promise-based API, typed (d.ts), pure ESM, sandbox-first docs
> - npm v12-ready: no install scripts, no deps
>
> ```js
> import { createTapPay, Checkout } from 'tappay-web-module';
> const client = createTapPay({ appId: 159881, appKey: '...', serverType: 'sandbox' });
> new Checkout(client, { container: '#payment-widget', amount: 1280,
>   currency: 'TWD', card: true, wallets: ['linePay', 'jkoPay', 'aftee'] })
>   .mount();
> ```
>
> Docs + ADRs: https://slashmantools.us/tappay-web-module/
> Repo: https://github.com/slashman413/tappay-web-module
> npm: https://www.npmjs.com/package/tappay-web-module
>
> Happy to take feature requests — what's missing for production Taiwan
> checkout?

## 2. Taiwan dev-community posts (drafts)

**PTT Soft_Job / 政黑 → 開發者版 (Traditional Chinese):**
> [情報] TapPay 18 種金流的開源 JS 套件 — tappay-web-module
>
> 台灣/亞太金流 TapPay 一直是前端整合的痛：官方 SDK 只有 script tag、
> 沒有 wrapper、沒有型別。我們把它包成一個零依賴、可換主題的模組，
> 一次涵蓋全部 18 種金流：信用卡 Direct Pay、Google/Apple/Samsung Pay、
> LINE Pay、JKO Pay、AFTEE 先買後付、悠遊付、Pi 錢包等。
>
> - Drop-in Checkout UI（inline/modal，深色淺色自動切換）
> - 低階 adapter API，想自己刻 UI 也行
> - 純 ESM、有 TypeScript 型別、sandbox 直接跑
>
> 專案：https://github.com/slashman413/tappay-web-module
> 文件：https://slashmantools.us/tappay-web-module/
> npm：https://www.npmjs.com/package/tappay-web-module
>
> 歡迎 PR / issue，特別是各金流在 production 的踩雷經驗。

**iT 邦幫忙 (鐵人賽/技術文章):**
> 教學文: 用 tappay-web-module 30 分鐘接完 TapPay 全部金流 —
> 從 Drop-in Checkout 到低階 adapter、Pay-by-Prime 換 token 的 server
> 範例（examples/node-express-server.mjs），全部公開 sandbox 憑證。

**Facebook 台灣開發者社團 / r/Taiwan / Taiwanese Dev Discord:**
> Short version of the PTT post + link. Title: "Open-source TapPay wrapper
> covering all 18 payment rails — looking for production feedback".

## 3. Example integrations (copy-paste)

### 3a. React (see examples/react-example.jsx)

```jsx
import { useEffect, useRef } from 'react';
import { createTapPay, Checkout } from 'tappay-web-module';

export function CheckoutButton({ amount, onSuccess }) {
  const checkoutRef = useRef(null);
  useEffect(() => {
    const client = createTapPay({ appId: 159881, appKey: 'app_...', serverType: 'sandbox' });
    checkoutRef.current = new Checkout(client, {
      mode: 'modal', theme: 'auto', amount, currency: 'TWD', card: true,
      wallets: ['linePay', 'jkoPay', 'easyWallet', 'aftee'],
      onPrime: async ({ prime, method }) => onSuccess(await payByPrime(prime, method)),
    });
    return () => checkoutRef.current?.unmount?.();
  }, [amount]);
  return <button onClick={() => checkoutRef.current?.mount()}>Pay NT${amount}</button>;
}
```

### 3b. Vue 3 (see examples/vue-example.vue)

```vue
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { createTapPay, card } from 'tappay-web-module';
let client;
onMounted(() => {
  client = createTapPay({ appId: 159881, appKey: 'app_...', serverType: 'sandbox' });
});
onBeforeUnmount(() => client?.teardown?.());
async function pay() {
  const { prime, error } = await card(client).getPrime(); // custom form fields
  if (error) return alert(error.message);
  await fetch('/api/pay-by-prime', { method: 'POST', body: JSON.stringify({ prime }) });
}
</script>
```

### 3c. Node + Express server (see examples/node-express-server.mjs)

```js
import express from 'express';
const app = express();
app.use(express.json());

// Partner Key NEVER in the browser — exchange Prime on the server only
const TAPPAY_PARTNER_KEY = process.env.TAPPAY_PARTNER_KEY; // sandbox: partner_...
const API_BASE = 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

app.post('/api/pay-by-prime', async (req, res) => {
  const { prime, method, amount, currency = 'TWD' } = req.body;
  const r = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': TAPPAY_PARTNER_KEY },
    body: JSON.stringify({ prime, partner_key: TAPPAY_PARTNER_KEY, merchant_id: 'YOUR_MERCHANT_ID',
      amount, currency, details: 'Order', cardholder: { phone_number: '+886...', name: 'Test', email: 't@t.tt' } }),
  });
  res.json(await r.json()); // { status: 0, rec_trade_id, ... } or payment_url for wallets
});
app.listen(3000);
```

## 4. Adoption checklist

1. ~~Publish to npm~~ **DONE 2026-08-11: `tappay-web-module@1.1.0` live at
   https://www.npmjs.com/package/tappay-web-module** (published via one-time
   OTP per PUBLISHING.md §2A). Durable path: trusted publishing (OIDC) — do
   PUBLISHING.md §3 setup once, then tag-push releases tokenlessly.
2. Post Show HN (US morning ~7-9am PT) + same-day PTT Soft_Job + iT 邦幫忙.
3. Reply to every comment; collect "production blocker" issues into the repo.
4. Add a `CONTRIBUTING.md` + issue templates next sprint (community needs a
   funnel).
5. Ping TapPay's own dev community / LINE developer groups with the wrapper —
   official acknowledgment would be the unlock.
6. Measure: npm downloads, GitHub stars/issues, docs page hits.
