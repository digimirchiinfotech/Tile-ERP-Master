-- Add missing columns to proforma_orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_orders' AND column_name = 'payment_terms') THEN
        ALTER TABLE proforma_orders ADD COLUMN payment_terms TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_orders' AND column_name = 'delivery_schedule') THEN
        ALTER TABLE proforma_orders ADD COLUMN delivery_schedule TEXT;
    END IF;
END $$;
