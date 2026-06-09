-- Create subscription_transactions table
CREATE TABLE IF NOT EXISTS subscription_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    plan_id INTEGER NOT NULL,
    transaction_id VARCHAR(100),
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_company_id ON subscription_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_payment_date ON subscription_transactions(payment_date);
