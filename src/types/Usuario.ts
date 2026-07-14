// src/types/Usuario.ts
export enum UserRole {
  Admin = 'Admin',
  Operador = 'Operador',
  Consulta = 'Consulta',
  Supervisor = 'Supervisor',
  Coordenador = 'Coordenador',
  Guest = 'Guest',
  Operacao = 'Operacao',
  Expedicao = 'Expedicao',
  Referente = 'Referente',
}

export interface Usuario {
  id: string; // UUID do Supabase
  email: string;
  nome: string;
  role: UserRole;
  setoresAutorizados: string[];
  situacao: 'Ativo' | 'Pendente' | 'Inativo' | 'Erro';
  cargo: string;
  unidade: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}
