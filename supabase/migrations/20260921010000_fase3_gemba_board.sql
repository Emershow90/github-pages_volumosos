-- ============================================================================
-- FASE 3: GEMBA BOARD DIGITAL - TABELA E POLÍTICAS DE ACESSO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gemba_cards (
  id TEXT PRIMARY KEY DEFAULT ('gmb-' || gen_random_uuid()::text),
  categoria TEXT NOT NULL DEFAULT 'Geral',
  descricao TEXT NOT NULL,
  acoes TEXT,
  responsavel TEXT NOT NULL,
  data_alvo DATE,
  identificador TEXT,
  data_id DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'EM CURSO',
  foto_url TEXT,
  arquivado BOOLEAN DEFAULT FALSE,
  historico JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas essenciais caso a tabela já exista
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Geral';
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS descricao TEXT NOT NULL DEFAULT '';
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS acoes TEXT;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS responsavel TEXT NOT NULL DEFAULT 'Não atribuído';
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS data_alvo DATE;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS identificador TEXT;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS data_id DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'EM CURSO';
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS historico JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.gemba_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índices de performance para filtragem rápida
CREATE INDEX IF NOT EXISTS idx_gemba_cards_status ON public.gemba_cards (status, arquivado);
CREATE INDEX IF NOT EXISTS idx_gemba_cards_categoria ON public.gemba_cards (categoria);
CREATE INDEX IF NOT EXISTS idx_gemba_cards_identificador ON public.gemba_cards (identificador);
CREATE INDEX IF NOT EXISTS idx_gemba_cards_data_alvo ON public.gemba_cards (data_alvo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.gemba_cards ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total gemba_cards" ON public.gemba_cards;
CREATE POLICY "Acesso total gemba_cards" ON public.gemba_cards
  FOR ALL USING (true) WITH CHECK (true);
