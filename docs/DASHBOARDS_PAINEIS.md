# 📊 Painéis Operacionais e Relatórios — Torre de Comando Volumosos

Este documento detalha as especificações técnicas, fluxos de dados, componentes interativos, lógica de cálculos e rotinas de exportação do módulo **Painel Operacional** (representado pela aba `painel` e implementado no componente `DashboardTab`) e dos dashboards de monitoramento analítico do sistema.

---

## 🧭 1. Visão Geral do Painel Operacional (`DashboardTab`)

O **Painel Operacional** é a central unificada de inteligência em tempo real e consolidação de produtividade do CD. Ele reúne em uma única tela de monitoramento de alta densidade as métricas de escala da equipe, o pacing físico dos setores, proporções de mix de famílias de produtos e painéis analíticos interativos.

---

## 👥 2. Quadro de Escala & Plantão de Liderança

No topo da aba, exibe-se a escala ativa de comando para o dia atual com base nos dados sincronizados da escala semanal de referentes:

*   **Referente Setor 87**: Líder operacional responsável pelas operações microscópicas do Setor 87.
*   **Referente Volumosos (S88/86/89)**: Responsável pela coordenação dos demais setores de volumosos do CD.
*   **Apoio & Retaguarda**: Colaborador escalado para cobertura de picos de processamento logístico e processos de fechamento diários.
*   **Equipe em Operação (KPI Dinâmico)**:
    *   Faz a contagem dinâmica de operadores cadastrados agrupando-os por status reativo da escala física (`Em Operação`, `Apoio/Reabastecimento`, `Pausa/BH`).

---

## ⚡ 3. Monitor de Setores Ativos

Cada setor possui um card inteligente de acompanhamento de fluxo. O monitor traduz as atividades de processamento logístico agrupando as informações fundamentais da seguinte forma:

### 3.1. Display de Atividade e Coleta
- **Unidade de Medida**: Mapeada automaticamente de acordo com o identificador do setor (Setores `87`/`88`/`89` gerenciam caixas físicas; setores de fluxo leve operam com contagem de **Colis**).
- **Indicador de Atividade**: Volume total de expedição do dia.
- **Blocos de Apoio Integrados**:
  - *Reabastecimento*: Quantidade total de caixas (`CX`) pendentes de reposição física.
  - *Colis Coleta*: Volume pendente ou consolidado de coletas na área de expedição rápida.

### 3.2. Proporção e Mix de Universos de Produtos
Cada setor possui uma barra de progresso segmentada de forma proporcional representando a participação física dos universos na carga total:
- **Alimento (🍎)**: Percentual e quantidade absoluta de caixas/colis de gêneros alimentícios.
- **Montanha (⛰️)**: Participação de produtos esportivos/pesados da família montanha.
- **Categorias Customizadas (Ad-hoc)**: Mapeamento dinâmico de novas famílias inseridas diretamente pelo usuário sem quebra de leiaute ou conflito de tipos.

### 3.3. Grade de 4 KPIs Críticos
- **Promessa (SLA %)**: Índice de pontualidade e conformidade de entregas das transportadoras.
- **UPH (Unidade por Hora)**: Velocidade física instantânea de processamento.
- **BSI (Índice de Balanço)**: Nível de balanceamento físico entre os postos de triagem e separação.
- **Erros**: Quantidade absoluta de desvios, falhas de leitura ou itens extraviados detectados.

---

## ⌨️ 4. Terminal de Comando Operacional (`AI Copil Logistics`)

Para dar máxima agilidade aos operadores e coordenadores, o painel disponibiliza um **Terminal de Comando Retrátil** de baixo nível. Este interpretador de comandos em lote executa calibrações rápidas contornando interfaces visuais complexas.

### 4.1. Sintaxe de Comando Aceita
O interpretador lê e executa expressões regulares no formato:
```bash
S[Número_do_Setor] [Parâmetro_Alvo] para [Novo_Valor]
```

### 4.2. Parâmetros Suportados
*   `promessa` (SLA %): Ex: `S87 promessa para 99.5`
*   `uph` (Produtividade): Ex: `S88 uph para 510`
*   `ativ` (Volume total): Ex: `S89 ativ para 12500`
*   `sla` (Gatilho alternativo): Atualiza o SLA alvo do setor.

---

## 💾 5. Sincronização Batch de Universos de Produtos

Quando o usuário clica no bloco de universos de um setor, um modal de edição abrangente de proporções é aberto. A gravação desses dados é realizada através de um fluxo transacional atômico nas stores do Zustand:

```typescript
// Fluxo do update de Universos
await updateActivityUniversosBatch(sectorId, todayDate, userId, {
  alimento: editAlimento,
  montanha: editMontanha,
  adhocCategories: customObj,
  colis: editColis,
  atividade: editAtividade,
  elog: editElog,
  reapro: `${editReproTotal} CX`,
});
```

Esse fluxo garante que as tabelas de monitoramento em tempo real (`useSectorStore`) e as planilhas de histórico consolidado sejam atualizadas de forma síncrona sem conflitos de concorrência.

---

## 📈 6. Visualização Gráfica Integrada

A seção de análise visual consome dados consolidados de produção e renderiza gráficos responsivos através da biblioteca **Recharts**:

1.  **Histórico de Atividade (Gráfico de Linha)**: Exibe a evolução de volume físico ativo e a variação do UPH do CD nos últimos 14 dias de operação.
2.  **Produtividade Comparativa (Gráfico de Barras)**: Apresenta o UPH atual de cada setor confrontado diretamente com a respectiva meta estabelecida (meta de 520 para S87, 480 para S88, e 450 para volumosos gerais).
3.  **Mix de Carga (Gráfico de Pizza/Composição)**: Desdobramento das frações físicas de distribuição entre Alimentos, Vestuário e Universos customizados ativos no dia de trabalho.

---

## 📤 7. Exportação para Google Sheets

Para auditorias e apresentações gerenciais, o painel integra-se nativamente com a API de planilhas do Google Workspace via fluxo client-side assíncrono:

- **Dados Exportados**: Quadro de metas físicas dos setores, escala ativa de colaboradores do turno, indicadores históricos consolidados e limites de capacidade das docas.
- **Garantia de Segurança**: A aquisição de token OAuth ocorre estritamente do lado do cliente (via Google Identity Services) e é injetada no cabeçalho de requisição como `Authorization: Bearer <token>`, blindando chaves privadas de servidor de qualquer exposição.
