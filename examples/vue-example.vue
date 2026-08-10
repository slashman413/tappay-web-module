<!--
  Vue 3 example — tappay-web-module
  ---------------------------------
  A <PayButton> component (Composition API) driving the low-level card adapter
  with your own form markup. The module is framework-agnostic vanilla ESM, so
  it works inside any Vue 3 SFC without plugins.

    npm install tappay-web-module
-->
<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { createTapPay } from 'tappay-web-module';

const props = defineProps({
  amount: { type: Number, default: 990 },
  currency: { type: String, default: 'TWD' },
});

const prime = ref(null);
const error = ref(null);
let card = null;

const client = createTapPay({
  appId: 159881, // ← your TapPay App ID (sandbox public demo)
  appKey: 'app_wh614Aq3T392m8Nu2xEP5Nc0Yq6oMfN7ky4y9GkkjZi3lFDkFC9Kb0nyDcWz',
  serverType: 'sandbox',
});

async function setupCard() {
  card = client.card({
    fields: {
      number: '#card-number',
      expirationDate: '#card-exp',
      ccv: '#card-ccv',
    },
    styles: {
      input: { color: '#0f172a', 'font-size': '16px' },
      '.valid': { color: '#10b981' },
      '.invalid': { color: '#ef4444' },
    },
  });
  card.on('statuschange', (s) => {
    document.getElementById('pay-btn').disabled = !s.canGetPrime;
  });
  await card.mount();
}

async function pay() {
  error.value = null;
  try {
    const { prime: token } = await card.getPrime();
    prime.value = token;
    // POST token to your backend → TapPay Pay-by-Prime (Partner Key stays server-side)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prime: token, amount: props.amount, currency: props.currency }),
    }).then((r) => r.json());
    alert(`Order ${res.order_id} completed`);
  } catch (e) {
    error.value = e.message;
  }
}

setupCard();
onBeforeUnmount(() => card?.destroy?.());
</script>

<template>
  <div class="pay-form">
    <label>Card number <input id="card-number" autocomplete="cc-number" /></label>
    <label>Expiry <input id="card-exp" placeholder="MM / YY" autocomplete="cc-exp" /></label>
    <label>CCV <input id="card-ccv" autocomplete="cc-csc" /></label>
    <button id="pay-btn" :disabled="true" @click="pay">
      Pay NT${{ amount.toLocaleString() }}
    </button>
    <p v-if="prime">Prime captured: {{ prime.slice(0, 12) }}…</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.pay-form { display: flex; flex-direction: column; gap: 10px; max-width: 360px; }
.pay-form input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; }
#pay-btn { padding: 12px; border: 0; border-radius: 12px; background: #3b82f6; color: #fff; cursor: pointer; }
#pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #ef4444; }
</style>
