export enum UserRole {
  Guest = "guest",
  Operador = "operador",
  Coordenador = "coordenador",
  Admin = "admin",
  Referente = "referente",
  Operacao = "operacao",
  Expedicao = "expedicao",
  Consulta = "consulta",
}

export interface Usuario {
  uid?: string;
  email: string;
  nome: string;
  role: UserRole;
  setoresAutorizados: string[]; // e.g., ["S87", "S88"]
  foto?: string;
  cargo?: string;
  unidade?: string;
  situacao: 'Ativo' | 'Inativo' | 'Pendente' | 'Erro';
  aprovado_por?: string;
  data_aprovacao?: string;
}

export interface UserSession {
  user: Usuario | null;
  loading: boolean;
}
