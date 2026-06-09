-- Add product_lines and shipping_address to client_orders
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS product_lines JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS country VARCHAR(100);
