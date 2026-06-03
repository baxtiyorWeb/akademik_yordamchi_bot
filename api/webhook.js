import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://arstapreharjmqmqwuia.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

function formatAmount(amount) {
  let s = String(amount ?? '');
  if (s === '') return '';
  if (!s.includes('.')) s += '.0';
  return s;
}

function verifySignature(headers, body) {
  const sig = (headers['x-signature'] || headers['X-Signature'] || '').toString();
  const ts = (headers['x-timestamp'] || headers['X-Timestamp'] || '').toString();
  const params = (body && body.params) || {};

  const amountStr = formatAmount(params.amount);
  const ord = (params.order_id ?? params.cheque_id ?? '').toString();
  const secret = process.env.WEBHOOK_SECRET || 'ts_pay_webhook_secret_556677';

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${ord}:${amountStr}:${ts}`)
    .digest('hex');

  try {
    const expBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expBuf.length !== sigBuf.length) {
      // Try fallback signature with empty order_id if mismatch
      const expectedFallback = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(`:${amountStr}:${ts}`)
        .digest('hex');
      const fallbackBuf = Buffer.from(expectedFallback);
      if (fallbackBuf.length === sigBuf.length && crypto.timingSafeEqual(fallbackBuf, sigBuf)) {
        return true;
      }
      return false;
    }
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature, X-Timestamp');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Only POST allowed' });

  const body = req.body || {};
  const method = body.method;

  // Verify signature
  if (!verifySignature(req.headers, body)) {
    console.warn('Invalid webhook signature', { headers: req.headers, body: body });
    return res.status(401).json({ allow: false, reason: 'Invalid signature' });
  }

  // Initialize Supabase Client
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_SERVICE_KEY env var');
    return res.status(500).json({ allow: false, reason: 'Server misconfiguration' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const params = body.params || {};

  try {
    if (method === 'checkPerform') {
      const { order_id, cheque_id, amount } = params;
      
      // Look up payment/order in DB
      let q = supabase.from('payments').select('*');
      if (cheque_id) q = q.eq('cheque_id', cheque_id);
      else if (order_id) q = q.eq('id', order_id);
      else return res.status(400).json({ allow: false, reason: 'order_id or cheque_id missing' });

      const { data: existing, error: fetchErr } = await q.maybeSingle();

      if (fetchErr) {
        console.error('DB error on checkPerform:', fetchErr);
        return res.status(500).json({ allow: false, reason: 'DB error' });
      }

      if (!existing) {
        return res.status(200).json({ allow: false, reason: 'Buyurtma topilmadi' });
      }

      if (Number(existing.amount) !== Number(amount)) {
        return res.status(200).json({ allow: false, reason: 'Summa mos emas' });
      }

      return res.status(200).json({ allow: true, additional: { db_id: existing.id } });
    }

    if (method === 'createTransaction') {
      const { order_id, cheque_id, amount } = params;
      
      let q = supabase.from('payments').select('*');
      if (cheque_id) q = q.eq('cheque_id', cheque_id);
      else if (order_id) q = q.eq('id', order_id);
      else return res.status(400).json({ success: false, error: { code: -31001, message: 'order_id or cheque_id missing' } });

      const { data: existingTx, error: txErr } = await q.maybeSingle();

      if (txErr) {
        console.error('DB error createTransaction:', txErr);
        return res.status(500).json({ success: false });
      }

      if (existingTx) {
        if (Number(existingTx.amount) !== Number(amount)) {
          return res.status(400).json({ error: { code: -31001, message: 'Summa mos emas' } });
        }
        // Update cheque_id if not present
        if (cheque_id && !existingTx.cheque_id) {
          await supabase.from('payments').update({ cheque_id }).eq('id', existingTx.id);
        }
        return res.status(200).json({ success: true, transaction_id: existingTx.cheque_id || cheque_id || null });
      }

      // Fallback: create pending record if not present
      const insertPayload = {
        amount: Number(amount),
        cheque_id: cheque_id || null,
        status: 'pending',
        plan_name: 'Custom'
      };
      if (order_id) insertPayload.id = order_id;

      const { data: inserted, error: insertErr } = await supabase.from('payments').insert([insertPayload]).select().maybeSingle();
      if (insertErr) {
        console.error('Failed to create payment record:', insertErr);
        return res.status(500).json({ success: false });
      }

      return res.status(200).json({ success: true, transaction_id: cheque_id || inserted?.cheque_id || null });
    }

    if (method === 'performTransaction') {
      const { cheque_id, order_id, amount, transaction_id } = params;
      
      // Look up payment/order
      let q = supabase.from('payments').select('*');
      if (cheque_id) q = q.eq('cheque_id', cheque_id);
      else if (order_id) q = q.eq('id', order_id);
      else return res.status(400).json({ success: false, reason: 'cheque_id or order_id required' });

      const { data: pay, error: payErr } = await q.maybeSingle();
      if (payErr) {
        console.error('DB error performTransaction find:', payErr);
        return res.status(500).json({ success: false });
      }

      if (!pay) {
        // Fallback fallback: create a success record directly
        const { error: createErr } = await supabase.from('payments').insert([{
          id: order_id || null,
          cheque_id: cheque_id || null,
          amount: Number(amount) || 0,
          status: 'success',
          plan_name: 'Custom'
        }]);
        if (createErr) {
          console.error('Failed to create fallback payment:', createErr);
          return res.status(500).json({ success: false });
        }
        return res.status(200).json({ success: true });
      }

      // If already success, return success
      if (pay.status === 'success') {
        return res.status(200).json({ success: true });
      }

      // Verify amount
      if (Number(pay.amount) !== Number(amount)) {
        console.warn('Amount mismatch on performTransaction', { db: pay.amount, incoming: amount });
        await supabase.from('payments').update({ status: 'failed' }).eq('id', pay.id);
        return res.status(400).json({ success: false });
      }

      // Mark payment as success
      const { error: updErr } = await supabase
        .from('payments')
        .update({ status: 'success', updated_at: new Date().toISOString() })
        .eq('id', pay.id);

      if (updErr) {
        console.error('Failed to mark payment as success:', updErr);
        return res.status(500).json({ success: false });
      }

      // Update user plan & credits
      if (pay.user_id) {
        try {
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', pay.user_id).single();
          let currentCredits = profile?.credits || 0;

          let addedCredits = 0;
          const planLower = (pay.plan_name || '').toLowerCase();
          
          if (planLower === 'starter') {
            addedCredits = 500;
          } else if (planLower === 'individual') {
            addedCredits = 1500;
          } else if (planLower === 'professional') {
            addedCredits = 5000;
          } else if (planLower.includes('kredit')) {
            addedCredits = parseInt(planLower.split(' ')[0]) || 0;
          }

          if (addedCredits === 0) {
            addedCredits = Math.floor(Number(amount) / 50); // Fallback: 1 credit = 50 UZS
          }

          const planDisplayName = planLower.charAt(0).toUpperCase() + planLower.slice(1);
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 1 month

          await supabase.from('profiles').update({
            credits: currentCredits + addedCredits,
            plan: planDisplayName,
            plan_expires_at: expiresAt
          }).eq('id', pay.user_id);

          console.log(`[PAYMENT_SUCCESS] Credited User ${pay.user_id}: +${addedCredits} credits, Plan: ${planDisplayName}`);
        } catch (err) {
          console.error('Failed to update user profile:', err);
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ allow: false, reason: 'Unknown method' });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ success: false, reason: err.message });
  }
}
