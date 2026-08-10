# Examples

All examples use **public TapPay sandbox credentials** — swap in your own App
ID / App Key from the [TapPay Portal](https://accounts.tappaysdk.com/login)
for real environments. The **Partner Key** belongs on your server only.

| File | Stack | Shows |
| :--- | :--- | :--- |
| [`checkout.html`](checkout.html) | Vanilla HTML/JS | Drop-in inline `Checkout` widget with full wallet grid + theme toggle |
| [`modal.html`](modal.html) | Vanilla HTML/JS | Glassmorphic modal checkout triggered by a button |
| [`low-level.html`](low-level.html) | Vanilla HTML/JS | Low-level adapters: card, Google Pay, LINE Pay, JKO Pay |
| [`react-example.jsx`](react-example.jsx) | React 16.8+ | `<CheckoutButton />` component using the modal widget |
| [`vue-example.vue`](vue-example.vue) | Vue 3 (Composition API) | Custom form driving the low-level `card()` adapter |
| [`node-express-server.mjs`](node-express-server.mjs) | Node + Express | Server-side Pay-by-Prime exchanger + TapPay webhook |

Run the vanilla demos from the repo root:

```bash
npm run example   # serves examples/ at http://localhost:3000
```

Sandbox test card: `4242 4242 4242 4242` · any future expiry · any 3-digit CCV.
