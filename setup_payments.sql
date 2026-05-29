-- 1. Alter profiles table to add plan and plan_expires_at columns if they do not exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Free';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    cheque_id UUID UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for payments
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
CREATE POLICY "Users can read own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
CREATE POLICY "Users can update own payments"
ON public.payments FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Create secure function to complete payment (runs as DB owner)
CREATE OR REPLACE FUNCTION public.complete_payment(
    p_cheque_id UUID,
    p_amount NUMERIC,
    p_secret TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment RECORD;
    v_target_secret TEXT := 'ts_pay_webhook_secret_556677'; -- Must match process.env.WEBHOOK_SECRET
    v_result JSONB;
BEGIN
    -- Verify secret key to prevent unauthorized execution
    IF p_secret <> v_target_secret THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Invalid secret key');
    END IF;

    -- Find the pending payment record
    SELECT * INTO v_payment 
    FROM public.payments 
    WHERE cheque_id = p_cheque_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Payment record not found');
    END IF;

    -- Check if it's already success
    IF v_payment.status = 'success' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Payment already processed successfully', 'plan', v_payment.plan_name);
    END IF;

    -- Verify amount
    IF v_payment.amount <> p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch: Expected ' || v_payment.amount || ' but got ' || p_amount);
    END IF;

    -- Update payment record status
    UPDATE public.payments 
    SET status = 'success', 
        updated_at = NOW() 
    WHERE id = v_payment.id;

    -- Update user profile
    UPDATE public.profiles 
    SET plan = v_payment.plan_name,
        credits = COALESCE(credits, 0) + CASE 
            WHEN v_payment.plan_name = 'Pro' THEN 1000
            WHEN v_payment.plan_name = 'Research' THEN 5000
            ELSE 0 
        END,
        plan_expires_at = NOW() + INTERVAL '1 month'
    WHERE id = v_payment.user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Payment processed successfully', 
        'user_id', v_payment.user_id,
        'plan', v_payment.plan_name
    );
END;
$$;
