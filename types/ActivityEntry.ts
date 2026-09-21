export interface ActivityEntry {
  id: string;
  sectorId: string;
  activityDate: string; // ISO date YYYY-MM-DD
  userId: string; // UUID
  alimento: number;
  montanha: number;
  l7Mochila: number;
  elog: string; // texto livre, ex: "2J RA FALC (174)"
  reapro: string; // texto livre, ex: "143 CX"
  colis: number;
  atividade?: number; // quantidade da atividade manual
  adhocCategories: Record<string, string | number>; // { "NomeExtra": valor }
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
