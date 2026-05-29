import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://arstapreharjmqmqwuia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3RhcHJlaGFyam1xbXF3dWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzk5NTgsImV4cCI6MjA5MzQxNTk1OH0.cik_XID1VL1W_owNRDo_XESiMfeyGClYKtR9MttMw6U';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(451).json({ detail: 'Only POST method is allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ detail: 'Missing Authorization header' });
  }

  const { amount, order_id, redirect_url } = req.body;
  if (!amount || !order_id) {
    return res.status(400).json({ detail: 'Missing amount or order_id' });
  }

  try {
    // Initialize Supabase Client with the user's Auth Header (respects RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. Verify that the payment record exists and belongs to the authenticated user
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ detail: 'Payment record not found or unauthorized' });
    }

    // 2. Call TSPay API to create transaction
    const merchantId = process.env.TSPAY_MERCHANT_ID || 'mer_abc123';
    const tspayUrl = 'https://api.tspay.uz/api/transactions/';

    console.log(`Creating TSPay transaction for Order #${order_id}, Amount: ${amount} UZS`);
    
    const tspayResponse = await fetch(tspayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: Number(amount),
        order_id: Number(order_id),
        redirect_url: redirect_url || 'https://example.com/return'
      })
    });

    if (!tspayResponse.ok) {
      const errText = await tspayResponse.text();
      console.error('TSPay API Error:', errText);
      return res.status(502).json({ detail: `TSPay API Error: ${errText}` });
    }

    const tspayData = await tspayResponse.json();
    const { cheque_id, payment_url } = tspayData;

    if (!cheque_id || !payment_url) {
      return res.status(502).json({ detail: 'Invalid response from TSPay API: cheque_id or payment_url is missing' });
    }

    // 3. Update the cheque_id in Supabase
    const { error: updateError } = await supabase
      .from('payments')
      .update({ cheque_id: cheque_id })
      .eq('id', order_id);

    if (updateError) {
      console.error('Database Update Error:', updateError);
      return res.status(500).json({ detail: `Database Update Error: ${updateError.message}` });
    }

    // Return the response details
    return res.status(200).json({
      cheque_id,
      payment_url
    });

  } catch (err) {
    console.error('Uncaught create-transaction error:', err);
    return res.status(500).json({ detail: err.message });
  }
}
