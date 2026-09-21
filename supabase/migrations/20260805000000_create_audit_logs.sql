-- ============================================================================
-- CRIAÇÃO DA TABELA DE AUDIT LOGS PARA RASTREAMENTO OPERACIONAL DE AÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  acao TEXT NOT NULL,
  usuario TEXT NOT NULL,
  campo TEXT,
  dispositivo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política de Acesso para usuários da aplicação
DROP POLICY IF EXISTS "Acesso total audit_logs" ON public.audit_logs;
CREATE POLICY "Acesso total audit_logs" ON public.audit_logs
  FOR ALL USING (true) WITH CHECK (true);
