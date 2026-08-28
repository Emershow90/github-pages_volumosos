# 🏛️ Arquitetura do Sistema - Torre de Comando Volumosos

Este documento detalha o desenho técnico, padrões de projeto, fluxo de dados, proteções de segurança e otimizações de infraestrutura aplicadas na **Torre de Comando Volumosos**.

---

## 1. Princípios Fundamentais (Clean Architecture)

A aplicação foi estruturada seguindo o isolamento de camadas estrito:

```
┌─────────────────────────────────────────────────────────────┐
│                      Camada de UI (React)                   │
│   src/components/                                           │
│   • Componentes puramente visuais e interativos             │
│   • Não realizam chamadas HTTP diretas ou cálculos pesados  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Camada de Apresentação                   │
│   src/hooks/                                                │
│   • Abstrações de estado local, memoizações e seletores     │
│   • Ex: useAIStrategy, useAIForecast, useCopilMetrics       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Estado Global Reativo (Zustand)            │
│   src/stores/                                               │
│   • Centralização de estados sem duplicação de dados        │
│   • Ex: useSectorStore, useStoreOperations, useUserStore   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Serviços & Regras de Negócio             │
│   src/services/                                             │
│   • Algoritmos de cálculo, pacing, heurísticas preditivas   │
│   • Ex: aiForecastService, aiStrategyService, storeService  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Infraestrutura & Persistência              │
│   src/lib/ + server.ts                                      │
│   • Supabase Client, IndexedDB, Google Sheets, Telemetria   │
│   • Express API, Rate Limiters, Gemini SDK Server-Side      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Gerenciamento de Estado Global (Zustand)

O estado da aplicação é desacoplado em stores atômicas para prevenir re-renderizações desnecessárias:

1. **`useSectorStore`**:
   - Dados de capacidade, metas de UPH e promessa dos 4 setores (87, 88, 89, 90).
   - Dados diários de universos de produtos (`activity_entries`): Alimento, Montanha, Colis, Reabastecimento (D-All / Elog).
2. **`useStoreOperations`**:
   - Gestão de operações de lojas do Radar Live.
   - Status de separação/coleta e cruzamentos com plano de carga.
3. **`useCollaboratorStore`**:
   - Cadastro de colaboradores, vínculos com setores e turnos de trabalho.
4. **`useHistoryStore`**:
   - Histórico consolidado de produção e logs de auditoria de alterações.
5. **`useUserStore`**:
   - Identificação do operador logado, perfil de permissão (RBAC) e setor vinculado.
6. **`usePainelProducaoStore`**:
   - Registros diários do Painel de Produção por setor (`painel_producao`).

---

## 3. Segurança e Rate Limiting (Server-Side)

### 3.1. Rate Limiter por IP em Memória (`server.ts`)
Para garantir resiliência e proteção contra sobrecargas ou ataques DoS:
- **Janela Deslizante (Sliding Window)** de 60 segundos por IP (`x-forwarded-for` com fallback em `socket.remoteAddress`).
- **Limites Definidos**:
  - **Geral (`/api/*`)**: `120 requisições / minuto`.
  - **IA & Gemini (`/api/ai/*`)**: `30 requisições / minuto` (protege cotas de tokens e custos de API).
- **Cabeçalhos Padrão**:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After` (quando status `429 Too Many Requests`).

### 3.2. Chaves de API Protegidas
- O cliente React **nunca** tem acesso direto à `GEMINI_API_KEY`. Todas as chamadas para o modelo `gemini-3.7-flash` passam exclusivamente pelo backend Node/Express (`/api/ai/strategy` e `/api/ai/forecast`).

### 3.3. Dupla Validação de Acesso (RBAC)
Ao verificar autorizações no sistema, valida-se simultaneamente:
1. **Perfil do Usuário**: `Operador`, `Líder`, `Coordenador`, `Administrador`.
2. **Setor Vinculado**: Garante que líderes de um setor só alterem dados autorizados para o seu escopo.

---

## 4. Telemetria e Prevenção de Falhas

### 4.1. `telemetryLogger.ts`
Fornece logs estruturados categorizados (`DEBUG`, `INFO`, `WARN`, `ERROR`, `METRIC`, `AUDIT`):
- Cronometragem de alta resolução (`startTimer`) para medição de latência de endpoints e operações de banco.
- Métricas agregadas de sistema (taxa de erro, latência média, jobs em execução e tempo de atividade).

### 4.2. `executionGuard.ts`
- **Guarda de Recursão**: Interrompe loops e recursões anômalas antes de estourarem a pilha de execução.
- **Mutex de Execução em Background**: Garante que tarefas de sincronização pesadas não sejam disparadas concorrentemente (`runExclusiveJob`).
- **Deduplicação de Requisições com TTL Cache**: Evita que múltiplas requisições idênticas façam roundtrips desnecessários à rede.

---

## 5. Estratégia de Cache e Entrega de Assets
No Express (`server.ts`), os arquivos compilados da SPA em produção são servidos com cabeçalhos otimizados:
- Arquivos estáticos (JS, CSS, Imagens): `Cache-Control: public, max-age=86400, stale-while-revalidate=600` e suporte a `ETag`.
- `index.html`: `Cache-Control: no-cache` para garantir que novas atualizações da aplicação sejam recebidas instantaneamente pelos usuários sem cache stale.
