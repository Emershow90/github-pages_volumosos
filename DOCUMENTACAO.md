# 📘 Documentação Completa — Sistema Torre de Comando Volumosos

Este documento serve como o manual técnico, operacional e arquitetural do sistema **Torre de Comando Volumosos**. Ele detalha a estrutura de pastas, o funcionamento das abas do painel, as conexões entre as visões, as funções vitais e as diretrizes para execução gratuita sem custos de nuvem (Offline-First local fallback).

---

## 🏛️ 1. Arquitetura do Sistema e Estrutura de Pastas

O sistema foi estruturado seguindo os princípios de **Clean Architecture**, dividindo responsabilidades de forma que a interface (UI) permaneça limpa e focada em exibição, enquanto o estado global, persistência e regras operacionais fiquem isolados.

```
/src
├── components/                      # Componentes de interface de usuário (UI) e Abas
│   ├── AdminAndSupportTabs.tsx      # Configurações de Setores, Backup e Suporte Técnico
│   ├── CommandCharts.tsx            # Gráficos dinâmicos de produtividade e volumosos (D3/Recharts)
│   ├── DashboardTab.tsx             # Resumo Geral, KPIs do turno, alertas rápidos e volumetria
│   ├── ExecutiveAndAnalyticsTabs.tsx# Relatórios gerenciais, análise de COPIL e auditoria
│   ├── LoginScreen.tsx              # Autenticação de Usuários com RBAC (Administrador, Coordenador, Operador)
│   ├── ProtectedRoute.tsx           # Proteção de rotas baseado em autenticação e setor
│   ├── RadarLojasTab.tsx            # Radar Live (Painel Operacional principal com importador OCR/JSON)
│   ├── TransactionalAndOperationalTabs.tsx # Escala diária, produtividade e apontamentos
│   └── ui/                          # Elementos reutilizáveis de UI
├── db/                              # Definições de esquema para suporte SQL opcional
├── lib/                             # Conexões e integrações com serviços externos
│   ├── firebaseAuth.ts              # Interceptação de autenticação e mitigação de erros WebSocket
│   ├── firebaseService.ts           # Serviço de sincronização em tempo real (onSnapshot) e escrita
│   ├── googleSheetsService.ts       # Integração com planilhas externas
│   └── indexedDb.ts                 # Banco de dados local do navegador (Offline-First)
├── services/                        # Lógica e regras de negócio puras
│   ├── businessRules.ts             # Cálculos de COPIL, produtividade, gargalos e projeções
│   └── storeService.ts              # Orquestrador de transações locais vs Firebase
├── stores/                          # Centralizadores de Estado Global Reativo (Zustand)
│   ├── useSectorStore.ts            # Estado dos setores operacionais (S87, S88, S89, S90)
│   ├── useStoreOperations.ts        # Operações do Radar Live, status de soltura, coletas e expedição
│   ├── useCollaboratorStore.ts      # Escala de colaboradores e status (Operação, BH, Ausente)
│   ├── useUIStore.ts                # Filtros de visualização, setor ativo no cabeçalho e abas
│   ├── useUserStore.ts              # Usuário logado e permissões RBAC
│   └── useHistoryStore.ts           # Histórico de alterações e auditoria de segurança
├── types/                           # Tipagens estritas do TypeScript (Zod/Interfaces)
└── App.tsx                          # Orquestrador principal da aplicação e layout do cabeçalho
```

---

## 💻 2. Fluxo das Abas e Navegação Operacional

O painel é segmentado em quatro grandes módulos de abas, organizados estrategicamente para atender a diferentes perfis de usuários (Operador, Coordenador, Gerente e Administrador).

### 🖥️ Módulo 1: Visão Geral & Direção
*   **Aba Dashboard (Geral):** 
    *   *O que faz:* Fornece uma visão bento-grid de alto nível contendo cartões KPI reativos (Lojas Soltas, Coleta Iniciada, Lojas Carregadas, Corte Perdido). Exibe o gráfico de volumetria das rotas programadas e alertas críticos em tempo real.
    *   *Como se conecta:* É a aba receptora primária de dados. Conecta-se diretamente à base do **Radar Live** e à **Escala**. Se um operador for desativado na escala, a capacidade nominal projetada no Dashboard cai imediatamente. Se uma loja é marcada como "Carregada" no Radar, o progresso reativo aumenta em tempo real no Dashboard.

### 🎯 Módulo 2: Operação & Transação (Radar Live)
*   **Aba Radar Live:**
    *   *O que faz:* O coração operacional da torre. Permite visualizar e alterar o status de cada loja programada em 4 etapas lineares: **Soltura** ➔ **Coleta** ➔ **Carregamento** ➔ **Expedição**. Contém o importador inteligente via OCR e JSON com suporte à duplicação multissetor.
    *   *Como se conecta:* Sincroniza bidirecionalmente com o Firestore/IndexedDB. Seus registros alimentam os gráficos e os alertas do **Dashboard**, os relatórios da **Aba COPIL**, e geram linhas na **Aba Auditoria** para cada modificação realizada por operadores.

### 👥 Módulo 3: Escala & Produtividade
*   **Aba Escala:**
    *   *O que faz:* Gerenciamento diário de colaboradores alocados em cada setor (S87, S88, S89, S90). Permite registrar status como "Na Operação", "Poli", "BH" e "Ausente", além de ajustar as produtividades individuais.
    *   *Como se conecta:* Envia a capacidade operacional em tempo real para o **Dashboard**, permitindo o cálculo dinâmico da velocidade atual do turno e previsão de término do carregamento.

### 📊 Módulo 4: Análise & Auditoria (Gerencial)
*   **Aba COPIL (Análise de Desempenho):**
    *   *O que faz:* Avalia a aderência do carregamento comparando a data planejada e a hora de expedição real. Atribui notas automáticas de **A** a **D** para a eficiência de cada setor.
    *   *Como se conecta:* Consome os dados consolidados do **Radar Live** e formata em insights visuais de aderência logística para a gerência.
*   **Aba Auditoria (Logs):**
    *   *O que faz:* Exibe o histórico imutável de quem alterou cada registro, quando (data e hora com precisão de segundos) e qual foi o valor modificado.
    *   *Como se conecta:* Monitora eventos globais acionados em qualquer aba (Radar, Escala, Setores).

---

## ⚡ 3. Funções Vitais para o Funcionamento do Sistema

Para manter a integridade, o sistema utiliza funções core localizadas principalmente na camada de `services/` e `stores/`:

1.  **`commitImportedRows(rows, user)` (Store/Database Integration):**
    *   Responsável pelo *Upsert* inteligente das programações. Suporta estratégias como *Merge* (atualiza o volume sem perder o progresso de soltura) e *Overwrite* (reinicia o dia).
    *   Contém a lógica de duplicação automática ao marcar **"Aplicar a todos os setores"**, onde uma rota para a Loja `X` é expandida em quatro registros distintos com os IDs compostos: `{lojaId}_{data}_{setor}`.
2.  **`calculateCopilGrade(delayInMinutes)` (Business Rules):**
    *   Calcula a nota operacional das coletas baseando-se no tempo decorrido entre a liberação e a conclusão.
3.  **`onSnapshot()` (SRealtime Sync):**
    *   Mantém ouvintes abertos no Firestore. Se um coordenador na doca atualiza o status de carregamento, todos os painéis e o Dashboard de monitoramento no escritório são atualizados em milissegundos sem requisições adicionais (Polling).
4.  **`IndexedDBService` (Banco de Dados Local de Cache):**
    *   Garante leitura instantânea de dados de qualquer tabela e gerencia o armazenamento offline se houver queda ou ausência de internet.

---

## ☁️ 4. Como rodar e publicar o sistema de forma 100% GRATUITA (Sem custos Cloud)

Muitos usuários encontram barreiras ao publicar aplicativos devido a limites de faturamento de serviços de nuvem ou chaves de API restritas. O sistema **Torre de Comando Volumosos** foi arquitetado de forma resiliente para suportar essa necessidade através de um design **Offline-First com Fallback Local Automático**.

### Como funciona o modo autônomo (Zero Cloud Cost)?

1.  **Eliminação da barreira de autenticação forçada para escrita:**
    *   Modificamos a classe `FirebaseService` de modo que se não houver um banco de dados ativo ou o usuário estiver desconectado dos serviços em nuvem, o sistema **não trava** e **não emite erros de permissão insuficiente**.
    *   O método `upsertRecord` e `deleteRecord` detectam a ausência de `auth.currentUser`. Ao invés de lançar uma exceção de segurança, eles ativam o fallback gravando todas as operações, alterações, auditorias e escala diretamente no **IndexedDB** local do navegador do usuário.
2.  **Sincronização Local (IndexedDB):**
    *   O IndexedDB é um banco de dados estruturado no navegador capaz de armazenar gigabytes de dados operacionais sem nenhum custo.
    *   O sistema carrega os dados iniciais dinâmicos de `initialData.ts` caso o IndexedDB esteja limpo, permitindo que a aplicação seja 100% funcional imediatamente após a inicialização.
3.  **Modo de Demonstração / Uso Local Confiável:**
    *   O usuário pode utilizar todas as ferramentas de importação de rotas, controle do Radar Live, escalas de colaboradores e relatórios analíticos de forma local e persistente. Os dados continuam salvos mesmo após o fechamento do navegador ou reinicialização do sistema.

### Como Publicar Gratuitamente no AI Studio?
Ao clicar em **Share** (Compartilhar) ou **Exportar para GitHub / ZIP**, o aplicativo rodará de forma totalmente gratuita e autônoma, pois não dependerá de nenhuma infraestrutura paga de terceiros para o seu funcionamento básico diário.
