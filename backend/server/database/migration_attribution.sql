-- Rastreamento de origem (UTM / src) — execute no Supabase SQL Editor
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS traffic_src VARCHAR(100);
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255);
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS landing_page TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_orders_traffic_src ON quiz_orders(traffic_src);
CREATE INDEX IF NOT EXISTS idx_quiz_orders_utm_source ON quiz_orders(utm_source);
CREATE INDEX IF NOT EXISTS idx_quiz_orders_paid_at ON quiz_orders(paid_at DESC);
