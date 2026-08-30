-- =========================================================
-- TABELA: consolidado_diario
-- Propósito: Armazenar 1 registro por dia com todas as
-- métricas consolidadas dos setores e colaboradores
-- =========================================================

CREATE TABLE IF NOT EXISTS consolidado_diario (
  id SERIAL PRIMARY KEY,

  -- Identificação temporal
  data DATE NOT NULL,
  data_br TEXT NOT NULL,                    -- DD/MM/YYYY para display
  semana TEXT NOT NULL DEFAULT '-',
  turno TEXT NOT NULL DEFAULT '-',

  -- Métricas consolidadas do dia
  total_setores INTEGER NOT NULL DEFAULT 0,
  media_uph INTEGER NOT NULL DEFAULT 0,
  media_ativ INTEGER NOT NULL DEFAULT 0,
  total_repro INTEGER NOT NULL DEFAULT 0,
  media_promessa INTEGER NOT NULL DEFAULT 0,
  media_nota5s INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0,
  total_horas_dkt INTEGER NOT NULL DEFAULT 0,
  total_poli_rec INTEGER NOT NULL DEFAULT 0,
  total_poli_said INTEGER NOT NULL DEFAULT 0,
  total_var_fin INTEGER NOT NULL DEFAULT 0,

  -- Classificação automática
  status_geral TEXT NOT NULL DEFAULT 'Crítico',
  -- Valores permitidos: 'Excelente', 'Bom', 'Regular', 'Crítico'

  -- Detalhes em JSONB para flexibilidade
  detalhes_json JSONB NOT NULL DEFAULT '{}',

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garante 1 registro por data (idempotente)
  CONSTRAINT unique_data UNIQUE (data)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_consolidado_data 
  ON consolidado_diario(data DESC);

CREATE INDEX IF NOT EXISTS idx_consolidado_semana 
  ON consolidado_diario(semana, data DESC);

CREATE INDEX IF NOT EXISTS idx_consolidado_status 
  ON consolidado_diario(status_geral, data DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_consolidado_updated_at ON consolidado_diario;
CREATE TRIGGER update_consolidado_updated_at
  BEFORE UPDATE ON consolidado_diario
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- Políticas RLS (Row Level Security) para consolidado_diario
-- =========================================================
ALTER TABLE consolidado_diario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated" ON consolidado_diario;
CREATE POLICY "Allow select for authenticated" ON consolidado_diario
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON consolidado_diario;
CREATE POLICY "Allow insert for authenticated" ON consolidado_diario
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated" ON consolidado_diario;
CREATE POLICY "Allow update for authenticated" ON consolidado_diario
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Políticas RLS para tabelas operacionais
ALTER TABLE store_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all store_master for authenticated" ON store_master;
CREATE POLICY "Allow all store_master for authenticated" ON store_master
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE store_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all store_operations for authenticated" ON store_operations;
CREATE POLICY "Allow all store_operations for authenticated" ON store_operations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- Correções de Schema em audit_logs e sync_logs
-- =========================================================

-- Adicionar updated_at em audit_logs para evitar fallback duplo
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =========================================================
-- Tabela de Planos de Ação 5W2H e Cases de Melhoria
-- =========================================================
CREATE TABLE IF NOT EXISTS planos_acao (
  id TEXT PRIMARY KEY,
  gargalo_id TEXT,
  problema TEXT NOT NULL,
  causa TEXT NOT NULL,
  what TEXT NOT NULL,
  why TEXT NOT NULL,
  "where" TEXT NOT NULL,
  "when" TEXT NOT NULL,
  "who" TEXT NOT NULL,
  "how" TEXT NOT NULL,
  how_much TEXT,
  indicador TEXT NOT NULL,
  unidade TEXT NOT NULL,
  valor_antes NUMERIC NOT NULL,
  meta_esperada NUMERIC NOT NULL,
  valor_depois NUMERIC,
  percentual_ganho NUMERIC,
  meta_atingida BOOLEAN DEFAULT FALSE,
  impacto_descricao TEXT,
  status TEXT NOT NULL DEFAULT 'Aberto',
  padronizado BOOLEAN DEFAULT FALSE,
  padronizacao_descricao TEXT,
  criado_por TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_conclusao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT
);

ALTER TABLE planos_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all planos_acao for authenticated" ON planos_acao;
CREATE POLICY "Allow all planos_acao for authenticated" ON planos_acao
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cases_melhoria (
  id TEXT PRIMARY KEY,
  plano_acao_id TEXT REFERENCES planos_acao(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  setor TEXT NOT NULL,
  problema TEXT NOT NULL,
  analise_causa TEXT NOT NULL,
  acao_implementada TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  valor_antes NUMERIC NOT NULL,
  valor_depois NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  ganho_percentual NUMERIC NOT NULL,
  impacto_operacional TEXT NOT NULL,
  aprendizados TEXT NOT NULL,
  status_padronizacao TEXT NOT NULL DEFAULT 'Padronizado no POP'
);

ALTER TABLE cases_melhoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all cases_melhoria for authenticated" ON cases_melhoria;
CREATE POLICY "Allow all cases_melhoria for authenticated" ON cases_melhoria
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

