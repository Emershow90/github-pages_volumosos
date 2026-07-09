import { KPI } from './KPI';

export interface CopilSectorData {
  setorId: string;
  operacionais: KPI[];
  economico: KPI[];
  seguranca: KPI[];
  lastUpdated: string;
}
