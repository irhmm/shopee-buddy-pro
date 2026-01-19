-- Add discount columns to sales table
ALTER TABLE public.sales 
ADD COLUMN discount_type TEXT DEFAULT NULL,
ADD COLUMN discount_value NUMERIC DEFAULT 0;

-- Add check constraint for discount_type
ALTER TABLE public.sales 
ADD CONSTRAINT sales_discount_type_check 
CHECK (discount_type IS NULL OR discount_type IN ('percentage', 'fixed'));