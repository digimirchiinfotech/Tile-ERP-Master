-- Notification system schema migration
-- Ensures all required columns exist for the notification system

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'company_id') THEN
        ALTER TABLE public.notifications ALTER COLUMN company_id DROP NOT NULL;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS role_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS module VARCHAR(100),
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS redirect_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);

-- Migrate legacy column data to redirect_url
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        UPDATE public.notifications SET redirect_url = link WHERE redirect_url IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
        UPDATE public.notifications SET redirect_url = action_url WHERE redirect_url IS NULL;
    END IF;
END $$;

-- Create performance indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'module') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_module ON public.notifications(module);
    END IF;
END $$;
