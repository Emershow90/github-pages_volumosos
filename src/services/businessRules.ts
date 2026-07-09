import { StoreOperation, UserRole } from '../types';

/**
 * Business Rules Engine for Comando Torre
 * Centralizes all KPI definitions, status mappings, and operational transitions.
 */
export class BusinessRules {
  
  /**
   * Validates if an operational action can be executed based on the state machine flow.
   * State Flow: SOLTURA -> COLETA -> CARGA -> EXPEDIÇÃO
   */
  public static validateOperationalFlow(
    operation: StoreOperation,
    action: 'soltura' | 'coleta' | 'carga' | 'expedicao',
    role: UserRole | string,
    userSectors: string[]
  ): { allowed: boolean; message: string } {
    
    // 1. RBAC (Role-Based Access Control) checking
    if (role !== 'admin' && role !== 'coordenador') {
      // For ordinary users, we must check if they are authorized for this sector
      const hasSectorAccess = userSectors.includes(operation.setor);
      if (!hasSectorAccess) {
        return { 
          allowed: false, 
          message: `Sem permissão de acesso ao setor ${operation.setor}.` 
        };
      }
    }

    // 2. State Machine Step Transitions checking
    if (action === 'coleta') {
      if (operation.statusSoltura !== 'Solta') {
        return { 
          allowed: false, 
          message: "Coleta não permitida: A lista precisa ser Solta primeiro pelo Referente." 
        };
      }
    }

    if (action === 'carga') {
      if (operation.statusColeta !== 'Coletada') {
        return { 
          allowed: false, 
          message: "Carregamento não permitido: A Coleta deste setor precisa ser concluída primeiro." 
        };
      }
    }

    if (action === 'expedicao') {
      if (operation.statusCarregamento !== 'Carregada') {
        return { 
          allowed: false, 
          message: "Expedição não permitida: A Carga deste setor precisa ser concluída primeiro." 
        };
      }
    }

    return { allowed: true, message: "Ação autorizada." };
  }

  /**
   * Calculates the performance grade based on meta vs real values.
   * Handles both normal (higher is better) and inverse (lower is better) indicators.
   */
  public static calculateGrade(
    real: number,
    meta: number,
    inverse: boolean = false
  ): { grade: 'A' | 'B' | 'C' | 'D'; colorClass: string; bgClass: string } {
    if (isNaN(real) || isNaN(meta) || meta === 0) {
      return { grade: 'B', colorClass: 'text-zinc-400', bgClass: 'bg-zinc-500/10' };
    }

    const percentage = inverse ? (meta / real) * 100 : (real / meta) * 100;

    if (percentage >= 100) {
      return { grade: 'A', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20' };
    } else if (percentage >= 95) {
      return { grade: 'B', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10 border-blue-500/20' };
    } else if (percentage >= 85) {
      return { grade: 'C', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20' };
    } else {
      return { grade: 'D', colorClass: 'text-red-400', bgClass: 'bg-red-500/10 border-red-500/20' };
    }
  }

  /**
   * Calculates Stock / Inventory Variation
   */
  public static calculateStockAccuracy(meta: number, real: number): number {
    if (meta === 0) return 100;
    const diff = Math.abs(meta - real);
    return Math.max(0, 100 - (diff / meta) * 100);
  }

  /**
   * Calculates Lead Time, detecting whether an operation is delayed.
   */
  public static isDelayed(corteTimeString: string, finishTimeString: string | null): boolean {
    if (!finishTimeString) {
      const nowStr = new Date().toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return nowStr > corteTimeString;
    }
    return finishTimeString > corteTimeString;
  }

  /**
   * Intelligent prediction of delays and risks based on operation state and deadlines.
   */
  public static predictRisk(operation: StoreOperation): { level: 'Baixo' | 'Médio' | 'Alto' | 'Crítico'; reason: string } {
    if (operation.statusExpedicao !== 'Pendente') return { level: 'Baixo', reason: 'Já expedido' };
    
    const now = new Date();
    const timeZone = 'America/Sao_Paulo';
    
    // Parse corte string (HH:MM)
    const [corteH, corteM] = operation.corte.split(':').map(Number);
    if (isNaN(corteH) || isNaN(corteM)) return { level: 'Baixo', reason: 'Sem horário de corte' };

    const nowH = parseInt(now.toLocaleTimeString('pt-BR', { timeZone, hour: '2-digit', hour12: false }));
    const nowM = parseInt(now.toLocaleTimeString('pt-BR', { timeZone, minute: '2-digit', hour12: false }));
    
    const corteTotalMins = (corteH * 60) + corteM;
    const nowTotalMins = (nowH * 60) + nowM;
    const remainingMins = corteTotalMins - nowTotalMins;

    if (remainingMins < 0) return { level: 'Crítico', reason: 'Em atraso' };
    
    if (remainingMins <= 45 && operation.statusColeta !== 'Coletada' && operation.volumes > 1000) {
      return { level: 'Alto', reason: `Faltam ${remainingMins}m p/ coletar alto volume` };
    }

    if (remainingMins <= 30 && operation.statusCarregamento !== 'Carregada') {
      return { level: 'Alto', reason: `Faltam ${remainingMins}m para carregar` };
    }

    if (remainingMins <= 90 && operation.statusSoltura !== 'Solta' && operation.volumes > 500) {
      return { level: 'Médio', reason: `Lista retida, ${remainingMins}m restantes` };
    }

    if (operation.volumes > 3000 && operation.statusColeta !== 'Coletada') {
       return { level: 'Médio', reason: `Volume massivo pendente (${operation.volumes}v)` };
    }

    return { level: 'Baixo', reason: 'Fluxo sob controle' };
  }
}
