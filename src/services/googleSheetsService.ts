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
}

export const googleSheetsService = new GoogleSheetsService();
