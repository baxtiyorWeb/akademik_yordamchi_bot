# TSPay Webhook Integration Setup Guide

## 1. Environment Variables

Add these to your deployment environment (Vercel, Docker, etc.) and local `.env`:

### Required

```bash
# Supabase (for DB access in webhook handler)
SUPABASE_URL=https://arstapreharjmqmqwuia.supabase.co
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>  # From Supabase Dashboard

# TSPay Webhook Security
WEBHOOK_SECRET=ts_pay_webhook_secret_556677  # Set in TSPay Admin Panel

# TSPay Merchant
TSPAY_MERCHANT_ID=mer_abc123  # From TSPay Admin Panel
```

### Optional (for testing)

```bash
WEBHOOK_URL=http://localhost:3000/api/webhook  # For local testing
```

## 2. Where to Find Credentials

| Variable | Where to Get | Instructions |
|----------|-------------|--------------|
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard | Settings → API → Service Role Key |
| `WEBHOOK_SECRET` | TSPay Admin Panel | Merchant → Settings → Webhook Secret (you can set this) |
| `TSPAY_MERCHANT_ID` | TSPay Admin Panel | Merchant → Dashboard → Merchant ID |

## 3. TSPay Dashboard Configuration

1. Login to [TSPay Admin Panel](https://dashboard.tspay.uz)
2. Go to **Merchant Settings**
3. Set **Webhook URL** to your endpoint:
   ```
   https://yourdomain.com/api/webhook    (production)
   http://localhost:3000/api/webhook     (local testing)
   ```
4. Set **Webhook Secret** (copy to `WEBHOOK_SECRET` env var)
5. Save and note your **Merchant ID** (copy to `TSPAY_MERCHANT_ID`)

## 4. Vercel Deployment

Add environment variables in Vercel Dashboard:

1. Project Settings → Environment Variables
2. Add each variable from section 1
3. Redeploy: `vercel --prod`

## 5. Local Testing

### Option A: Using test-webhook.js (Recommended)

```bash
# Install dependencies (if not already installed)
npm install node-fetch

# Show curl examples
node test-webhook.js

# Run full test suite (requires local API running)
WEBHOOK_SECRET=ts_pay_webhook_secret_556677 \
WEBHOOK_URL=http://localhost:3000/api/webhook \
SUPABASE_SERVICE_KEY=<your-service-key> \
node test-webhook.js --run
```

### Option B: Manual curl

```bash
# Compute signature and send request
TIMESTAMP=$(date +%s)
ORDER_ID=12345
AMOUNT=50000
SECRET=ts_pay_webhook_secret_556677

# Compute HMAC-SHA256
SIGNATURE="sha256=$(echo -n "${ORDER_ID}:${AMOUNT}.0:${TIMESTAMP}" | openssl dgst -sha256 -hmac "${SECRET}" -hex | cut -d' ' -f2)"

curl -X POST 'http://localhost:3000/api/webhook' \
  -H 'Content-Type: application/json' \
  -H "X-Timestamp: ${TIMESTAMP}" \
  -H "X-Signature: ${SIGNATURE}" \
  -d '{
    "method": "checkPerform",
    "params": {
      "cheque_id": "550e8400-e29b-41d4-a716-446655440000",
      "order_id": 12345,
      "amount": 50000,
      "merchant_id": "mer_abc123"
    }
  }'
```

## 6. Webhook Flow Summary

```
User clicks "Pay" button
    ↓
POST /api/create-transaction
  ├─ Create/fetch payment record in DB
  └─ Call TSPay API POST /transactions
    ├─ TSPay responds with cheque_id + payment_url
    └─ Redirect user to payment_url
       
User enters card details on TSPay
    ↓
TSPay processes payment
    ↓
If successful, TSPay sends webhook:
  ├─ checkPerform (verify order exists & amount matches)
  ├─ createTransaction (create transaction record)
  └─ performTransaction (mark payment as completed)
    ↓
User sees "Payment Successful" page
```

## 7. Database Schema

Ensure `payments` table has these columns:

```sql
CREATE TABLE payments (
  id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  cheque_id UUID UNIQUE,
  amount NUMERIC,
  plan_name TEXT,
  status TEXT DEFAULT 'pending',  -- pending, paid, failed
  transaction_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 8. Verification Checklist

- [ ] WEBHOOK_SECRET matches TSPay Dashboard setting
- [ ] SUPABASE_SERVICE_KEY has full DB access
- [ ] WEBHOOK_URL is HTTPS (required by TSPay)
- [ ] Webhook responds within 10 seconds
- [ ] payments table exists with correct schema
- [ ] Test webhook locally with test-webhook.js
- [ ] Deploy to Vercel
- [ ] Test with real TSPay sandbox transaction
- [ ] Monitor logs for errors

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid signature" | Check WEBHOOK_SECRET matches TSPay dashboard |
| "DB error" | Verify SUPABASE_SERVICE_KEY and table schema |
| "order_id missing" | Ensure payments table has id column as primary key |
| 10s timeout | Webhook handler taking too long (check DB queries) |
| Merchant auto-disabled | Fix webhook errors (3 failures = auto-disable) |

## 10. API Endpoints

### Frontend (React)

```javascript
// Initiate payment
const response = await fetch('/api/create-transaction', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    amount: 150000,
    order_id: payment.id,
    redirect_url: window.location.origin + '/payment-return'
  })
});
const { payment_url } = await response.json();
window.location.href = payment_url;
```

### Backend (Node.js) - Webhook Handler

`/api/webhook` - POST

Receives TSPay webhooks and processes payments. See webhook.js for implementation.

### Status Check (Optional)

```bash
# Check transaction status
curl 'https://api.tspay.uz/api/transactions/cheque/{cheque_id}'
```

---

**Last Updated:** June 2026
**TSPay Docs:** https://docs.tspay.uz
