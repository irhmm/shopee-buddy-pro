-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  hpp NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies for products (public access for now - no auth)
CREATE POLICY "Allow public read access on products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on products" 
ON public.products 
FOR DELETE 
USING (true);

-- Create admin_settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_fee_percent NUMERIC NOT NULL DEFAULT 5,
  fixed_deduction NUMERIC NOT NULL DEFAULT 1000,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_settings (public access for now - no auth)
CREATE POLICY "Allow public read access on admin_settings" 
ON public.admin_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on admin_settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on admin_settings" 
ON public.admin_settings 
FOR UPDATE 
USING (true);

-- Insert default settings
INSERT INTO public.admin_settings (admin_fee_percent, fixed_deduction) 
VALUES (5, 1000);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  hpp_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_hpp NUMERIC NOT NULL DEFAULT 0,
  total_admin_fee NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales (public access for now - no auth)
CREATE POLICY "Allow public read access on sales" 
ON public.sales 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete access on sales" 
ON public.sales 
FOR DELETE 
USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin_settings
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();