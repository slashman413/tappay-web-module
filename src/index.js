// Public API for tappay-web-module.
//
//   import { createTapPay, Checkout } from 'tappay-web-module';
//   import 'tappay-web-module/style.css'; // for the Checkout UI
//
// Low-level (bring your own UI):  createTapPay().card() / .googlePay()
// High-level (drop-in UI):        new Checkout(client, {...})

export { TapPayClient, createTapPay } from './core/client.js';
export { CardPayment } from './payments/card.js';
export { GooglePayment } from './payments/google-pay.js';
export { ApplePayment } from './payments/apple-pay.js';
export { SamsungPayment } from './payments/samsung-pay.js';
export { WalletPayment, WALLET_METADATA } from './payments/wallet.js';
export { Checkout } from './ui/checkout.js';
export { TapPayError } from './core/errors.js';
export { loadTapPaySDK } from './core/loader.js';

export const VERSION = '1.0.0';
