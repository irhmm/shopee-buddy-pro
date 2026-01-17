-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'franchise');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create franchises table
CREATE TABLE public.franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    profit_sharing_percent NUMERIC DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on franchises
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;

-- 4. Add franchise_id to products table
ALTER TABLE public.products 
ADD COLUMN franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE;

-- 5. Add franchise_id to sales table
ALTER TABLE public.sales 
ADD COLUMN franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE;

-- 6. Add franchise_id to admin_settings (make unique per franchise)
ALTER TABLE public.admin_settings 
ADD COLUMN franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE UNIQUE;

-- 7. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 8. Create function to get franchise_id from user_id
CREATE OR REPLACE FUNCTION public.get_user_franchise_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.franchises WHERE user_id = _user_id
$$;

-- 9. RLS Policies for user_roles
-- Only super_admin can see all roles, users can see their own
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Only super_admin can manage roles
CREATE POLICY "Super admin can manage roles" 
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 10. RLS Policies for franchises
-- Franchise can view own, Super Admin can view all
CREATE POLICY "Franchise visibility" 
ON public.franchises FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Only Super Admin can insert/update/delete franchises
CREATE POLICY "Super admin can manage franchises" 
ON public.franchises FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 11. RLS Policies for products
-- Drop existing policies if any
DROP POLICY IF EXISTS "Franchise can manage own products" ON public.products;

CREATE POLICY "Franchise can manage own products" 
ON public.products FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  franchise_id = public.get_user_franchise_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  franchise_id = public.get_user_franchise_id(auth.uid())
);

-- 12. RLS Policies for sales
DROP POLICY IF EXISTS "Franchise can manage own sales" ON public.sales;

CREATE POLICY "Franchise can manage own sales" 
ON public.sales FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  franchise_id = public.get_user_franchise_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  franchise_id = public.get_user_franchise_id(auth.uid())
);

-- 13. RLS Policies for admin_settings
DROP POLICY IF EXISTS "Franchise can manage own settings" ON public.admin_settings;

CREATE POLICY "Franchise can manage own settings" 
ON public.admin_settings FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  franchise_id = public.get_user_franchise_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  franchise_id = public.get_user_franchise_id(auth.uid())
);

-- 14. Create trigger for updated_at on franchises
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_franchises_updated_at
BEFORE UPDATE ON public.franchises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();