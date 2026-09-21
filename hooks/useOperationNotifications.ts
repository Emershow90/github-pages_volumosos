import { useEffect, useRef } from 'react';
import { usePlanoCarregamentoRisk, RiskLevel } from './usePlanoCarregamentoRisk';
import { useNotificationStore } from '../stores/useNotificationStore';

interface OperationSnapshot {
  statusColeta: string;
  statusCarregamento: string;
  statusSoltura: string;
  statusExpedicao: string;
  risk: RiskLevel;
}

export const useOperationNotifications = () => {
  const addToast = useNotificationStore((s) => s.addToast);
  const { operations } = usePlanoCarregamentoRisk();
  const prevOpsRef = useRef<Record<string, OperationSnapshot>>({});
  
  // To avoid firing all notifications on initial load, we track if it's mounted
  const isMountedRef = useRef(false);

  useEffect(() => {
    const prevOps = prevOpsRef.current;
    
    // Update snapshot for next render
    const newSnapshot: Record<string, OperationSnapshot> = {};
    operations.forEach(({ op, risk }) => {
      newSnapshot[op.id] = {
        statusColeta: op.statusColeta,
        statusCarregamento: op.statusCarregamento,
        statusSoltura: op.statusSoltura,
        statusExpedicao: op.statusExpedicao,
        risk: risk
      };
    });
    
    if (!isMountedRef.current) {
      prevOpsRef.current = newSnapshot;
      if (operations.length > 0) {
        isMountedRef.current = true;
      }
      return;
    }

    operations.forEach(({ op, risk }) => {
      const prev = prevOps[op.id];
      if (!prev) {
        // Nova operação detectada
        if (op.statusColeta === 'Não iniciada' && op.statusSoltura === 'Solta') {
          addToast({
            type: 'info',
            title: 'Nova operação',
            message: `Loja ${op.lojaId} aguarda coleta`,
            lojaId: op.lojaId,
            setor: op.setor,
            duration: 4000
          });
        }
        return;
      }

      // Detecta mudanças de status
      if (prev.statusColeta !== op.statusColeta) {
        if (op.statusColeta === 'Em andamento') {
          addToast({
            type: 'info',
            title: 'Coleta iniciada',
            message: `Loja ${op.lojaId} — coleta em andamento`,
            lojaId: op.lojaId,
            setor: op.setor,
            duration: 4000
          });
        } else if (op.statusColeta === 'Coletada') {
          addToast({
            type: 'success',
            title: 'Coleta finalizada',
            message: `Loja ${op.lojaId} — separação concluída`,
            lojaId: op.lojaId,
            setor: op.setor,
            duration: 5000
          });
        }
      }

      if (prev.statusCarregamento !== op.statusCarregamento && op.statusCarregamento === 'Carregada') {
        addToast({
          type: 'success',
          title: 'Carga finalizada',
          message: `Loja ${op.lojaId} — caminhão carregado`,
          lojaId: op.lojaId,
          setor: op.setor,
          duration: 5000
        });
      }

      // Detecta mudança de risco (green -> yellow/red, yellow -> red)
      if (prev.risk !== risk) {
        if (risk === 'red' && prev.risk !== 'red') {
          addToast({
            type: 'critical',
            title: 'Risco Crítico',
            message: `Loja ${op.lojaId} entrou em atraso crítico`,
            lojaId: op.lojaId,
            setor: op.setor,
            duration: 6000
          });
        } else if (risk === 'yellow' && prev.risk === 'green') {
          addToast({
            type: 'warning',
            title: 'Atenção ao Prazo',
            message: `Loja ${op.lojaId} em alerta de horário`,
            lojaId: op.lojaId,
            setor: op.setor,
            duration: 5000
          });
        } else if (risk === 'green' && (prev.risk === 'red' || prev.risk === 'yellow')) {
          addToast({
            type: 'success',
            title: 'Risco Mitigado',
            message: `Loja ${op.lojaId} retornou ao prazo normal`,
            lojaId: op.lojaId,
            setor: op.setor,
            duration: 4000
          });
        }
      }
    });

    prevOpsRef.current = newSnapshot;
  }, [operations, addToast]);
};
