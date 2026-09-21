-- ============================================================================
-- FASE 2: CORREÇÕES CRÍTICAS DO SUPABASE
-- 1. Recriação e estabilização de audit_logs
-- 2. Correção e adição de colunas em setores
-- 3. RPC get_table_counts de alta performance
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA audit_logs: Garantir chave primária com default e colunas completas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('aud-' || gen_random_uuid()::text),
  acao TEXT NOT NULL,
  usuario TEXT NOT NULL,
  campo TEXT,
  dispositivo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir default caso a tabela já tenha sido criada sem default na coluna id
ALTER TABLE public.audit_logs 
  ALTER COLUMN id SET DEFAULT ('aud-' || gen_random_uuid()::text);

-- Garantir colunas essenciais
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS acao TEXT NOT NULL DEFAULT 'AÇÃO';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS usuario TEXT NOT NULL DEFAULT 'Sistema';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS campo TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS dispositivo TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS valor_anterior TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS valor_novo TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índices de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON public.audit_logs (usuario, created_at DESC);

-- Habilitar RLS e criar política permissiva para logs operacionais
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total audit_logs" ON public.audit_logs;
CREATE POLICY "Acesso total audit_logs" ON public.audit_logs
  FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. TABELA setores: Garantir todas as colunas operacionais (snake_case e aliases)
-- ----------------------------------------------------------------------------
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS coletado DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS colis DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS tipo_operacao TEXT DEFAULT 'PADRAO';
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS fonte_atividade TEXT;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS fonte_colis TEXT;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS exibir_caixas BOOLEAN DEFAULT FALSE;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS exibir_reposicao_caixas BOOLEAN DEFAULT FALSE;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS overrides JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS suggested_metrics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS equipe JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Aliases e colunas alternativas para compatibilidade mútua entre schemas
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS foto_lider TEXT;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS fotolider TEXT;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS var_fin DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS varfin DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS nota_5s DECIMAL(10,2) DEFAULT 100;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS nota5s DECIMAL(10,2) DEFAULT 100;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS erros_picking INTEGER DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS errospicking INTEGER DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS repro_total INTEGER DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS reprototal INTEGER DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS infracao_seguranca BOOLEAN DEFAULT FALSE;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS infracaoseguranca BOOLEAN DEFAULT FALSE;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS horas_dkt DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS horasdkt DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS poli_rec DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS polirec DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS rdl DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS poli_said DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS polisaid DECIMAL(10,2) DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 3. RPC FUNCTION get_table_counts: Contagem agregada instantânea de linhas
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_table_counts()
RETURNS TABLE (
  table_name text,
  row_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  t_record RECORD;
  v_count BIGINT;
BEGIN
  FOR t_record IN
    SELECT c.relname::text AS tname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'v', 'm')
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE '_prisma%'
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', t_record.tname) INTO v_count;
      table_name := t_record.tname;
      row_count := COALESCE(v_count, 0);
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      table_name := t_record.tname;
      row_count := 0;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Permissões para execução da RPC
GRANT EXECUTE ON FUNCTION public.get_table_counts() TO authenticated, anon;
