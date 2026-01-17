-- Create profit_sharing_payments table
CREATE TABLE public.profit_sharing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    total_revenue NUMERIC DEFAULT 0,
    profit_sharing_percent NUMERIC DEFAULT 0,
    profit_sharing_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(franchise_id, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.profit_sharing_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin full access
CREATE POLICY "Super admin can manage profit sharing payments"
ON public.profit_sharing_payments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Policy: Franchise can only view their own payments
CREATE POLICY "Franchise can view own payments"
ON public.profit_sharing_payments FOR SELECT TO authenticated
USING (franchise_id = get_user_franchise_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_profit_sharing_payments_updated_at
BEFORE UPDATE ON public.profit_sharing_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();