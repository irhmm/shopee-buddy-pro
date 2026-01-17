-- Remove old public access policies that are too permissive
-- These were from before the multi-franchise system

-- Drop old policies from products
DROP POLICY IF EXISTS "Allow public delete access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public update access on products" ON public.products;

-- Drop old policies from sales
DROP POLICY IF EXISTS "Allow public delete access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public insert access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public read access on sales" ON public.sales;

-- Drop old policies from admin_settings
DROP POLICY IF EXISTS "Allow public insert access on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow public read access on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow public update access on admin_settings" ON public.admin_settings;

-- Fix the update_updated_at_column function to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;