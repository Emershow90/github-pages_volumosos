# Torre de Comando - Operação de Volumosos

Sistema de gestão operacional e monitoramento em tempo real de alta performance para Centro de Distribuição Logístico de Volumosos, com integração ao Supabase, Google Sheets, IndexedDB e Copiloto de Inteligência Artificial Gemini 2.5.

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Módulos da Aplicação](#-módulos-da-aplicação)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Segurança & Performance](#-segurança--performance)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Configuração e Execução](#-configuração-e-execução)
- [Documentação Detalhada](#-documentação-detalhada)

---

## 🎯 Visão Geral

A **Torre de Comando Volumosos** centraliza o controle operacional de separação, picking, carregamento e expedição em 4 setores fundamentais:
- **Setor 87**: Confecção / Volumosos (Pacing de corte e alta volumetria)
- **Setor 88**: Bazar / Linha Leve
- **Setor 89**: Calçados / Especiais
- **Setor 90**: Pesados / Recebimento

### Principais Capacidades:
1. **Console Operacional / Monitor de Setores**: Acompanhamento de metas de UPH, promessa de SLA, universos de produtos (Alimento, Montanha, Colis, Reabastecimento D-All/Elog) e TV de apresentação automatizada.
2. **Radar Live & Risco de Lojas**: Matriz dinâmica de criticidade cruzada com o plano de carregamento e horários de corte de expedição (06:00, 11:00, 14:00, 17:00, 20:00).
3. **Copiloto & Previsão Preditiva Gemini AI**:
   - Geração de planos de ação estratégicos em tempo real (`/api/ai/strategy`).
   - Previsão de volume de carga do dia seguinte pelas 4 etapas operacionais (`Soltura ➔ Coleta ➔ Carga ➔ Expedição`) com dimensionamento de headcount e cálculo de intervalos de confiança (`/api/ai/forecast`).
4. **Persistência Híbrida & Offline First**: Sincronização em tempo real via Supabase/PostgreSQL com fallback automático em IndexedDB e exportação estruturada para o Google Sheets.
5. **Rate Limiting & Telemetria**: Proteção de endpoints contra abusos por IP, controle de concorrência e monitoramento de latência e saúde de infraestrutura.

---

## 🏛️ Arquitetura do Sistema

O projeto adota os princípios de **Clean Architecture**, dividindo responsabilidades de forma estrita:

```
┌────────────────────────────────────────────────────────┐
│                   Camada de Interface                  │
│  src/components/ (ConsoleOperacional, RadarLive, etc.) │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│                  Lógica de Apresentação                │
│  src/hooks/ (useAIStrategy, useAIForecast, etc.)       │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│               Estado Global Reativo (Zustand)          │
│  src/stores/ (useSectorStore, useStoreOperations, etc) │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│            Regras de Negócio & Serviços Puros          │
│  src/services/ (aiForecastService, googleSheets, etc)  │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│             Persistência & Integrações Externas        │
│  src/lib/ (supabaseService, indexedDb, telemetry)      │
│  server.ts (Express API, Rate Limiting, Gemini SDK)    │
└────────────────────────────────────────────────────────┘
```

---

## 📦 Módulos da Aplicação

| Aba / Módulo | Descrição Principal |
| :--- | :--- |
| **Painel / Console Operacional** | Visão holística da produção, cartões detalhados por setor (S87, S88, S89, S90), input de universos de produtos, TV rotativa de apresentação e botões de persistência no banco e Google Sheets. |
| **Radar Live / Lojas** | Matriz de risco operacional das lojas, status de coleta/carregamento, acompanhamento de corte e remanejamento dinâmico de prioridades. |
| **Analytics & Previsão IA** | Dashboard de métricas consolidadas, UPH histórico e painel preditivo Gemini AI analisando Soltura, Coleta, Carga e Expedição. |
| **Histórico & Auditoria** | Registro temporal de registros de produção, logs de auditoria imutáveis com rastreamento de alterações por usuário. |
| **Conexões** | Painel de monitoramento de status das integrações (Supabase, Google Sheets, IndexedDB, Gemini AI). |
| **Admin & Usuários** | Gerenciamento de acessos (RBAC), controle de operadores pendentes e aprovação de permissões. |

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Gerenciamento de Estado**: Zustand (Stores desacopladas e reativas).
- **Backend**: Node.js com Express 5, `tsx`, `esbuild`.
- **Inteligência Artificial**: Google GenAI SDK (`@google/genai`) com modelo `gemini-2.5-flash`.
- **Banco de Dados & Persistência**: Supabase (PostgreSQL), IndexedDB (`idb`), Google Sheets API.
- **Performance & Resiliência**: Rate Limiter por IP em memória, Guardas de recursão/loops, Catálogo de índices SQL 80/20.

---

## 🛡️ Segurança & Performance

- **Rate Limiting por IP**:
  - `120 req/min` para endpoints de API gerais.
  - `30 req/min` para endpoints de IA (Gemini).
- **Resolução de N+1**: Utilitário `batchResolve` e consultas indexadas eliminando sobrecarga no banco.
- **Índices de Banco (80/20)**: Mapeamento em `src/lib/dbPerformanceIndexes.ts` com DDL pronta para execução em `/api/db-indexes`.
- **RBAC Duplo**: Validação simultânea por papel de usuário (Operador, Líder, Coordenador, Admin) e vínculo de setor.

---

## 📂 Estrutura de Pastas

```
├── docs/                             # Documentação técnica e operacional
│   ├── ARQUITETURA.md                # Arquitetura detalhada, fluxo de dados e segurança
│   ├── MANUAL_OPERACIONAL.md         # Guia de uso prático das telas e fluxos
│   ├── BANCO_DE_DADOS_E_INDICES.md   # Modelagem de dados, DDL e otimizações
│   └── RADAR_LIVE.md                 # Arquitetura e regras do módulo Radar Live
├── src/
│   ├── components/                   # Componentes de interface (UI)
│   ├── hooks/                        # Hooks de lógica e apresentação
│   ├── lib/                          # Integrações de baixo nível (DB, Sheets, Telemetria)
│   ├── services/                     # Regras de negócio, cálculos e integrações externas
│   ├── stores/                       # Zustand stores (Estado global único)
│   ├── types/                        # Tipagens estritas TypeScript
│   ├── App.tsx                       # Componente raiz da aplicação
│   └── main.tsx                      # Entrypoint React
├── server.ts                         # Servidor Express com Vite Middleware e API REST
├── package.json                      # Dependências e scripts
└── AGENTS.md                         # Regras de desenvolvimento e fonte da verdade
```

---

## 🚀 Configuração e Execução

### Variáveis de Ambiente (`.env`)
Configure as variáveis necessárias:
```env
# Gemini API Key (Obrigatório para recursos do Copiloto IA)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Supabase (Opcional - caso ausente, o sistema opera via IndexedDB)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### Scripts Disponíveis:
```bash
# Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev

# Validar tipagem TypeScript
npm run lint

# Build de produção (Vite + esbuild CJS server)
npm run build

# Iniciar servidor em produção
npm start
```

---

## 📚 Documentação Detalhada

- [📖 Arquitetura do Sistema](docs/ARQUITETURA.md)
- [🖥️ Manual Operacional & Guia de Uso](docs/MANUAL_OPERACIONAL.md)
- [🗄️ Modelagem de Banco de Dados e Índices](docs/BANCO_DE_DADOS_E_INDICES.md)
- [📡 Módulo Radar Live & Máquina de Estados](docs/RADAR_LIVE.md)
