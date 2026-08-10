/**
 * Node.js + Express server example — tappay-web-module
 * ----------------------------------------------------
 * The frontend captures a one-time `prime` token; this server exchanges it for
 * a real charge via TapPay's Pay-by-Prime API. The Partner Key NEVER leaves
 * the server.
 *
 *   npm install express
 *   node examples/node-express-server.mjs
 *
 * Endpoints:
 *   POST /api/checkout   { prime, method, amount?, currency? }
 *     → card rails:  { order_id, ... } from TapPay
 *     → wallet rails: { payment_url } — frontend redirects the browser
 */
import express from 'express';
import crypto from 'node:crypto';

const app = express();
app.use(express.json());

// ⚠️ From the TapPay Portal (Partner settings) — server-side only.
const PARTNER_KEY = process.env.TAPPAY_PARTNER_KEY || 'partner_XXXXXXXXXXXXXXXXXXXX';
const MERCHANT_ID = process.env.TAPPAY_MERCHANT_ID || 'MERCHANT_ID';
const TAPPAY_API = process.env.TAPPAY_API || 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

const PORT = process.env.PORT || 3001;

app.post('/api/checkout', async (req, res) => {
  const { prime, method, amount = 1280, currency = 'TWD' } = req.body ?? {};
  if (!prime) return res.status(400).json({ error: 'missing prime' });

  try {
    const payload = {
      prime,
      partner_key: PARTNER_KEY,
      merchant_id: MERCHANT_ID,
      amount,
      currency,
      details: `Order #${crypto.randomInt(10000, 99999)}`,
      cardholder: {
        phone_number: req.body?.cardholder?.phone_number ?? '+886912345678',
        name: req.body?.cardholder?.name ?? 'Tappay Web Module Demo',
        email: req.body?.cardholder?.email ?? 'demo@example.com',
      },
      result_url: {
        frontend_redirect_url: `${req.protocol}://${req.get('host')}/checkout/complete`,
        backend_notify_url: `${req.protocol}://${req.get('host')}/webhooks/tappay`,
      },
    };

    const tp = await fetch(TAPPAY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PARTNER_KEY,
      },
      body: JSON.stringify(payload),
    }).then((r) => r.json());

    // Card rails → tp.status === 0 with tp.order_id / tp.rec_trade_id
    // Wallet rails → tp.payment_url (frontend calls redirect(payment_url))
    if (tp.status !== 0 && !tp.payment_url) {
      return res.status(502).json({ error: 'tappay declined', tp });
    }
    res.json({ order_id: tp.order_id ?? tp.rec_trade_id, payment_url: tp.payment_url, method });
  } catch (err) {
    console.error('[tappay] pay-by-prime failed:', err);
    res.status(500).json({ error: 'payment failed' });
  }
});

// Optional: TapPay async notification webhook (backend_notify_url above)
app.post('/webhooks/tappay', (req, res) => {
  console.log('[tappay webhook]', req.body);
  res.sendStatus(200);
});

app.get('/checkout/complete', (_req, res) => {
  res.send('<h1>Payment complete ✅</h1><p>Back from the payment provider.</p>');
});

app.listen(PORT, () => console.log(`tappay-web-module demo server on http://localhost:${PORT}`));
