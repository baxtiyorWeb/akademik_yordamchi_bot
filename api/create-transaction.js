import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://arstapreharjmqmqwuia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3RhcHJlaGFyam1xbXF3dWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzk5NTgsImV4cCI6MjA5MzQxNTk1OH0.cik_XID1VL1W_owNRDo_XESiMfeyGClYKtR9MttMw6U';

const PLAN_PRICES = {
  free: 0,
  starter: 19000,
  individual: 49000,
  professional: 149000,
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Only POST method is allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ detail: 'Missing Authorization header' });
  }

  const { planId, userId, redirect_url } = req.body;
  if (!userId || !planId) {
    return res.status(400).json({ detail: 'Missing userId or planId' });
  }

  const plan = planId.toLowerCase();
  const amount = PLAN_PRICES[plan];

  if (amount === undefined || amount === 0) {
    return res.status(400).json({ detail: 'The selected plan is free or invalid' });
  }

  try {
    // 1. Initialize Supabase Client with the user's Auth Header (respects RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify token validity and match user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return res.status(401).json({ detail: 'Unauthorized or expired session' });
    }

    // 2. Fetch user's profile to check if they already have this plan
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    if (profile.plan && profile.plan.toLowerCase() === plan) {
      return res.status(400).json({ detail: `Your current plan is already ${planId}` });
    }

    // 3. Create a pending payment record in Supabase
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        amount: amount,
        plan_name: planDisplayName(plan),
        status: 'pending'
      }])
      .select()
      .single();

    if (dbError || !payment) {
      console.error('Database Payment Creation Error:', dbError);
      return res.status(500).json({ detail: `Database insertion failed: ${dbError?.message}` });
    }

    // 4. Call TSPay API v1 to create transaction
    const accessToken = process.env.TSPAY_ACCESS_TOKEN || '55ea631891b9384cbb956cd37350deaab6c5e5a20a6e617043297b3c604a4a7c';
    const tspayUrl = 'https://tspay.uz/api/v1/transactions/create/';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ovvox-edu.vercel.app';
    const redirectUrl = redirect_url || `${appUrl}/payment-return`;

    console.log(`[CHECKOUT_INIT] User: ${userId}, Plan: ${plan}, Amount: ${amount} UZS`);

    const tspayResponse = await fetch(tspayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Haqiqiy brauzer sarlavhasini simulyatsiya qilamiz
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        amount: amount,
        access_token: accessToken,
        redirect_url: redirectUrl,
        comment: `${userId}:${plan}`
      })
    });

    const responseText = await tspayResponse.text();
    if (!tspayResponse.ok) {
      console.error('TSPay API Error:', responseText);
      return res.status(502).json({ detail: `TSPay API Error: ${responseText}` });
    }

    let tspayData;
    try {
      tspayData = JSON.parse(responseText);
    } catch (e) {
      console.error('TSPay API Invalid JSON:', responseText);
      return res.status(502).json({ detail: 'Invalid response from TSPay API (not JSON)' });
    }

    if (tspayData.status === 'success' && tspayData.transaction?.payment_url) {
      const chequeId = tspayData.transaction.id;

      // Update cheque_id in payment record if returned
      if (chequeId) {
        await supabase
          .from('payments')
          .update({ cheque_id: chequeId })
          .eq('id', payment.id);
      }

      // Return the URL to redirect the user
      return res.status(200).json({
        url: tspayData.transaction.payment_url
      });
    }

    console.error('TSPay API unexpected response:', tspayData);
    return res.status(400).json({ detail: "To'lov tizimi kutilmagan javob qaytardi" });

  } catch (err) {
    console.error('Uncaught create-transaction error:', err);
    return res.status(500).json({ detail: err.message });
  }
}

function planDisplayName(plan) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
