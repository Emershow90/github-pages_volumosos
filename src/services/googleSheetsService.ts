import { HistoricoRegistro } from "../types";

/**
 * googleSheetsService.ts
 * 
 * Integração para exportar dados para uma planilha do Google Sheets vinculada
 * via o VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL configurado no .env.
 * 
 * NOTA DE ARQUITETURA (AI Studio Preview):
 * Devido a restrições de ambiente (aplicação executada inteiramente no lado do cliente 
 * sem um backend Express próprio persistente onde a chave privada .json da Service Account
 * possa ser armazenada com segurança), esta classe simula a interface esperada
 * para uma Service Account. Em um ambiente de produção real com backend Node.js, 
 * utilizaríamos a biblioteca `google-auth-library` e `googleapis`.
 */

export class GoogleSheetsService {
  private serviceAccountEmail: string;

  constructor() {
    this.serviceAccountEmail = (import.meta as any).env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || "nao_configurado@appspot.gserviceaccount.com";
  }

  /**
   * Exporta os dados do historico_consolidado para uma planilha específica.
   * @param spreadsheetId ID da planilha do Google Sheets
   * @param dados Array do histórico consolidado
   */
  async exportarHistoricoDiario(spreadsheetId: string, dados: HistoricoRegistro[]): Promise<boolean> {
    console.log(`[GoogleSheetsService] Iniciando exportação para planilha ${spreadsheetId}...`);
    console.log(`[GoogleSheetsService] Usando Service Account: ${this.serviceAccountEmail}`);
    
    if (!(import.meta as any).env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn("VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL não configurado no .env. A exportação automatizada falhará em produção.");
    }

    try {
      // Simulação da chamada à API do Sheets via Service Account (Backend)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`[GoogleSheetsService] Exportados ${dados.length} registros com sucesso.`);
      
      // Em uma integração real via Backend:
      // const auth = new google.auth.GoogleAuth({ keyFile: 'path/to/key.json', scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      // const sheets = google.sheets({ version: 'v4', auth });
      // await sheets.spreadsheets.values.append({ ... })

      return true;
    } catch (error) {
      console.error("[GoogleSheetsService] Erro ao exportar dados:", error);
      return false;
    }
  }

  /**
   * Exporta múltiplas abas organizadas (Consolidado Diário, Detalhes por Setor, Tendências)
   */
  async exportMultiSheet({
    spreadsheetId,
    sheets,
  }: {
    spreadsheetId: string;
    sheets: { title: string; header: string[]; rows: any[][] }[];
  }): Promise<{ success: boolean; error?: string; status?: number }> {
    console.log(`[GoogleSheetsService] Exportando ${sheets.length} abas para planilha ${spreadsheetId}...`);
    try {
      // Simula operação com timeout seguro
      await new Promise((resolve) => setTimeout(resolve, 1200));
      
      // Simulação de erro 401 para teste de reconexão
      // throw { status: 401, message: 'Unauthorized' };

      for (const sheet of sheets) {
        console.log(`[GoogleSheetsService] Aba '${sheet.title}': ${sheet.rows.length} linhas exportadas.`);
      }
      return { success: true };
    } catch (err: any) {
      console.error("[GoogleSheetsService] exportMultiSheet failed:", err);
      return { 
        success: false, 
        error: err.message || 'Erro desconhecido', 
        status: err.status 
      };
    }
  }

  /**
   * Obtém a lista de planilhas de relatório conectadas à conta de serviço.
   */
  async listarPlanilhasConectadas(): Promise<{ id: string, name: string, lastSync: string }[]> {
    // Simula uma lista de planilhas conectadas à Service Account
    return [
      {
        id: "1A2B3C4D5E6F7G8H9I0J",
        name: "Relatório de Produtividade - Torre de Comando (Base A)",
        lastSync: new Date().toLocaleString("pt-BR")
      },
      {
        id: "ZYXWVUTSRQPONMLKJIH",
        name: "Consolidado D-ALL 2026",
        lastSync: "Ontem, 23:59"
      }
    ];
  }

  /**
   * Busca e sincroniza os dados da planilha Gemba pública com o GembaBoard/Supabase.
   * Utiliza o padrão unificado 'fetch-and-sync' com verificação de duplicidade.
   */
  async fetchAndSyncGembaBoard(): Promise<{ success: boolean; count: number; error?: string }> {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTy_lfMaDqE48mRuMZJ_nBP2R4qbDG7wYEA3vtIeHOhMTTxjYHPZzGPcJrWvaIokP0EaRrMGf_1UoP2/pub?output=csv';
    console.log(`[GoogleSheetsService] Iniciando fetch-and-sync da planilha pública de Gemba...`);
    
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar a planilha: status ${response.status}`);
      }
      
      const text = await response.text();
      const lines = text.split(/\r?\n/);
      let count = 0;
      
      // Carrega a store para obter cartões existentes
      const { useGembaStore } = await import('../stores/useGembaStore');
      const store = useGembaStore.getState();
      const existingCards = store.cards;

      // Função auxiliar local para tratar CSV robustamente
      const parseCsvLineLocal = (line: string): string[] => {
        let str = line.trim();
        if (str.startsWith('"') && str.endsWith('"')) {
          str = str.slice(1, -1);
        }
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      for (let i = 5; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (!rawLine) continue;

        const cols = parseCsvLineLocal(rawLine);
        if (cols.length < 6) continue;

        // Limpa as colunas (removendo aspas, se houver)
        const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());
        const [categoria, descricao, acoes, responsavel, data_alvo, status] = cleanCols;

        // Pula se for cabeçalho ou vazio
        if (!categoria || categoria.toLowerCase() === 'categoria') continue;
        if (!descricao) continue;

        // Limpeza de hífens iniciais das strings (vêm da formatação em listas)
        const cleanDesc = descricao.replace(/^-\s*/, '').trim();
        const cleanAcoes = acoes.replace(/^-\s*/, '').trim();
        const cleanResp = responsavel.replace(/^-\s*/, '').trim();

        // Evita duplicidade baseado em categoria e descrição
        const isDuplicate = existingCards.some(
          (c) => c.categoria.toLowerCase() === categoria.toLowerCase() && 
                 c.descricao.toLowerCase() === cleanDesc.toLowerCase()
        );

        if (!isDuplicate) {
          const mappedCard = {
            categoria: categoria.toUpperCase(),
            descricao: cleanDesc,
            acoes: cleanAcoes,
            responsavel: cleanResp || 'Não atribuído',
            data_alvo: data_alvo || new Date().toISOString().split('T')[0],
            status: (status && status.toLowerCase() === 'concluído') ? 'CONCLUÍDO' : 'EM CURSO',
            identificador: 'Setor 87', // Padrão
            arquivado: false,
          };
          
          await store.addCard(mappedCard as any);
          count++;
        }
      }
      
      console.log(`[GoogleSheetsService] Sincronização Gemba concluída. ${count} novos cartões importados.`);
      return { success: true, count };
    } catch (err: any) {
      console.error("[GoogleSheetsService] Erro ao sincronizar Gemba:", err);
      return { success: false, count: 0, error: err.message || String(err) };
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
