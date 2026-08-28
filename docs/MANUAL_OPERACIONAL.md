# 🖥️ Manual Operacional - Torre de Comando Volumosos

Guia de uso passo a passo dos módulos, ferramentas e fluxos da **Torre de Comando Volumosos**.

---

## 📑 Módulos do Sistema

1. [Console Operacional & Monitor de Setores](#1-console-operacional--monitor-de-setores)
2. [Modo Apresentação TV](#2-modo-apresentação-tv)
3. [Radar Live & Matriz de Risco de Lojas](#3-radar-live--matriz-de-risco-de-lojas)
4. [Analytics & Previsão Preditiva IA](#4-analytics--previsão-preditiva-ia)
5. [Histórico & Logs de Auditoria](#5-histórico--logs-de-auditoria)
6. [Conexões & Sincronização Google Sheets](#6-conexões--sincronização-google-sheets)
7. [Administração de Usuários & RBAC](#7-administração-de-usuários--rbac)

---

## 1. Console Operacional & Monitor de Setores

O **Console Operacional** é o centro nervoso da operação diária.

### 1.1. Cards dos Setores (87, 88, 89, 90)
Cada card de setor exibe:
- **Feito Hoje (Realizado)** vs. **Meta / Capacidade**
- **Feito Ontem** e comparativo de pacing
- **Métricas de Máquina e Rafale**
- **Universos de Produtos**:
  - `Alimento`: Volume de itens alimentícios
  - `Montanha`: Volume de itens montanha / volumosos
  - `Colis`: Volume de caixas/pacotes especiais
  - `Reabastecimento`: Caixas em reabastecimento (`D-All` e `Elog`)

### 1.2. Edição Rápida de Universos
1. Clique no botão de edição de um setor no card.
2. Ajuste os valores de **Alimento**, **Montanha**, **Colis** e **Reabastecimento**.
3. Clique em **Salvar Parâmetros**.
4. O sistema atualiza o estado local, persiste os dados no banco e gera automaticamente um log de auditoria.

### 1.3. Ações no Cabeçalho
- **Sincronizar Banco**: Força a gravação em lote de todos os 4 setores na tabela `painel_producao` e `activity_entries`.
- **Gravar Planilha**: Exporta os dados consolidados para a planilha Google Sheets vinculada.
- **Exportar CSV**: Gera um download instantâneo de contingência em formato CSV.
- **Upload de Planilha / Drag & Drop**: Arraste um arquivo `.xlsx` ou `.csv` para alimentar a matriz com arquivos operacionais.

---

## 2. Modo Apresentação TV

Projetado para exibição em TVs e telões no chão de fábrica:
- **Ciclo Automático**: Alterna entre a visualização geral e os cards detalhados a cada 8 segundos.
- **Botão Modo Apresentação**: Inicia ou pausa a rotação automática.
- **Fita COPIL / Matriz de Performance**: Faixa superior com resumo das metas de UPH, produtividade média e promessas de entrega.

---

## 3. Radar Live & Matriz de Risco de Lojas

O módulo **Radar Live** acompanha as ordens de separação por loja cruzando com o plano de carregamento:
- **Status Operacionais**: `Pendente`, `Em Coleta`, `Finalizado`, `Carregado`, `Expedido`.
- **Janelas de Corte**: 06:00, 11:00, 14:00, 17:00, 20:00.
- **Matriz de Risco**:
  - 🔴 **Crítico**: Lojas com menos de 60 minutos para o corte sem coleta concluída.
  - 🟡 **Atenção**: Lojas com carregamento em atraso em relação à grade.
  - 🟢 **No Prazo**: Lojas com separação e expedição dentro do cronograma planejado.

---

## 4. Analytics & Previsão Preditiva IA

Acessível na aba **Analytics** ou pelo modal do Copiloto IA:

### 4.1. Copiloto Estratégico Gemini (`/api/ai/strategy`)
- Avalia os desvios de UPH em tempo real.
- Emite sugestões de remanejamento de colaboradores entre setores (ex: mover 3 operadores do Setor 90 para o Setor 87 para mitigar pico de corte).
- Lista gargalos iminentes e planos de ação táticos.

### 4.2. Previsão de Carga do Dia Seguinte (`/api/ai/forecast`)
- Projeta o volume das 4 etapas de fluxo:
  1. **Soltura** (liberação de picking)
  2. **Coleta** (separação física)
  3. **Carga** (paletização e carregamento)
  4. **Expedição** (saída dos caminhões)
- Calcula o **Headcount Recomendado** por turno e o **Intervalo de Confiança (P10 / P50 / P90)**.

---

## 5. Histórico & Logs de Auditoria

- **Histórico de Produção**: Permite filtrar a produtividade por semana, data e setor.
- **Trilha de Auditoria**: Registra quem realizou qualquer alteração, data/hora, valor anterior e valor novo (ex: alterações de universos de produtos ou metas de UPH).

---

## 6. Conexões & Sincronização Google Sheets

Na aba **Conexões**, o operador pode:
- Verificar a integridade das conexões com **Supabase**, **IndexedDB** e **Google Sheets**.
- Configurar ID da Planilha Google (`Spreadsheet ID`).
- Testar a comunicação em tempo real e visualizar a latência das APIs.

---

## 7. Administração de Usuários & RBAC

- **Cadastro com Status Pendente**: Novos usuários cadastrados ficam no status `Pendente` até aprovação por um Administrador/Coordenador.
- **Papéis Disponíveis**:
  - `Administrador`: Acesso irrestrito a configurações, auditoria e usuários.
  - `Coordenador`: Aprovação de escala, metas globais e remanejamento.
  - `Líder de Setor`: Edição de universos e apontamentos do seu setor.
  - `Operador`: Consulta ao painel e TV.
