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
  const ord = params.order_id ?? '';
  const secret = process.env.WEBHOOK_SECRET || 'ts_pay_webhook_secret_556677';

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${ord}:${amountStr}:${ts}`)
    .digest('hex');

  try {
    const expBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  // CORS
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

  // Supabase client with service key to perform privileged DB ops
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_SERVICE_KEY env var');
    return res.status(500).json({ allow: false, reason: 'Server misconfiguration' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const params = body.params || {};

  try {
    if (method === 'checkPerform') {
      const { order_id, amount } = params;
      if (!order_id) return res.status(400).json({ allow: false, reason: 'order_id missing' });

      // find payment/order in DB
      const { data: existing, error: fetchErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', order_id)
        .maybeSingle();

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

      // return additional info (idempotency helper)
      return res.status(200).json({ allow: true, additional: { db_id: existing.id } });
    }

    if (method === 'createTransaction') {
      const { order_id, amount, cheque_id } = params;
      if (!order_id) return res.status(400).json({ success: false, error: { code: -31001, message: 'order_id missing' } });

      // Idempotency: if transaction already exists for order_id, return it
      const { data: existingTx, error: txErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', order_id)
        .maybeSingle();

      if (txErr) {
        console.error('DB error createTransaction:', txErr);
        return res.status(500).json({ success: false });
      }

      if (existingTx) {
        if (Number(existingTx.amount) !== Number(amount)) {
          return res.status(400).json({ error: { code: -31001, message: 'Summa mos emas' } });
        }
        // update cheque_id if provided
        if (cheque_id && !existingTx.cheque_id) {
          await supabase.from('payments').update({ cheque_id }).eq('id', order_id);
        }
        return res.status(200).json({ success: true, transaction_id: existingTx.cheque_id || cheque_id || null });
      }

      // Otherwise create a new payment record (merchant pre-create)
      const insertPayload = {
        id: order_id,
        amount: Number(amount),
        cheque_id: cheque_id || null,
        status: 'pending'
      };

      const { data: inserted, error: insertErr } = await supabase.from('payments').insert([insertPayload]).select().maybeSingle();
      if (insertErr) {
        console.error('Failed to create payment record:', insertErr);
        return res.status(500).json({ success: false });
      }

      return res.status(200).json({ success: true, transaction_id: cheque_id || inserted?.cheque_id || null });
    }

    if (method === 'performTransaction') {
      const { cheque_id, order_id, amount, transaction_id, additional } = params;
      // Mark payment as completed
      // First find the payment by cheque_id or order_id
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
        // Create a fallback record if not exists
        const { data: created, error: createErr } = await supabase.from('payments').insert([{
          id: order_id || null,
          cheque_id: cheque_id || null,
          amount: Number(amount) || 0,
          status: 'success'
        }]).select().maybeSingle();
        if (createErr) {
          console.error('Failed to create fallback payment:', createErr);
          return res.status(500).json({ success: false });
        }
        return res.status(200).json({ success: true });
      }

      // validate amount
      if (Number(pay.amount) !== Number(amount)) {
        console.warn('Amount mismatch on performTransaction', { db: pay.amount, incoming: amount });
        // mark failed
        await supabase.from('payments').update({ status: 'failed' }).eq('id', pay.id);
        return res.status(400).json({ success: false });
      }

      // Update payment record as success
      const { error: updErr } = await supabase.from('payments').update({ status: 'success', transaction_id }).eq('id', pay.id);
      if (updErr) {
        console.error('Failed to mark payment as success:', updErr);
        return res.status(500).json({ success: false });
      }

      // Add credits to user profile based on plan_name or amount
      if (pay.user_id) {
        try {
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', pay.user_id).single();
          let currentCredits = profile?.credits || 0;
          
          let addedCredits = 0;
          if (pay.plan_name && pay.plan_name.includes('Kredit')) {
            addedCredits = parseInt(pay.plan_name.split(' ')[0]) || 0;
          }
          if (addedCredits === 0) {
            addedCredits = Math.floor(Number(amount) / 50); // 1 credit = 50 UZS
          }
          
          if (addedCredits > 0) {
            await supabase.from('profiles').update({ credits: currentCredits + addedCredits }).eq('id', pay.user_id);
          }
        } catch (err) {
          console.error('Failed to update user credits:', err);
          // Don't fail the webhook, payment was already recorded
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
