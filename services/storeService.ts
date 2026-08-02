import { SupabaseService } from '../lib/supabaseService';
import { auth } from '../lib/supabaseAuth';
import { StoreMaster, StoreOperation, AtividadeLoja, ParsedProgramRow, Setor } from '../types';
import { masterCadastroLojas } from '../initialData';

export class StoreService {
  
  /**
   * Initializes master store database. If empty, seeds with initial data.
   */
  public static async initMasterStores(): Promise<StoreMaster[]> {
    try {
      await SupabaseService.garantirAuthPronto();
      if (!auth.currentUser) {
        console.warn('[StoreService] Usuário não está autenticado. Ignorando seeding/inicialização do store_master.');
        return [];
      }

      const existing = await SupabaseService.fetchTable<StoreMaster>('store_master', []);
      if (existing && existing.length > 0) {
        return existing;
      }
      
      // Seed master stores
      const seeds: StoreMaster[] = masterCadastroLojas.map((m) => ({
        id: m.id,
        nome: m.nome,
        cidade: m.id === "2722" ? "Florianópolis" : m.id === "2360" ? "Osasco" : m.id === "1250" ? "São José dos Campos" : m.id === "1540" ? "Curitiba" : m.id === "1990" ? "Porto Alegre" : "Campinas",
        uf: m.id === "2722" ? "SC" : m.id === "1540" ? "PR" : m.id === "1990" ? "RS" : "SP",
        transportadoraPadrao: "JADLOG",
        observacoes: "Importado via inicialização padrão"
      }));

      for (const s of seeds) {
        await SupabaseService.upsertRecord('store_master', s, 'id');
      }
      return seeds;
    } catch (e) {
      console.error('Error seeding store master', e);
      return [];
    }
  }

  /**
   * Parses raw copy-pasted OCR text or program files.
   * Matches against StoreMaster and reports alignment / discrepancies.
   */
  public static async parseOcrText(text: string, dateStr: string): Promise<{
    rows: ParsedProgramRow[];
    discrepancies: { row: ParsedProgramRow; type: 'not_found' | 'divergent'; currentName?: string }[];
  }> {
    const lines = text.split('\n');
    const rows: ParsedProgramRow[] = [];
    const discrepancies: { row: ParsedProgramRow; type: 'not_found' | 'divergent'; currentName?: string }[] = [];
    
    // Fetch current master stores to check matches
    const masterStores = await SupabaseService.fetchTable<StoreMaster>('store_master', []);

    for (const line of lines) {
      if (!line.trim() || line.startsWith('==')) continue;
      
      // Parse key:value or key|value format
      const parts = line.split(/[|;]/).map(p => p.trim());
      let corte = "12:00";
      let carregamento = "15:00";
      let lojaField = "";
      let sectorField = "S87"; // Default sector
      let vol = 100;
      let end = 5;
      let trans = "JADLOG";
      
      parts.forEach((p) => {
        const colonIdx = p.indexOf(':');
        if (colonIdx === -1) return;
        const key = p.slice(0, colonIdx).trim().toUpperCase();
        const val = p.slice(colonIdx + 1).trim();
        
        if (key === 'CORTE') corte = val;
        if (key === 'LOJA') lojaField = val;
        if (key === 'SETOR') sectorField = val.startsWith('S') ? val : `S${val}`;
        if (key === 'VOL' || key === 'VOLUMES') vol = parseInt(val) || 0;
        if (key === 'END' || key === 'ENDERECOS') end = parseInt(val) || 0;
        if (key === 'CARGA' || key === 'CARREGAMENTO') carregamento = val;
        if (key === 'TRANS' || key === 'TRANSPORTADORA') trans = val;
      });

      if (!lojaField) continue;

      // Extract store code (e.g. "2722 - FLORIPA CONTINENTE" -> "2722")
      let storeCode = lojaField.split('-')[0].trim();
      let storeName = lojaField.includes('-') ? lojaField.split('-').slice(1).join('-').trim() : lojaField;

      // Ensure code is formatted correctly
      if (!storeCode || isNaN(Number(storeCode))) {
        // Fallback or use as is
        storeCode = storeCode || "9999";
      }

      const matchedStore = masterStores.find(m => m.id === storeCode);

      const parsedRow: ParsedProgramRow = {
        lojaId: storeCode,
        nomeLoja: storeName,
        cidade: matchedStore?.cidade || "Cidade Desconhecida",
        uf: matchedStore?.uf || "SP",
        setor: sectorField,
        corte,
        carregamento,
        transportadora: trans,
        volumes: vol,
        enderecos: end,
        dataProgramacao: dateStr,
        atividadeRelacionada: sectorField === 'S87' ? 'Picking' : sectorField === 'S88' ? 'Volumosos' : 'Colis'
      };

      rows.push(parsedRow);

      if (!matchedStore) {
        discrepancies.push({
          row: parsedRow,
          type: 'not_found'
        });
      } else if (matchedStore.nome.toUpperCase() !== storeName.toUpperCase()) {
        discrepancies.push({
          row: parsedRow,
          type: 'divergent',
          currentName: matchedStore.nome
        });
      }
    }

    return { rows, discrepancies };
  }

  /**
   * Commits imported rows to Firestore, writing StoreMaster if missing, and StoreOperation.
   */
  public static async commitImportedRows(
    rows: ParsedProgramRow[], 
    user: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    for (const row of rows) {
      // 1. Ensure Store Master exists
      const masterStore: StoreMaster = {
        id: row.lojaId,
        nome: row.nomeLoja,
        cidade: row.cidade,
        uf: row.uf,
        transportadoraPadrao: row.transportadora,
        observacoes: "Cadastrado automaticamente via assistente de importação"
      };
      await SupabaseService.upsertRecord('store_master', masterStore, 'id');

      // 2. Write Store Operation (key: lojaId + date + sector)
      const opId = `${row.lojaId}_${row.dataProgramacao}_${row.setor}`;
      const op: StoreOperation = {
        id: opId,
        programacaoId: row.dataProgramacao,
        lojaId: row.lojaId,
        nomeLoja: row.nomeLoja,
        setor: row.setor,
        transportadora: row.transportadora,
        corte: row.corte,
        carregamento: row.carregamento,
        volumes: row.volumes,
        enderecos: row.enderecos,
        atividadeRelacionada: row.atividadeRelacionada,
        
        statusSoltura: 'Não Solta',
        horarioSoltura: null,
        soltoPor: null,

        statusColeta: 'Não iniciada',
        horarioColeta: null,
        coletadoPor: null,

        statusCarregamento: 'Não carregada',
        horarioCarregamento: null,
        carregadoPor: null,

        statusExpedicao: 'Pendente',
        perdeuCorte: false,

        updated_at: timestamp,
        updated_by: user
      };
      await SupabaseService.upsertRecord('store_operations', op, 'id');

      // 3. Write associated AtividadeLoja tracking row
      const ativId = `${row.lojaId}_${row.dataProgramacao}_${row.setor}_coleta`;
      const ativ: AtividadeLoja = {
        id: ativId,
        programacaoId: row.dataProgramacao,
        lojaId: row.lojaId,
        setor: row.setor,
        tipoAtividade: row.atividadeRelacionada || 'Picking',
        colisProgramados: row.volumes,
        colisColetados: 0,
        updated_at: timestamp
      };
      await SupabaseService.upsertRecord('atividade_loja', ativ, 'id');
    }
  }

  /**
   * Migrates legacy lists to the new robust store_master + store_operations models.
   * Treats current snapshot as an initial load.
   */
  public static async migrateLegacyToOperations(user: string): Promise<number> {
    const programacaoId = "2026-07-05"; // Default baseline programming date
    const timestamp = new Date().toISOString();

    try {
      // 1. Fetch current legacy data
      const legacyLists = await SupabaseService.fetchTable<any>('lista_coleta', []);
      const legacyStatuses = await SupabaseService.fetchTable<any>('radar_lojas_status', []);

      if (!legacyLists || legacyLists.length === 0) return 0;

      let migratedCount = 0;

      for (const item of legacyLists) {
        const storeCode = item.loja.includes('-') ? item.loja.split('-')[0].trim() : item.lista;
        const storeName = item.loja.includes('-') ? item.loja.split('-').slice(1).join('-').trim() : item.loja;
        const sectorCode = `S${item.setor}`;

        // Ensure master store exists
        const master: StoreMaster = {
          id: storeCode,
          nome: storeName,
          cidade: "São Paulo", // Defaulted
          uf: "SP",
          transportadoraPadrao: item.transportadora || "JADLOG"
        };
        await SupabaseService.upsertRecord('store_master', master, 'id');

        // Look up corresponding status
        const matchingStatus = legacyStatuses.find((s: any) => s.lista === item.lista) || {
          statusSoltura: 'Não Solta',
          horarioSoltura: null,
          soltoPor: null,
          statusColeta: 'Não iniciada',
          horarioColeta: null,
          coletadoPor: null,
          statusCarregamento: 'Não carregada',
          horarioCarregamento: null,
          carregadoPor: null,
          statusExpedicao: 'Pendente'
        };

        const opId = `${storeCode}_${programacaoId}_${sectorCode}`;
        const op: StoreOperation = {
          id: opId,
          programacaoId,
          lojaId: storeCode,
          nomeLoja: storeName,
          setor: sectorCode,
          transportadora: item.transportadora || "JADLOG",
          corte: item.corte || "12:00",
          carregamento: item.carregamento || "15:00",
          volumes: item.volumes || 100,
          enderecos: item.enderecos || 5,
          atividadeRelacionada: item.atividadeRelacionada || "Picking",

          statusSoltura: matchingStatus.statusSoltura,
          horarioSoltura: matchingStatus.horarioSoltura,
          soltoPor: matchingStatus.soltoPor,

          statusColeta: matchingStatus.statusColeta,
          horarioColeta: matchingStatus.horarioColeta,
          coletadoPor: matchingStatus.coletadoPor,

          statusCarregamento: matchingStatus.statusCarregamento,
          horarioCarregamento: matchingStatus.horarioCarregamento,
          carregadoPor: matchingStatus.carregadoPor,

          statusExpedicao: matchingStatus.statusExpedicao,
          perdeuCorte: matchingStatus.statusExpedicao === 'Fora do horário',

          updated_at: timestamp,
          updated_by: user
        };

        await SupabaseService.upsertRecord('store_operations', op, 'id');

        // Write activity details
        const ativId = `${storeCode}_${programacaoId}_${sectorCode}_coleta`;
        const ativ: AtividadeLoja = {
          id: ativId,
          programacaoId,
          lojaId: storeCode,
          setor: sectorCode,
          tipoAtividade: item.atividadeRelacionada || "Picking",
          colisProgramados: item.volumes || 100,
          colisColetados: matchingStatus.statusColeta === 'Coletada' ? (item.volumes || 100) : 0,
          updated_at: timestamp
        };
        await SupabaseService.upsertRecord('atividade_loja', ativ, 'id');

        migratedCount++;
      }

      return migratedCount;
    } catch (e) {
      console.error("Migration failed:", e);
      return 0;
    }
  }
}
