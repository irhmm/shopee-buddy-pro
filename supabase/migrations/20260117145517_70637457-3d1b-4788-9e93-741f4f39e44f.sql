-- Create expenditures table
CREATE TABLE public.expenditures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  expenditure_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenditures ENABLE ROW LEVEL SECURITY;

-- Policy: Franchise can manage own expenditures, super admin can view all
CREATE POLICY "Users can manage expenditures"
ON public.expenditures
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR 
  franchise_id = get_user_franchise_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  franchise_id = get_user_franchise_id(auth.uid())
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_expenditures_updated_at
BEFORE UPDATE ON public.expenditures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();