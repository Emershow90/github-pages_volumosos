-- TABELA: universos_trabalho

CREATE TABLE IF NOT EXISTS universos_trabalho (
  id TEXT PRIMARY KEY,
  setor_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  meta NUMERIC DEFAULT 0,
  feito NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscas rápidas pelo setor
CREATE INDEX IF NOT EXISTS idx_universos_setor ON universos_trabalho(setor_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE universos_trabalho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated" ON universos_trabalho;
CREATE POLICY "Allow select for authenticated" ON universos_trabalho
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON universos_trabalho;
CREATE POLICY "Allow insert for authenticated" ON universos_trabalho
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated" ON universos_trabalho;
CREATE POLICY "Allow update for authenticated" ON universos_trabalho
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete for authenticated" ON universos_trabalho;
CREATE POLICY "Allow delete for authenticated" ON universos_trabalho
  FOR DELETE TO authenticated USING (true);
