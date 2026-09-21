export type ConexaoTipo = 'google_sheets' | 'postgres' | 'api_rest';
export type ConexaoStatus = 'online' | 'offline' | 'pendente';

export interface ConexaoConfig {
  sheetId?: string;
  gid?: string;
  mapeamentoColunas?: Record<string, string>;
  frequencia?: 'horaria' | 'diaria' | 'semanal' | 'manual';
  [key: string]: unknown;
}

export interface Conexao {
  id: string;
  nome: string;
  tipo: ConexaoTipo;
  url?: string;
  credenciais?: Record<string, unknown>;
  configuracao?: ConexaoConfig;
  destino: string;
  status: ConexaoStatus;
  ultima_sincronizacao?: string;
  registros: number;
  created_at?: string;
  updated_at?: string;
}

export interface SyncLog {
  id: string;
  conexao_id: string;
  data_inicio: string;
  data_fim?: string;
  status: 'sucesso' | 'erro';
  registros_afetados: number;
  mensagem_erro?: string;
  created_at?: string;
}
