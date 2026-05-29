import React, { useState } from 'react';
import { Check, Sparkles, Zap, Brain, Globe, Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useProfile } from '../hooks/useProfile';
import { toast } from 'sonner';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for exploring AI capabilities.',
    features: [
      '50 messages per day',
      'Access to Basic AI',
      'Community Support',
      'Basic Notebook LM features',
      'Standard processing'
    ],
    button: 'Current Plan',
    active: false
  },
  {
    name: 'Pro',
    price: '150,000 UZS',
    period: '/oy',
    description: 'Best for dedicated students & researchers.',
    features: [
      'Unlimited messages',
      'Access to Typer 4.0 Pro',
      'Priority Support',
      'Advanced Math Solver',
      'Advanced Notebook LM with exports',
      '2x Faster response'
    ],
    button: 'Upgrade to Pro',
    active: true,
    popular: true
  },
  {
    name: 'Research',
    price: '350,000 UZS',
    period: '/oy',
    description: 'Power tools for academic excellence.',
    features: [
      'Everything in Pro',
      'Team Collaboration',
      'API Access',
      'Early access to new features',
      'Unlimited Math Exports',
      'Dedicated Account Manager'
    ],
    button: 'Start Free Trial',
    active: false
  }
];

function PricingPage({ session }) {
  const navigate = useNavigate();
  const { profile } = useProfile(session);
  const [loadingPlan, setLoadingPlan] = useState('');
  
  const currentPlan = profile?.plan || 'Free';

  const handleUpgrade = async (planName) => {
    if (planName === 'Free' || planName === currentPlan) return;
    
    setLoadingPlan(planName);
    const amount = planName === 'Pro' ? 150000 : 350000;
    
    try {
      // 1. Create a pending payment in Supabase
      const { data: payment, error: dbError } = await supabase
        .from('payments')
        .insert([{
          user_id: session.user.id,
          amount: amount,
          plan_name: planName,
          status: 'pending'
        }])
        .select()
        .single();
        
      if (dbError) throw dbError;
      
      // 2. Call Vercel serverless function to create TSPay transaction
      const response = await fetch('/api/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount: amount,
          order_id: payment.id,
          redirect_url: window.location.origin + '/payment-return'
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'TSPay API error');
      }
      
      const { payment_url } = await response.json();
      
      // 3. Redirect to TSPay Checkout
      window.location.href = payment_url;
      
    } catch (err) {
      console.error(err);
      toast.error('To\'lov tizimiga ulanishda xatolik: ' + err.message);
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-8 bg-white nano-bg custom-scrollbar flex flex-col">
      <div className="max-w-6xl w-full mx-auto space-y-8 animate-in fade-in duration-1000 flex flex-col">

        {/* Header */}
        <div className="hidden md:block text-center space-y-1 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-500 rounded-full text-[9px] font-medium uppercase tracking-[0.2em] border border-indigo-100">
            <Sparkles size={10} /> Pricing Plans
          </div>
          <h1 className="text-3xl font-normal text-slate-900 tracking-tight">Simple, transparent pricing.</h1>
          <p className="text-[14px] text-slate-400 font-normal max-w-lg mx-auto leading-relaxed">
            Choose the perfect plan for your academic journey. Unlock powerful AI features.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          {PLANS.map((plan) => {
            const isCurrent = plan.name === currentPlan;
            return (
              <div key={plan.name} className={`pricing-card flex flex-col p-8 ${plan.popular ? 'popular relative scale-[1.02] shadow-xl shadow-indigo-500/5' : 'shadow-sm border border-slate-50'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-[9px] font-medium uppercase tracking-[0.2em] rounded-full shadow-lg shadow-indigo-500/20">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4 mb-6 shrink-0">
                  <div className="space-y-1">
                    <h3 className="text-md font-medium text-slate-800">{plan.name}</h3>
                    <p className="text-[12px] text-slate-400 font-normal leading-relaxed">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-normal text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-[12px] text-slate-400 font-normal">{plan.period}</span>}
                  </div>
                </div>

                <div className="flex-1 space-y-3 mb-8 overflow-y-auto custom-scrollbar pr-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-[12px] text-slate-500 font-normal">
                      <div className="w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-100">
                        <Check size={10} className="text-slate-400" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={isCurrent || loadingPlan !== ''}
                  className={`w-full py-3 rounded-xl text-[13px] font-medium transition-all shrink-0 flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                      : plan.popular
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10 hover:opacity-90 cursor-pointer'
                        : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  {loadingPlan === plan.name ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : isCurrent ? (
                    'Joriy Tarif'
                  ) : (
                    plan.button
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Minimal Footer */}
        <footer className="pt-8 text-center shrink-0">
           <p className="text-[9px] text-slate-300 font-medium uppercase tracking-[0.3em]">
             Safe & Secure Transactions • Encrypted Payments
           </p>
        </footer>
      </div>
    </div>
  );
}

export default PricingPage;
