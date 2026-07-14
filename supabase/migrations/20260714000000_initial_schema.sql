-- ============================================
-- MIGRAÇÃO INICIAL - SUPABASE
-- ============================================

-- store_master
CREATE TABLE IF NOT EXISTS store_master (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  transportadoraPadrao TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- setores
CREATE TABLE IF NOT EXISTS setores (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL,
  nome TEXT NOT NULL,
  resp TEXT NOT NULL,
  fotoLider TEXT,
  meta DECIMAL(10,2) NOT NULL,
  horario TEXT,
  situacao TEXT NOT NULL DEFAULT 'Ativo',
  ativ DECIMAL(10,2),
  promessa DECIMAL(10,2),
  varFin DECIMAL(10,2),
  bsi DECIMAL(10,2),
  nota5s DECIMAL(10,2),
  errosPicking INTEGER,
  reproTotal INTEGER,
  infracaoSeguranca BOOLEAN DEFAULT FALSE,
  horasDKT DECIMAL(10,2),
  poliRec DECIMAL(10,2),
  rdl DECIMAL(10,2),
  poliSaid DECIMAL(10,2),
  coletado DECIMAL(10,2),
  uph DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- lista_coleta
CREATE TABLE IF NOT EXISTS lista_coleta (
  lista TEXT PRIMARY KEY,
  loja TEXT NOT NULL,
  setor INTEGER NOT NULL,
  corte TEXT NOT NULL,
  carregamento TEXT NOT NULL,
  transportadora TEXT,
  volumes INTEGER,
  enderecos INTEGER,
  atividadeRelacionada TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- radar_lojas_status
CREATE TABLE IF NOT EXISTS radar_lojas_status (
  lista TEXT PRIMARY KEY REFERENCES lista_coleta(lista) ON DELETE CASCADE,
  statusSoltura TEXT NOT NULL DEFAULT 'Não Solta',
  horarioSoltura TEXT,
  soltoPor TEXT,
  statusColeta TEXT NOT NULL DEFAULT 'Não iniciada',
  horarioColeta TEXT,
  coletadoPor TEXT,
  statusCarregamento TEXT NOT NULL DEFAULT 'Não carregada',
  horarioCarregamento TEXT,
  carregadoPor TEXT,
  statusExpedicao TEXT NOT NULL DEFAULT 'Pendente',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- store_operations
CREATE TABLE IF NOT EXISTS store_operations (
  id TEXT PRIMARY KEY,
  programacaoId TEXT NOT NULL,
  lojaId TEXT NOT NULL REFERENCES store_master(id) ON DELETE CASCADE,
  nomeLoja TEXT NOT NULL,
  setor TEXT NOT NULL,
  transportadora TEXT,
  corte TEXT,
  carregamento TEXT,
  volumes INTEGER,
  enderecos INTEGER,
  atividadeRelacionada TEXT,
  statusSoltura TEXT NOT NULL DEFAULT 'Não Solta',
  horarioSoltura TEXT,
  soltoPor TEXT,
  statusColeta TEXT NOT NULL DEFAULT 'Não iniciada',
  horarioColeta TEXT,
  coletadoPor TEXT,
  statusCarregamento TEXT NOT NULL DEFAULT 'Não carregada',
  horarioCarregamento TEXT,
  carregadoPor TEXT,
  statusExpedicao TEXT NOT NULL DEFAULT 'Pendente',
  perdeuCorte BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- atividade_loja
CREATE TABLE IF NOT EXISTS atividade_loja (
  id TEXT PRIMARY KEY,
  programacaoId TEXT NOT NULL,
  lojaId TEXT NOT NULL REFERENCES store_master(id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  tipoAtividade TEXT,
  colisProgramados INTEGER NOT NULL DEFAULT 0,
  colisColetados INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Consulta',
  setoresAutorizados TEXT[] DEFAULT '{}',
  situacao TEXT NOT NULL DEFAULT 'Pendente',
  cargo TEXT NOT NULL DEFAULT 'AGUARDANDO_APROVACAO',
  unidade TEXT NOT NULL DEFAULT 'CD Principal',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  setor TEXT NOT NULL,
  status TEXT NOT NULL,
  cargo TEXT DEFAULT 'Operador',
  horas DECIMAL(5,2) DEFAULT 7.2,
  foto TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- escalas
CREATE TABLE IF NOT EXISTS escalas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  turno TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_master_nome ON store_master(nome);
CREATE INDEX IF NOT EXISTS idx_setores_numero ON setores(numero);
CREATE INDEX IF NOT EXISTS idx_lista_coleta_loja ON lista_coleta(loja);
CREATE INDEX IF NOT EXISTS idx_store_ops_programacao ON store_operations(programacaoId);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_colaboradores_nome ON colaboradores(nome);
CREATE INDEX IF NOT EXISTS idx_escalas_data ON escalas(data);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_master_updated_at BEFORE UPDATE ON store_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_setores_updated_at BEFORE UPDATE ON setores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lista_coleta_updated_at BEFORE UPDATE ON lista_coleta FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_radar_lojas_status_updated_at BEFORE UPDATE ON radar_lojas_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_operations_updated_at BEFORE UPDATE ON store_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_atividade_loja_updated_at BEFORE UPDATE ON atividade_loja FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escalas_updated_at BEFORE UPDATE ON escalas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES & SECURITY
-- ============================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_usuarios ON public.usuarios;
DROP POLICY IF EXISTS select_usuarios ON public.usuarios;

CREATE POLICY access_usuarios ON public.usuarios 
FOR SELECT 
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY insert_usuarios ON public.usuarios
FOR INSERT
WITH CHECK (true);

CREATE POLICY update_usuarios ON public.usuarios
FOR UPDATE
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

