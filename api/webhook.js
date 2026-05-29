import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://arstapreharjmqmqwuia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3RhcHJlaGFyam1xbXF3dWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzk5NTgsImV4cCI6MjA5MzQxNTk1OH0.cik_XID1VL1W_owNRDo_XESiMfeyGClYKtR9MttMw6U';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Only POST method is allowed' });
  }

  // Parse webhook payload: supports cheque_id/order_id in body or query
  const chequeId = req.body?.cheque_id || req.query?.cheque_id || req.body?.id || req.query?.id;
  const orderId = req.body?.order_id || req.query?.order_id;

  if (!chequeId && !orderId) {
    console.error('Webhook missing cheque_id and order_id in body/query:', req.body, req.query);
    return res.status(400).json({ detail: 'Missing cheque_id or order_id in payload' });
  }

  console.log(`TSPay Webhook received. Cheque ID: ${chequeId || 'N/A'}, Order ID: ${orderId || 'N/A'}`);

  try {
    // 1. Verify the transaction status directly from TSPay API
    const statusUrl = chequeId 
      ? `https://api.tspay.uz/api/transactions/cheque/${chequeId}`
      : `https://api.tspay.uz/api/transactions/${orderId}`;

    const tspayResponse = await fetch(statusUrl);

    if (!tspayResponse.ok) {
      console.error(`Failed to verify transaction status from TSPay API for ${chequeId || orderId}`);
      return res.status(502).json({ detail: 'Failed to verify transaction from TSPay API' });
    }

    const transaction = await tspayResponse.json();
    const { status, amount, cheque_id: resolvedChequeId } = transaction;
    const actualChequeId = chequeId || resolvedChequeId;

    if (!actualChequeId) {
      console.error('Could not resolve cheque_id from TSPay API response:', transaction);
      return res.status(502).json({ detail: 'Could not resolve cheque_id from TSPay API response' });
    }

    console.log(`TSPay verified status for ${actualChequeId}: ${status}, Amount: ${amount}`);

    // 2. Check if the transaction is completed/success
    const isCompleted = status === 'completed' || status === 'success';
    if (!isCompleted) {
      console.log(`Transaction ${actualChequeId} is not completed (Status: ${status})`);
      return res.status(200).json({ detail: `Transaction status is ${status}. No action taken.` });
    }

    // 3. Call the secure Database RPC function complete_payment
    const supabase = createClient(supabaseUrl, supabaseKey);
    const webhookSecret = process.env.WEBHOOK_SECRET || 'ts_pay_webhook_secret_556677';

    const { data: result, error: rpcError } = await supabase.rpc('complete_payment', {
      p_cheque_id: actualChequeId,
      p_amount: Number(amount),
      p_secret: webhookSecret
    });

    if (rpcError) {
      console.error('complete_payment RPC database error:', rpcError.message);
      return res.status(500).json({ detail: `Database RPC Error: ${rpcError.message}` });
    }

    if (!result.success) {
      console.error('complete_payment RPC logical failure:', result.message);
      return res.status(400).json({ detail: `Logical Failure: ${result.message}` });
    }

    console.log('Payment processed successfully by database:', result);
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed successfully', 
      result 
    });

  } catch (err) {
    console.error('Uncaught webhook error:', err);
    return res.status(500).json({ detail: err.message });
  }
}
