-- Execute no Supabase SQL Editor se a tabela já existir
ALTER TABLE quiz_orders ADD COLUMN IF NOT EXISTS music_versions JSONB;
