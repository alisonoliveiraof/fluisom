-- Tabela principal de pedidos do quiz
CREATE TABLE IF NOT EXISTS quiz_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  relationship VARCHAR(50) NOT NULL,
  custom_relationship VARCHAR(100),
  honored_name VARCHAR(100) NOT NULL,

  special_qualities TEXT NOT NULL,
  special_moments TEXT NOT NULL,
  special_message TEXT,

  genre VARCHAR(50) NOT NULL,
  voice VARCHAR(20) NOT NULL CHECK (voice IN ('masculino', 'feminino')),

  full_name VARCHAR(150),
  email VARCHAR(255),
  whatsapp VARCHAR(30),
  discrete_mode BOOLEAN DEFAULT FALSE,

  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'generating_lyrics',
      'lyrics_ready',
      'generating_music',
      'music_ready',
      'preview_shown',
      'payment_pending',
      'paid',
      'delivered',
      'failed',
      'refunded'
    )),

  generated_lyrics TEXT,
  lyrics_generated_at TIMESTAMP WITH TIME ZONE,
  lyrics_prompt_used TEXT,

  suno_task_id VARCHAR(255),
  suno_clip_id VARCHAR(255),
  suno_status VARCHAR(50),
  suno_raw_response JSONB,
  music_generation_started_at TIMESTAMP WITH TIME ZONE,
  music_generation_completed_at TIMESTAMP WITH TIME ZONE,

  preview_audio_url TEXT,
  full_audio_url TEXT,
  audio_stored_url TEXT,
  cover_image_url TEXT,

  music_duration_seconds INTEGER,
  music_title VARCHAR(255),
  music_tags TEXT,

  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_amount DECIMAL(10,2) DEFAULT 47.90,
  payment_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMP WITH TIME ZONE,

  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_quiz_orders_status ON quiz_orders(status);
CREATE INDEX IF NOT EXISTS idx_quiz_orders_email ON quiz_orders(email);
CREATE INDEX IF NOT EXISTS idx_quiz_orders_suno_task ON quiz_orders(suno_task_id);
CREATE INDEX IF NOT EXISTS idx_quiz_orders_created ON quiz_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES quiz_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  step VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'error', 'retry')),
  message TEXT,
  payload JSONB,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_gen_logs_order ON generation_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_gen_logs_created ON generation_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO admin_settings (key, value) VALUES
  ('generation_enabled', 'true'),
  ('max_daily_generations', '100'),
  ('price_brl', '47.90')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE quiz_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access orders" ON quiz_orders;
DROP POLICY IF EXISTS "Service role full access logs" ON generation_logs;

CREATE POLICY "Service role full access orders" ON quiz_orders
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access logs" ON generation_logs
  FOR ALL USING (auth.role() = 'service_role');
