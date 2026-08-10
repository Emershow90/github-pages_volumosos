CREATE TABLE public.plano_carregamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  dia_semana TEXT,
  hora_carregamento TEXT,
  cod_loja TEXT,
  nome_loja TEXT,
  fonte TEXT DEFAULT 'google_sheets_publico',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_plano_carregamento_unique ON public.plano_carregamento(data, cod_loja, hora_carregamento);

ALTER TABLE public.plano_carregamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_plano_carregamento" ON public.plano_carregamento
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "insert_plano_carregamento" ON public.plano_carregamento
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND LOWER(role) IN ('coordenador', 'admin'))
  );

CREATE POLICY "update_plano_carregamento" ON public.plano_carregamento
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND LOWER(role) IN ('coordenador', 'admin'))
  );

CREATE POLICY "delete_plano_carregamento" ON public.plano_carregamento
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND LOWER(role) IN ('coordenador', 'admin'))
  );
