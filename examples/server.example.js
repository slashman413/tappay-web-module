// Minimal server-side Pay-by-Prime example (Node.js, no framework).
//
// The browser (this module) produces a one-time `prime`. Your server exchanges
// it for a charge using your SECRET Partner Key. NEVER put the Partner Key in
// front-end code.
//
// Run: PARTNER_KEY=... MERCHANT_ID=... node examples/server.example.js
// Then POST { prime, amount } to http://localhost:8787/api/pay

import http from 'node:http';

const PARTNER_KEY = process.env.PARTNER_KEY;      // from TapPay Portal (secret)
const MERCHANT_ID = process.env.MERCHANT_ID;      // your merchant id
const SANDBOX = process.env.NODE_ENV !== 'production';
const PAY_URL = SANDBOX
  ? 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime'
  : 'https://prod.tappaysdk.com/tpc/payment/pay-by-prime';

async function payByPrime({ prime, amount, details, cardholder }) {
  const res = await fetch(PAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': PARTNER_KEY },
    body: JSON.stringify({
      prime,
      partner_key: PARTNER_KEY,
      merchant_id: MERCHANT_ID,
      amount,
      currency: 'TWD',
      details: details || 'Online order',
      cardholder: cardholder || {
        phone_number: '+886900000000',
        name: 'Buyer',
        email: 'buyer@example.com',
      },
    }),
  });
  return res.json(); // { status: 0, msg: 'Success', rec_trade_id, ... } on success
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/pay') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const { prime, amount, details, cardholder } = JSON.parse(body || '{}');
        const result = await payByPrime({ prime, amount, details, cardholder });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(8787, () => console.log('Pay-by-Prime example on :8787'));
