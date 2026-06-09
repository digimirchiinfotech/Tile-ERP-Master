-- Update default status for proforma_orders
ALTER TABLE proforma_orders ALTER COLUMN status SET DEFAULT 'Draft';

-- Update existing records that are 'Pending' to 'Draft' so they appear in the dashboard
UPDATE proforma_orders SET status = 'Draft' WHERE status = 'Pending';
