import { SupabaseService } from '../lib/supabaseService';
import { StoreOperation } from '../types/Store';

export const seedOperations = async () => {
  const todayIso = new Date().toISOString().split('T')[0];
  
  // Format for the time based on current hour to create realistic scenarios
  const now = new Date();
  const currentHour = now.getHours();
  
  // Scenarios for Risk Card
  const scenarios: Partial<StoreOperation>[] = [
    {
      // CRITICAL: late, not started, 1 hour away
      lojaId: "1001", nomeLoja: "Loja Teste Crítico 1", setor: "S87",
      carregamento: `${String(currentHour).padStart(2, '0')}:30`, statusColeta: 'Não iniciada',
      statusCarregamento: 'Não carregada', statusExpedicao: 'Pendente'
    },
    {
      // CRITICAL: late, collected but not loaded, less than 1 hour away
      lojaId: "1002", nomeLoja: "Loja Teste Crítico 2", setor: "S88",
      carregamento: `${String(currentHour).padStart(2, '0')}:45`, statusColeta: 'Coletada',
      statusCarregamento: 'Não carregada', statusExpedicao: 'Pendente'
    },
    {
      // ALERT: in progress, 2 hours away
      lojaId: "1003", nomeLoja: "Loja Teste Alerta 1", setor: "S89",
      carregamento: `${String(currentHour + 1).padStart(2, '0')}:30`, statusColeta: 'Em andamento',
      statusCarregamento: 'Não carregada', statusExpedicao: 'Pendente'
    },
    {
      // NORMAL: collected and 3 hours away
      lojaId: "1004", nomeLoja: "Loja Teste Normal", setor: "S90",
      carregamento: `${String(currentHour + 2).padStart(2, '0')}:30`, statusColeta: 'Coletada',
      statusCarregamento: 'Não carregada', statusExpedicao: 'Pendente'
    },
    {
      // GREEN: already loaded
      lojaId: "1005", nomeLoja: "Loja Teste Concluída", setor: "S91",
      carregamento: `${String(currentHour - 1).padStart(2, '0')}:00`, statusColeta: 'Coletada',
      statusCarregamento: 'Carregada', statusExpedicao: 'Dentro do horário'
    }
  ];

  for (const s of scenarios) {
    const op: StoreOperation = {
      id: `${s.lojaId}_${todayIso}_${s.setor}`,
      programacaoId: todayIso,
      lojaId: s.lojaId!,
      nomeLoja: s.nomeLoja!,
      setor: s.setor!,
      transportadora: "TESTE LOG",
      corte: "12:00",
      carregamento: s.carregamento!,
      volumes: 100,
      enderecos: 20,
      statusSoltura: 'Solta',
      horarioSoltura: new Date().toISOString(),
      soltoPor: 'Admin',
      statusColeta: s.statusColeta as any,
      horarioColeta: s.statusColeta !== 'Não iniciada' ? new Date().toISOString() : null,
      coletadoPor: s.statusColeta !== 'Não iniciada' ? 'Op1' : null,
      statusCarregamento: s.statusCarregamento as any,
      horarioCarregamento: s.statusCarregamento === 'Carregada' ? new Date().toISOString() : null,
      carregadoPor: s.statusCarregamento === 'Carregada' ? 'Op2' : null,
      statusExpedicao: s.statusExpedicao as any,
      perdeuCorte: false,
      updated_at: new Date().toISOString(),
      updated_by: 'SeedScript'
    };
    
    console.log("Seeding operation:", op.id);
    await SupabaseService.upsertRecord('store_operations', op, 'id');
  }
  
  // Also seed corresponding plano_carregamento to match the tests
  for (const s of scenarios) {
    const plano = {
      id: `plano_${s.lojaId}_${todayIso}`,
      data: todayIso,
      codLoja: s.lojaId,
      horaCarregamento: s.carregamento,
      // Fake fields to satisfy PlanoCarregamentoRow interface
      status: "Agendado",
      created_at: new Date().toISOString()
    };
    await SupabaseService.upsertRecord('plano_carregamento', plano, 'id');
  }
  
  alert("Seed concluído! Verifique o Painel Operacional.");
};
