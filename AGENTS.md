# Regras de Desenvolvimento - Torre de Comando Volumosos

Este documento serve como a única fonte de verdade de diretrizes de arquitetura, padrões de código e regras de negócio para qualquer Agente de IA ou desenvolvedor que atue neste repositório.

## 🏛️ 1. Arquitetura do Sistema
O projeto segue estritamente os princípios de **Clean Architecture** e separação de responsabilidades em camadas bem definidas. Qualquer nova funcionalidade deve respeitar esta hierarquia:

*   **`src/components/` (Interface / UI):** Componentes puramente visuais e interativos. **Não** devem conter lógica de persistência direta ou regras de negócio complexas.
*   **`src/hooks/` (Lógica de Apresentação):** Abstrações de estado local, manipulações de UI e hooks utilitários.
*   **`src/services/` (Regras de Negócio e Orquestração):** Serviços puros e estáticos que implementam regras operacionais (ex: processamento de importações, cálculos de produtividade, consolidação).
*   **`src/stores/` (Zustand Stores - Estado Global):** Centralizadores de estado reativo da aplicação. Todo dado persistente ou compartilhado deve passar por uma Store do Zustand.
*   **`src/lib/` (Integrações Externas):** Configurações e conexões com Firebase Firestore, Auth, Google Sheets e IndexedDB.
*   **`src/types/` (Tipagem Estrita):** Declaração explícita de interfaces e enums reutilizáveis no sistema.

---

## 💾 2. Gerenciamento de Estado e Sincronização
*   **Zustand como Estado Global Único:** Nunca crie novos estados locais duplicados no `App.tsx` para variáveis de negócio. Use ou estenda as stores existentes:
    *   `useSectorStore`: Dados e configurações dos setores.
    *   `useStoreOperations`: Controle de operações do Radar Live.
    *   `useCollaboratorStore`: Escala de colaboradores.
    *   `useUIStore`: Estados de visualização, seletor de setor ativo e controle de abas.
    *   `useUserStore`: Dados do usuário logado e RBAC.
*   **Sincronização Realtime:** Priorize conexões reativas usando `onSnapshot` do Firestore para garantir latência zero entre múltiplos usuários conectados. Evite a introdução de novos intervalos de polling (`setInterval`) que sobrecarregam a rede e criam gargalos.
*   **Dados Derivados:** Nunca replique ou duplique estados para representar dados secundários. Sempre utilize seletores do Zustand ou `useMemo` do React para computar dados derivados a partir do estado bruto.

---

## 🛡️ 3. Firebase e Segurança (RBAC)
*   **Validação Dupla:** Ao validar regras de acesso baseado em papéis (RBAC), aplique a dupla validação: **Perfil do Usuário** e **Setor Vinculado**. Nunca ignore um dos dois ejetores de segurança.
*   **Atribuição Padrão:** Novos usuários cadastrados no sistema são sempre inicializados com o status operacional `"Pendente"`, necessitando de aprovação manual por um administrador ou coordenador antes de obter acessos privilegiados.
*   **Segurança de Variáveis:** Credenciais, chaves de API e strings de conexão confidenciais devem residir estritamente no arquivo `.env` (declaradas de forma fictícia em `.env.example`). Nunca faça commit de segredos em arquivos de código.

---

## 🏷️ 4. Regras de Tipagem (TypeScript Estrito)
*   **Proibição do `any`:** O uso do tipo implícito ou explícito `any` é estritamente proibido. Utilize tipagens fortes ou, em casos de dados desconhecidos vindos de fontes externas, utilize `unknown` associado a Type Guards ou validação estrutural com bibliotecas como Zod.
*   **Tipagem de Funções:** Toda nova função criada deve possuir tipagem estrita para todos os seus parâmetros de entrada e declaração do tipo de retorno.
*   **Enums:** Sempre utilize declarações padrão de `enum` em TypeScript. O uso de `const enum` é proibido.

---

## 🛠️ 5. Fluxo de Trabalho (Workflow Obrigatório)
Qualquer alteração ou correção no sistema, por menor que seja, deve seguir o seguinte pipeline analítico:
1.  **ANÁLISE:** Identificação do problema na camada correta (UI, Hook, Service, Store ou Lib).
2.  **ARQUITETURA:** Planejamento do impacto estrutural, respeitando as camadas.
3.  **ESPECIFICAÇÕES:** Definição clara de assinaturas de funções e tipos.
4.  **IMPLEMENTAÇÃO:** Escrita do código limpo, modular e altamente otimizado.
5.  **VALIDACAO:** Execução de linter (`npm run lint`) e build (`npm run build`) para assegurar integridade.
6.  **DOCUMENTAÇÃO:** Registro das modificações nos canais apropriados.
