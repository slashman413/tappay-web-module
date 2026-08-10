/**
 * React example — tappay-web-module
 * ---------------------------------
 * A <CheckoutButton /> component using the drop-in modal Checkout widget.
 * Works with any React 16.8+ app (Vite / Next.js / CRA) — the widget is
 * framework-agnostic, so no special bindings are needed.
 *
 *   npm install tappay-web-module
 *   import 'tappay-web-module/style.css';   // once, in your entry point
 */
import { useEffect, useRef } from 'react';
import { createTapPay, Checkout } from 'tappay-web-module';

export default function CheckoutButton({ amount = 1280, title = 'Complete your purchase' }) {
  const checkoutRef = useRef(null);

  useEffect(() => {
    const client = createTapPay({
      appId: 159881, // ← your TapPay App ID (sandbox public demo)
      appKey: 'app_wh614Aq3T392m8Nu2xEP5Nc0Yq6oMfN7ky4y9GkkjZi3lFDkFC9Kb0nyDcWz',
      serverType: 'sandbox', // 'production' in live env
    });

    checkoutRef.current = new Checkout(client, {
      mode: 'modal',
      theme: 'auto',
      amount,
      title,
      card: true,
      googlePay: { merchantName: 'My Store' },
      wallets: ['linePay', 'jkoPay', 'easyWallet', 'aftee'],
      onPrime: async ({ method, prime, redirect }) => {
        // 1) Send the one-time prime to YOUR backend (never store it client-side)
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prime, method, amount }),
        }).then((r) => r.json());

        // 2) Wallet rails: backend returns a payment_url → redirect
        if (redirect && res.payment_url) {
          redirect(res.payment_url);
        } else {
          alert(`Transaction complete! Order: ${res.order_id}`);
        }
      },
      onError: (err) => console.error(`[tappay] ${err.code}:`, err.message),
      onClose: () => console.log('[tappay] modal dismissed'),
    });

    return () => checkoutRef.current?.close(); // cleanup on unmount
  }, [amount, title]);

  return (
    <button
      onClick={() => checkoutRef.current?.mount()}
      style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
    >
      Pay NT${amount.toLocaleString()}
    </button>
  );
}
