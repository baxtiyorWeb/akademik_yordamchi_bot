#!/usr/bin/env node
/**
 * TSPay Webhook Tester
 * 
 * Computes valid HMAC signatures and sends test webhook payloads to your endpoint.
 * Usage: node test-webhook.js [method] [webhook-url]
 * 
 * Methods:
 *   checkPerform      - Verify order exists and amount matches
 *   createTransaction - Create transaction record (idempotent)
 *   performTransaction - Mark payment as completed
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'ts_pay_webhook_secret_556677';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';

function computeSignature(orderId, amount, timestamp) {
  const amountStr = String(amount ?? '').includes('.') ? String(amount) : String(amount) + '.0';
  const message = `${orderId}:${amountStr}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(message).digest('hex');
  return 'sha256=' + hmac;
}

async function sendWebhook(method, params) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = computeSignature(params.order_id || '', params.amount || '', timestamp);

  const body = { method, params };

  console.log(`\n📤 Sending ${method} webhook...`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Signature: ${signature}`);
  console.log(`   Payload:`, JSON.stringify(params, null, 2));

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(`\n✅ Response (${res.status}):`, JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error(`\n❌ Error:`, err.message);
    return null;
  }
}

async function runTests() {
  const orderId = 12345;
  const amount = 50000;
  const chequeId = crypto.randomUUID();

  console.log('🧪 TSPay Webhook Test Suite');
  console.log('============================');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Secret: ${WEBHOOK_SECRET}`);

  // Test 1: checkPerform
  console.log('\n\n--- Test 1: checkPerform ---');
  await sendWebhook('checkPerform', {
    cheque_id: chequeId,
    order_id: orderId,
    amount: amount,
    merchant_id: 'mer_abc123',
  });

  // Test 2: createTransaction
  console.log('\n\n--- Test 2: createTransaction ---');
  await sendWebhook('createTransaction', {
    cheque_id: chequeId,
    order_id: orderId,
    amount: amount,
    merchant_id: 'mer_abc123',
  });

  // Test 3: performTransaction
  console.log('\n\n--- Test 3: performTransaction ---');
  await sendWebhook('performTransaction', {
    cheque_id: chequeId,
    order_id: orderId,
    amount: amount,
    merchant_id: 'mer_abc123',
    transaction_id: 42,
    additional: { product_id: 99 },
  });

  console.log('\n\n✨ Test suite completed!');
}

// Run or show examples
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('\n📋 Example Curl Commands\n');
  
  const timestamp = Math.floor(Date.now() / 1000);
  const sig1 = computeSignature(12345, 50000, timestamp);
  
  console.log('1️⃣  checkPerform:');
  console.log(`
curl -X POST '${WEBHOOK_URL}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Timestamp: ${timestamp}' \\
  -H 'X-Signature: ${sig1}' \\
  -d '{
    "method": "checkPerform",
    "params": {
      "cheque_id": "550e8400-e29b-41d4-a716-446655440000",
      "order_id": 12345,
      "amount": 50000,
      "merchant_id": "mer_abc123"
    }
  }'
  `);

  console.log('\n2️⃣  createTransaction:');
  console.log(`
curl -X POST '${WEBHOOK_URL}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Timestamp: ${timestamp}' \\
  -H 'X-Signature: ${sig1}' \\
  -d '{
    "method": "createTransaction",
    "params": {
      "cheque_id": "550e8400-e29b-41d4-a716-446655440000",
      "order_id": 12345,
      "amount": 50000,
      "merchant_id": "mer_abc123"
    }
  }'
  `);

  console.log('\n3️⃣  performTransaction:');
  console.log(`
curl -X POST '${WEBHOOK_URL}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Timestamp: ${timestamp}' \\
  -H 'X-Signature: ${sig1}' \\
  -d '{
    "method": "performTransaction",
    "params": {
      "cheque_id": "550e8400-e29b-41d4-a716-446655440000",
      "order_id": 12345,
      "amount": 50000,
      "merchant_id": "mer_abc123",
      "transaction_id": 42,
      "additional": {"product_id": 99}
    }
  }'
  `);

  console.log('\n\n🚀 To run full test suite: node test-webhook.js --run');
} else if (args[0] === '--run') {
  runTests();
} else {
  console.log('Usage: node test-webhook.js [--run]');
  console.log('       node test-webhook.js (shows curl examples)');
}
