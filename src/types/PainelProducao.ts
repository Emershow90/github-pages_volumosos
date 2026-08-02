export interface PainelProducao {
  id: string;
  sector_id: string; // "87", "88", "89", "90"
  upload_date: string; // ISO date YYYY-MM-DD
  feito_hoje: number; // Coluna W
  feito_ontem: number; // Coluna Y
  maquina_full: number; // Coluna F ("falta liberar")
  rafale_full: number; // Coluna S ("liberado")
  uploaded_by?: string;
  arquivo_nome?: string;
  created_at?: string;
  updated_at?: string;
}
