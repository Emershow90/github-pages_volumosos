# 📚 DOCUMENTAÇÃO – MÓDULOS OPERACIONAIS E BANCO DE DADOS

## Torre de Comando Volumosos – Radar Live, Previsão de Atrasos e Estratégia de Coleta

---

## 🧭 ÍNDICE

1. [Visão Geral do Radar Live](#visão-geral-do-radar-live)
2. [Banco de Dados – Estrutura SQL](#banco-de-dados--estrutura-sql)
3. [Módulo de Importação de Dados](#módulo-de-importação-de-dados)
4. [Previsão de Atrasos](#previsão-de-atrasos)
5. [Expedição – Radar de Lojas](#expedição--radar-de-lojas)
6. [Estratégia de Coleta (Bolsão D+1)](#estratégia-de-coleta-bolsão-d1)
7. [Conexões com Banco de Dados](#conexões-com-banco-de-dados)
8. [Fluxo de Dados e Sincronização](#fluxo-de-dados-e-sincronização)

---

## 📌 VISÃO GERAL DO RADAR LIVE

O **Radar Live** é o módulo central de monitoramento operacional do sistema, responsável por:

- ✅ Exibir em tempo real o status de todas as lojas/rotas
- ✅ Controlar o fluxo operacional: **Soltura → Coleta → Carga → Expedição**
- ✅ Prever atrasos com base em cortes e horários
- ✅ Importar programações via OCR/JSON/planilhas
- ✅ Gerenciar a estratégia de coleta (Bolsão D+1)

**Acesso:** Disponível para Admin, Coordenador, Operador e Operação.

---

## 🗄️ BANCO DE DADOS – ESTRUTURA SQL

### Tabelas Principais do Supabase/PostgreSQL

```sql
-- =============================================
-- 1. STORE MASTER – Cadastro de Lojas
-- =============================================
CREATE TABLE store_master (
  id TEXT PRIMARY KEY,                  -- Código da loja (ex: 2722)
  nome TEXT NOT NULL,                   -- Nome da loja
  cidade TEXT,                          -- Cidade
  uf TEXT,                              -- Estado (SP, SC, PR, etc.)
  transportadora_padrao TEXT,           -- Transportadora padrão
  observacoes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. STORE OPERATIONS – Operações Diárias
-- =============================================
CREATE TABLE store_operations (
  id TEXT PRIMARY KEY,                  -- lojaId_data_setor (ex: 2722_2026-07-05_S87)
  programacao_id TEXT NOT NULL,         -- Data de programação
  loja_id TEXT NOT NULL,                -- Referência ao store_master
  nome_loja TEXT NOT NULL,              -- Nome da loja (denormalizado)
  setor TEXT NOT NULL,                  -- S87, S88, S89, S90
  transportadora TEXT,
  corte TEXT NOT NULL,                  -- Horário de corte (HH:MM)
  carregamento TEXT NOT NULL,           -- Horário de carregamento (HH:MM)
  volumes INTEGER DEFAULT 0,
  enderecos INTEGER DEFAULT 0,
  atividade_relacionada TEXT,           -- Picking, Volumosos, Colis

  -- Status do Fluxo
  status_soltura TEXT DEFAULT 'Não Solta',
  horario_soltura TEXT,
  solto_por TEXT,

  status_coleta TEXT DEFAULT 'Não iniciada',
  horario_coleta TEXT,
  coletado_por TEXT,

  status_carregamento TEXT DEFAULT 'Não carregada',
  horario_carregamento TEXT,
  carregado_por TEXT,

  status_expedicao TEXT DEFAULT 'Pendente',
  perdeu_corte BOOLEAN DEFAULT FALSE,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- =============================================
-- 3. ATIVIDADE LOJA – Granularidade de Coleta
-- =============================================
CREATE TABLE atividade_loja (
  id TEXT PRIMARY KEY,
  programacao_id TEXT NOT NULL,
  loja_id TEXT NOT NULL,
  setor TEXT NOT NULL,
  tipo_atividade TEXT NOT NULL,         -- Picking, Volumosos, Colis
  colis_programados INTEGER DEFAULT 0,
  colis_coletados INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. LISTA COLETA – Importação (Legado)
-- =============================================
CREATE TABLE lista_coleta (
  lista TEXT PRIMARY KEY,               -- Identificador da lista
  loja TEXT NOT NULL,
  setor INTEGER NOT NULL,
  corte TEXT NOT NULL,
  carregamento TEXT NOT NULL,
  transportadora TEXT,
  volumes INTEGER DEFAULT 0,
  enderecos INTEGER DEFAULT 0,
  atividade_relacionada TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. RADAR LOJAS STATUS – Status das Listas (Legado)
-- =============================================
CREATE TABLE radar_lojas_status (
  lista TEXT PRIMARY KEY,
  status_soltura TEXT DEFAULT 'Não Solta',
  horario_soltura TEXT,
  solto_por TEXT,
  status_coleta TEXT DEFAULT 'Não iniciada',
  horario_coleta TEXT,
  coletado_por TEXT,
  status_carregamento TEXT DEFAULT 'Não carregada',
  horario_carregamento TEXT,
  carregado_por TEXT,
  status_expedicao TEXT DEFAULT 'Pendente',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);
```

---

## 📥 MÓDULO DE IMPORTAÇÃO DE DADOS

### Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Assistente OCR** | Reconhecimento de texto de relatórios de transporte |
| **JSON Import** | Importação estruturada via JSON |
| **CSV/XLSX Import** | Upload de planilhas com mapeamento automático |
| **Migração Legado** | Conversão de dados antigos para novo modelo |

### Formatos Suportados

| Formato | Extensão | Descrição |
|---------|----------|-----------|
| **Excel** | .xlsx, .xls | Planilhas com cabeçalhos mapeáveis |
| **CSV** | .csv | Arquivos separados por ; ou , |
| **JSON** | .json | Array de objetos estruturados |
| **Texto OCR** | .txt | Relatório copiado/colado |

### Modelo de Dados para Importação

```json
{
  "lista": "L101",
  "loja": "2722 - FLORIPA CONTINENTE",
  "setor": 87,
  "corte": "07:00",
  "carregamento": "07:30",
  "transportadora": "JADLOG",
  "volumes": 1200,
  "enderecos": 45,
  "atividadeRelacionada": "Picking"
}
```

### Estratégias de Atualização

| Estratégia | Comportamento |
|------------|---------------|
| **Merge** (Recomendado) | Atualiza existentes / Insere novos |
| **Overwrite** | Apaga todos os dados atuais e escreve novos |
| **Append** | Apenas adiciona se não existir |
| **Update** | Apenas atualiza cadastrados existentes |

---

## ⏰ PREVISÃO DE ATRASOS

### Cálculo Inteligente de Riscos

O sistema calcula automaticamente o risco de atraso com base em:

| Fator | Descrição |
|-------|-----------|
| **Horário de Corte** | Prazo limite para expedição |
| **Horário Atual** | Hora atual (horário de Brasília) |
| **Status Atual** | Em qual etapa do fluxo a operação está |
| **Volume** | Quantidade de itens a processar |
| **Tempo Restante** | Minutos até o corte |

### Níveis de Risco

| Nível | Cor | Critério |
|-------|-----|----------|
| **Baixo** | 🟢 Verde | Fluxo sob controle, tempo suficiente |
| **Médio** | 🟡 Amarelo | Volume alto ou tempo reduzido (≤ 90 min) |
| **Alto** | 🟠 Laranja | Tempo crítico (≤ 45 min) ou lista retida |
| **Crítico** | 🔴 Vermelho | Corte expirado ou infração de segurança |

### Regras de Negócio (BusinessRules.ts)

```ts
predictRisk(operation): {
  level: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
  reason: string;
}
```

---

## 🚚 EXPEDIÇÃO – RADAR DE LOJAS

### Fluxo Operacional

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SOLTURA   │ →  │   COLETA    │ →  │    CARGA    │ →  │  EXPEDIÇÃO  │
│  (Liberar)  │    │  (Picking)  │    │  (Doca)     │    │  (Envio)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Estados por Etapa

| Etapa | Estados | Transição |
|-------|---------|-----------|
| **Soltura** | Não Solta → Solta | Ação: "Soltar" |
| **Coleta** | Não iniciada → Em andamento → Coletada | Ação: "Coletar" |
| **Carga** | Não carregada → Em andamento → Carregada | Ação: "Carregar" |
| **Expedição** | Pendente → Dentro do horário / Fora do horário | Ação: "Expedir" |

### Visualizações

| Modo | Descrição |
|------|-----------|
| **Agrupado por Loja** | Cards agrupados por loja, com múltiplos setores |
| **Setores Independentes** | Visualização plana por setor |
| **Tabela** | Visão tabular com todos os dados |

---

## 📦 ESTRATÉGIA DE COLETA (BOLSÃO D+1)

### Conceito

O **Bolsão D+1** é a previsão de coleta para o dia seguinte (D+1), permitindo o planejamento antecipado da operação.

### Estrutura de Dados

```ts
interface BolsaoData {
  hojeMeta: number;      // Meta de coleta para hoje
  hojeFeito: number;     // Realizado hoje
  amanhaMeta: number;    // Meta para amanhã (D+1)
  amanhaFeito: number;   // Realizado para amanhã (previsão)
}
```

### Indicadores

| Indicador | Descrição |
|-----------|-----------|
| **Hoje Coleta** | Progresso da coleta atual |
| **Amanhã (D+1)** | Previsão de coleta para o próximo dia |
| **Progresso** | Percentual de avanço (Feito/Meta) |

### Representação Visual

```
Hoje Coleta: ████████████░░░░░░ 8.500 / 12.000 (70%)
Amanhã (D+1): ████░░░░░░░░░░░░ 1.200 / 4.000 (30%)
```

---

## 🔌 CONEXÕES COM BANCO DE DADOS

### Supabase (PostgreSQL)

| Tabela | Função | Sincronização |
|--------|--------|---------------|
| `store_master` | Cadastro de lojas | CRUD via SupabaseRepository |
| `store_operations` | Operações diárias | Realtime via `supabase.channel()` |
| `atividade_loja` | Detalhamento de coleta | Realtime |
| `lista_coleta` | Importação (legado) | CRUD |
| `radar_lojas_status` | Status (legado) | CRUD |

### APIs (Backend Express)

| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/store_operations` | GET/PUT | Operações do Radar |
| `/api/store_master` | GET/PUT | Cadastro de lojas |
| `/api/lista_coleta` | GET/POST/DELETE | Importação |

### Estado Local (Zustand)

| Store | Dados |
|-------|-------|
| `useStoreOperations` | Operações em tempo real |
| `useAtividadeLoja` | Atividades de coleta |
| `useSectorStore` | Setores, radar, reapro, bolsão |

### Cache Offline (IndexedDB)

| Store | Dados |
|-------|-------|
| `store_operations` | Cache de operações |
| `store_master` | Cache de lojas |
| `lista_coleta` | Cache de importações |
| `radar_lojas_status` | Cache de status |

---

## 🔄 FLUXO DE DADOS E SINCRONIZAÇÃO

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE DADOS DO RADAR LIVE                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📥 IMPORTAÇÃO                     🔄 REAL-TIME                 │
│  ┌─────────────┐                  ┌─────────────────────┐       │
│  │ OCR/JSON/   │ ──────────────→ │ Supabase Channel    │       │
│  │ Planilhas   │                  │ (Realtime)          │       │
│  └─────────────┘                  └─────────────────────┘       │
│         │                                    │                   │
│         ▼                                    ▼                   │
│  ┌─────────────────────────────────────────────────┐            │
│  │         STORE OPERATIONS (Zustand)             │            │
│  │         • operations: Record<string, Op>       │            │
│  └─────────────────────────────────────────────────┘            │
│         │                                    │                   │
│         ▼                                    ▼                   │
│  ┌─────────────────┐              ┌─────────────────────┐       │
│  │  RADAR GLOBAL   │              │  Previsão de       │       │
│  │  (setRadar)     │              │  Atrasos (Risk)    │       │
│  └─────────────────┘              └─────────────────────┘       │
│         │                                    │                   │
│         ▼                                    ▼                   │
│  ┌─────────────────────────────────────────────────┐            │
│  │              INTERFACE DO USUÁRIO               │            │
│  │    • Grouped by Store  • Individual  • Table    │            │
│  │    • KPI Overview Bar  • Timeline Indicators    │            │
│  └─────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📌 RESUMO FUNCIONAL

O módulo **Radar Live** é o centro nervoso da operação, integrando:

- ✅ **Importação de dados** via OCR, JSON, CSV e XLSX
- ✅ **Previsão inteligente de atrasos** com base em regras de negócio
- ✅ **Controle de expedição** com fluxo Soltura → Coleta → Carga → Expedição
- ✅ **Estratégia de coleta** com metas diárias e previsão D+1
- ✅ **Sincronização em tempo real** com Supabase/PostgreSQL
- ✅ **Cache offline** via IndexedDB para resiliência

Todas as operações são refletidas em tempo real em todas as abas do sistema (Dashboard, Executivo, Analytics, etc.).

---

**Documentação gerada para o sistema Torre de Comando Volumosos – Radar Live e Módulos Associados.** 🚀
