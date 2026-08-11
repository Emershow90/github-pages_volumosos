# Skill: Radar Live - Arquitetura e Conexões do Sistema

O módulo **Radar Live** é o núcleo de acompanhamento e rastreabilidade das operações de separação e expedição no sistema da Torre de Comando. Ele integra dados estáticos (Plano de Carga) com os fluxos operacionais de chão de fábrica (Soltura, Coleta, Carga, Expedição).

Este documento detalha o funcionamento, fluxo de dados e os contratos de interface do ecossistema do Radar Live.

## 🏗️ 1. Arquitetura em Camadas (Componentes e Conexões)

O ecossistema respeita rigidamente o *Clean Architecture* e possui os seguintes pilares:

### A. Interface / Visão (`src/components/`)
- **`RadarLojasTab.tsx`**: Componente central (View). Atua como orquestrador visual. Fornece modos de exibição dinâmicos (Cards Móveis, Tabela Desktop), lida com importações OCR via wizard e engatilha as transições de status. Não armazena as listas de operações diretamente, consumindo-as a partir da Store.
- **`PlanoCarregamentoRiskCard.tsx`**: Widget analítico responsável por cruzar o horário programado do veículo com o andamento do setor, disparando os visuais de criticidade (Crítico, Alerta, Saudável).

### B. Lógica de Apresentação e Derivação (`src/hooks/`)
- **`usePlanoCarregamentoRisk.ts`**: Hook inteligente que realiza o JOIN lógico em memória entre `StoreOperation` e o array `plano_carregamento`. Recalcula os níveis de risco (Vermelho, Amarelo, Verde, Cinza) sempre que os dados brutos são alterados.

### C. Estado Global - Zustand (`src/stores/`)
- **`useStoreOperations.ts`**: Fonte única da verdade no frontend para o andamento atual das rotas operacionais. Armazena um dicionário de `StoreOperation`.
- **`useAtividadeLoja.ts`**: Armazena as volumetrias e métricas finas (picking, volumosos) por operação e setor.

### D. Regras de Negócio e Serviços (`src/services/`)
- **`businessRules.ts`**: Motor puro de regras.
  - Método `validateOperationalFlow()`: Aplica a máquina de estados rígida (**Soltura → Coleta → Carga → Expedição**) e previne avanço fora de ordem, realizando checagem de RBAC.
  - Métodos `predictRisk()` e `isDelayed()`: Analisam cronogramas e determinam expirações matemáticas baseadas no horário limite (corte).
- **`storeService.ts`**: Serviço de ETL (Extract, Transform, Load) local. Realiza parsing de textos (ex: planilhas OCR coladas na tela), *fuzzy matching* de descrições para localizar a `StoreMaster` correspondente e resolve discrepâncias na inclusão de novas listas de separação.
- **`realtimeSyncService.ts`**: Realiza o *bind* das canais em tempo real (Supabase WebSockets) conectando os eventos do banco diretamente nas chamadas `upsertOperation` da Zustand Store, garantindo latência próxima a zero entre os usuários.

### E. Fonte de Dados e Integração Externa (`src/lib/`)
- **`googleSheetsPublicSource.ts`**: Lib responsável por efetuar fetch em URLs públicas de CSV do Google Sheets, fazer parsing seguro e mapear em arrays (`PlanoCarregamentoRow`).
- **`supabaseService.ts`**: Wrapper responsável pelas operações transacionais ACID (upsertRecord, fetchTable), além de administrar a **fila de offline fallback** quando a rede cai.

---

## 🔁 2. Máquina de Estados Operacional

Qualquer alteração num registro no **Radar Live** exige as validações de transição de estado da classe `BusinessRules`. O ciclo de vida de uma `StoreOperation` é linear:

1. **Soltura**: O referente define que a lista foi liberada fisicamente/sistemicamente. `statusSoltura` vai para `"Solta"`.
2. **Coleta**: O processo físico de picking inicia e encerra. O `statusColeta` transita `"Não iniciada" → "Em andamento" → "Coletada"`.
3. **Carga / Conferência**: A mercadoria vai para as docas. O `statusCarregamento` transita `"Não carregada" → "Em andamento" → "Carregada"`.
4. **Expedição**: O caminhão é liberado. O `statusExpedicao` marca a rota finalizada.

> ⚠️ A UI desabilita os botões sequenciais automaticamente caso a etapa anterior não tenha sido finalizada.

---

## 📡 3. Cruzamento: Operação vs Plano de Carga

O coração do painel analítico baseia-se na interseção (`INNER/LEFT JOIN` virtual em memória):
- A entidade transitória **`StoreOperation`** (Estado de produção e separação atual, tabela `store_operations`).
- A entidade estática de planejamento **`PlanoCarregamentoRow`** (Planilha base consumida de fontes externas, armazenada no cache/banco `plano_carregamento`).

A chave de cruzamento (Foreign Key) utilizada é: **`StoreOperation.lojaId` === `PlanoCarregamentoRow.codLoja`**.

A função `getPlanoRiskLevel` computa o limiar baseado na distância em horas entre o `now()` e o `horaCarregamento`:
- 🔴 **Vermelho (Crítico)**: <= 1h e ainda não coletada, OU <= 2h e coleta não iniciada.
- 🟡 **Amarelo (Atenção)**: <= 1h já coletada (aguardando carga) OU <= 2h em andamento.
- 🟢 **Verde (Normal)**: Operação no prazo.
- ⚪ **Cinza (No-Plan)**: Sem planejamento vinculado para a loja na data de hoje.

---

## 🔒 4. Modelagem de Dados Resumida (`src/types/Store.ts`)

```typescript
export interface StoreOperation {
  id: string; // Composto: "Loja_Data_Setor" (ex: "2350_2026-08-10_S87")
  programacaoId: string; // Data ISO ("2026-08-10")
  lojaId: string; // ID da Filial na Master (ex: "2350")
  nomeLoja: string;
  setor: string;
  
  // Controle de Horários Padrão
  corte: string; 
  carregamento: string; 
  
  // Status de Transição (Máquina de Estados)
  statusSoltura: 'Não Solta' | 'Solta';
  statusColeta: 'Não iniciada' | 'Em andamento' | 'Coletada';
  statusCarregamento: 'Não carregada' | 'Em andamento' | 'Carregada';
  statusExpedicao: 'Pendente' | 'Dentro do horário' | 'Dentro da tolerância' | 'Fora do horário';
}
```

## 🛠 5. Padrões de Implementação (Do's and Don'ts)

*   **DON'T**: Inserir lógica de parsing de planilhas dentro dos arquivos da UI (`RadarLojasTab.tsx`). Use `googleSheetsPublicSource.ts` e `storeService.ts`.
*   **DON'T**: Utilizar polling (`setInterval`) para atualizar a listagem de operações. **SEMPRE** confie no `useStoreOperations` que já está escutando o Supabase Realtime via `realtimeSyncService`.
*   **DO**: Usar seletores do Zustand ou `useMemo` para computações de dados derivados na interface visual (como no cálculo de filtros e KPIs baseados em risco) para evitar re-renders desnecessários de componentes React.
*   **DO**: Em qualquer nova evolução, se for manipular status de roteiro, adicionar as regras em `BusinessRules.validateOperationalFlow` e não no componente React do botão.
