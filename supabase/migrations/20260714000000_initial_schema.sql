-- ============================================================================
-- ARQUITETURA DE BANCO DE DADOS - TORRE DE COMANDO VOLUMOSOS (SUPABASE)
-- SCHEMA REESTRUTURADO E REFATORADO
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES & CONFIGURAÇÕES INICIAIS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. CRIAÇÃO DAS TABELAS
-- ============================================================================

-- Tabela: store_master (Cadastro mestre de lojas parceiras e transportadoras)
CREATE TABLE IF NOT EXISTS public.store_master (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  "transportadoraPadrao" TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: setores (Setores operacionais e suas respectivas metas e métricas)
CREATE TABLE IF NOT EXISTS public.setores (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  resp TEXT NOT NULL,
  "fotoLider" TEXT,
  meta DECIMAL(10,2) NOT NULL,
  horario TEXT,
  situacao TEXT NOT NULL DEFAULT 'Ativo' CHECK (situacao IN ('Ativo', 'Inativo')),
  ativ DECIMAL(10,2),
  promessa DECIMAL(10,2),
  "varFin" DECIMAL(10,2),
  bsi DECIMAL(10,2),
  "nota5s" DECIMAL(10,2),
  "errosPicking" INTEGER DEFAULT 0,
  "reproTotal" INTEGER DEFAULT 0,
  "infracaoSeguranca" BOOLEAN DEFAULT FALSE,
  "horasDKT" DECIMAL(10,2),
  "poliRec" DECIMAL(10,2),
  rdl DECIMAL(10,2),
  "poliSaid" DECIMAL(10,2),
  coletado DECIMAL(10,2),
  uph DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: lista_coleta (Listas de picking importadas para o fluxo diário)
CREATE TABLE IF NOT EXISTS public.lista_coleta (
  lista TEXT PRIMARY KEY,
  loja TEXT NOT NULL,
  setor INTEGER NOT NULL REFERENCES public.setores(numero) ON DELETE CASCADE,
  corte TEXT NOT NULL,
  carregamento TEXT NOT NULL,
  transportadora TEXT,
  volumes INTEGER DEFAULT 0,
  enderecos INTEGER DEFAULT 0,
  "atividadeRelacionada" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: radar_lojas_status (Estados detalhados de soltura, coleta e expedição)
CREATE TABLE IF NOT EXISTS public.radar_lojas_status (
  lista TEXT PRIMARY KEY REFERENCES public.lista_coleta(lista) ON DELETE CASCADE,
  "statusSoltura" TEXT NOT NULL DEFAULT 'Não Solta',
  "horarioSoltura" TEXT,
  "soltoPor" TEXT,
  "statusColeta" TEXT NOT NULL DEFAULT 'Não iniciada',
  "horarioColeta" TEXT,
  "coletadoPor" TEXT,
  "statusCarregamento" TEXT NOT NULL DEFAULT 'Não carregada',
  "horarioCarregamento" TEXT,
  "carregadoPor" TEXT,
  "statusExpedicao" TEXT NOT NULL DEFAULT 'Pendente',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: store_operations (Operações ativas de expedição e carregamento por loja)
CREATE TABLE IF NOT EXISTS public.store_operations (
  id TEXT PRIMARY KEY,
  "programacaoId" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL REFERENCES public.store_master(id) ON DELETE CASCADE,
  "nomeLoja" TEXT NOT NULL,
  setor TEXT NOT NULL,
  transportadora TEXT,
  corte TEXT,
  carregamento TEXT,
  volumes INTEGER DEFAULT 0,
  enderecos INTEGER DEFAULT 0,
  "atividadeRelacionada" TEXT,
  "statusSoltura" TEXT NOT NULL DEFAULT 'Não Solta',
  "horarioSoltura" TEXT,
  "soltoPor" TEXT,
  "statusColeta" TEXT NOT NULL DEFAULT 'Não iniciada',
  "horarioColeta" TEXT,
  "coletadoPor" TEXT,
  "statusCarregamento" TEXT NOT NULL DEFAULT 'Não carregada',
  "horarioCarregamento" TEXT,
  "carregadoPor" TEXT,
  "statusExpedicao" TEXT NOT NULL DEFAULT 'Pendente',
  "perdeuCorte" BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: atividade_loja (Histórico e volume de atividades por loja)
CREATE TABLE IF NOT EXISTS public.atividade_loja (
  id TEXT PRIMARY KEY,
  "programacaoId" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL REFERENCES public.store_master(id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  "tipoAtividade" TEXT,
  "colisProgramados" INTEGER NOT NULL DEFAULT 0,
  "colisColetados" INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: usuarios (Perfis de usuários do sistema e controle de acesso RBAC)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Consulta' CHECK (role IN ('admin', 'coordenador', 'operador', 'Consulta')),
  "setoresAutorizados" TEXT[] DEFAULT '{}',
  situacao TEXT NOT NULL DEFAULT 'Pendente' CHECK (situacao IN ('Pendente', 'Ativo', 'Inativo')),
  cargo TEXT NOT NULL DEFAULT 'AGUARDANDO_APROVACAO',
  unidade TEXT NOT NULL DEFAULT 'CD Principal',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: colaboradores (Cadastro e dados de produtividade dos operadores)
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  setor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Afastado', 'Inativo')),
  cargo TEXT DEFAULT 'Operador',
  horas DECIMAL(5,2) DEFAULT 7.20,
  foto TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: escalas (Planejamento de turnos para os colaboradores)
CREATE TABLE IF NOT EXISTS public.escalas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  turno TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Confirmada', 'Ausente', 'Folga')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. CRIAÇÃO DE ÍNDICES OTIMIZADOS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_store_master_nome ON public.store_master(nome);
CREATE INDEX IF NOT EXISTS idx_setores_numero ON public.setores(numero);
CREATE INDEX IF NOT EXISTS idx_lista_coleta_loja ON public.lista_coleta(loja);
CREATE INDEX IF NOT EXISTS idx_lista_coleta_setor ON public.lista_coleta(setor);
CREATE INDEX IF NOT EXISTS idx_store_ops_programacao ON public.store_operations("programacaoId");
CREATE INDEX IF NOT EXISTS idx_store_ops_loja ON public.store_operations("lojaId");
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_colaboradores_nome ON public.colaboradores(nome);
CREATE INDEX IF NOT EXISTS idx_escalas_data ON public.escalas(data);
CREATE INDEX IF NOT EXISTS idx_escalas_colaborador ON public.escalas(colaborador_id);

-- ============================================================================
-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_master_updated_at ON public.store_master;
CREATE TRIGGER update_store_master_updated_at BEFORE UPDATE ON public.store_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_setores_updated_at ON public.setores;
CREATE TRIGGER update_setores_updated_at BEFORE UPDATE ON public.setores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lista_coleta_updated_at ON public.lista_coleta;
CREATE TRIGGER update_lista_coleta_updated_at BEFORE UPDATE ON public.lista_coleta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_radar_lojas_status_updated_at ON public.radar_lojas_status;
CREATE TRIGGER update_radar_lojas_status_updated_at BEFORE UPDATE ON public.radar_lojas_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_operations_updated_at ON public.store_operations;
CREATE TRIGGER update_store_operations_updated_at BEFORE UPDATE ON public.store_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_atividade_loja_updated_at ON public.atividade_loja;
CREATE TRIGGER update_atividade_loja_updated_at BEFORE UPDATE ON public.atividade_loja FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_colaboradores_updated_at ON public.colaboradores;
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_escalas_updated_at ON public.escalas;
CREATE TRIGGER update_escalas_updated_at BEFORE UPDATE ON public.escalas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. CRIAÇÃO DAS VIEWS DE NEGÓCIO (Sincronizadas com o Front)
-- ============================================================================

-- View: view_radar_completo (Consolidação em tempo real do Radar Live)
CREATE OR REPLACE VIEW public.view_radar_completo AS
SELECT 
  lc.lista,
  lc.loja AS nome_loja,
  lc.setor,
  lc.volumes,
  lc.enderecos,
  lc.transportadora,
  lc.corte,
  lc.carregamento,
  rls."statusSoltura" AS "statusSoltura",
  rls."horarioSoltura" AS "horarioSoltura",
  rls."soltoPor" AS "soltoPor",
  rls."statusColeta" AS "statusColeta",
  rls."horarioColeta" AS "horarioColeta",
  rls."coletadoPor" AS "coletadoPor",
  rls."statusCarregamento" AS "statusCarregamento",
  rls."horarioCarregamento" AS "horarioCarregamento",
  rls."carregadoPor" AS "carregadoPor",
  rls."statusExpedicao" AS "statusExpedicao",
  rls.updated_at AS "ultima_atualizacao"
FROM public.lista_coleta lc
LEFT JOIN public.radar_lojas_status rls ON lc.lista = rls.lista;

-- View: view_colaboradores_setor (Visão quantitativa de equipe por setor)
CREATE OR REPLACE VIEW public.view_colaboradores_setor AS
SELECT 
  setor,
  COUNT(*) AS total_colaboradores,
  SUM(CASE WHEN status = 'Ativo' THEN 1 ELSE 0 END) AS ativos,
  SUM(CASE WHEN status = 'Afastado' THEN 1 ELSE 0 END) AS afastados
FROM public.colaboradores
GROUP BY setor;

-- ============================================================================
-- 6. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER para prevenir recursão)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios 
    WHERE id = auth.uid() AND role = 'coordenador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_write_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios 
    WHERE id = auth.uid() AND role IN ('admin', 'coordenador')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. SEGURANÇA DE ACESSO (ROW LEVEL SECURITY - RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas operacionais
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_coleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_lojas_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividade_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;

-- Limpar e redefinir políticas existentes para evitar erros ou duplicações
DO $$ 
DECLARE 
    t_name RECORD;
    p_name RECORD;
BEGIN 
    FOR t_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('usuarios', 'store_master', 'setores', 'lista_coleta', 'radar_lojas_status', 'store_operations', 'atividade_loja', 'colaboradores', 'escalas')
    LOOP 
        FOR p_name IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t_name.tablename
        LOOP 
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(p_name.policyname) || ' ON public.' || quote_ident(t_name.tablename);
        END LOOP;
    END LOOP;
END $$;

-- POLÍTICAS: usuarios
CREATE POLICY select_usuarios ON public.usuarios 
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY insert_usuarios ON public.usuarios 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY update_usuarios ON public.usuarios 
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY delete_usuarios ON public.usuarios 
  FOR DELETE USING (public.is_admin());

-- POLÍTICAS: store_master
CREATE POLICY select_store_master ON public.store_master 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_store_master ON public.store_master 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: setores
CREATE POLICY select_setores ON public.setores 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_setores ON public.setores 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: lista_coleta
CREATE POLICY select_lista_coleta ON public.lista_coleta 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_lista_coleta ON public.lista_coleta 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: radar_lojas_status
CREATE POLICY select_radar_lojas_status ON public.radar_lojas_status 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_radar_lojas_status ON public.radar_lojas_status 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: store_operations
CREATE POLICY select_store_operations ON public.store_operations 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_store_operations ON public.store_operations 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: atividade_loja
CREATE POLICY select_atividade_loja ON public.atividade_loja 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_atividade_loja ON public.atividade_loja 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: colaboradores
CREATE POLICY select_colaboradores ON public.colaboradores 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_colaboradores ON public.colaboradores 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());

-- POLÍTICAS: escalas
CREATE POLICY select_escalas ON public.escalas 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY write_escalas ON public.escalas 
  FOR ALL TO authenticated USING (public.has_write_access()) WITH CHECK (public.has_write_access());
