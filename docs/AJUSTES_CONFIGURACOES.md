# ⚙️ Módulo de Ajustes e Configurações - Torre de Comando Volumosos

Este documento detalha as especificações técnicas, regras de permissão (RBAC), fluxos de dados, arquitetura e segurança do módulo **Ajustes e Configurações** (representado pela aba `config` e implementado no componente `ConfigTab`).

---

## 🧭 1. Visão Geral do Módulo

O painel de **Ajustes** é o centro administrativo da **Torre de Comando Volumosos**. Ele unifica o gerenciamento de dados mestres, escalas operacionais de liderança, parâmetros físicos dos setores, integrações por arquivos e rotinas críticas de recuperação de dados.

Para garantir a integridade dos dados operacionais e de inteligência em tempo real, todas as ações são controladas rigorosamente via **Controle de Acesso Baseado em Funções (RBAC)**, limitando o escopo de atuação de acordo com a responsabilidade do usuário autenticado.

---

## 🛡️ 2. Controle de Acesso Baseado em Funções (RBAC)

A segurança operacional é implementada através de uma **Dupla Validação de Segurança** baseada em:
1.  **Perfil de Usuário (`userRole`)**: `Administrador`, `Coordenador`, `Líder`, `Operador` (e status `Pendente`).
2.  **Setor Vinculado**: Isola ações específicas.

### 📋 Matriz de Permissões das Subcategorias

| Subcategoria | Funcionalidade | Admin | Coordenador | Líder | Operador / Pendente |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Geral** | Alterar Nome e Foto da Liderança de Turno | **Sim** | **Sim** | Não | Não |
| **Escala** | Gerenciar Escala de Referentes da Semana | **Sim** | **Sim** | **Sim** | Não |
| **Setores** | Criar ou Excluir Setores | **Sim** | Não | Não | Não |
| **Setores** | Alterar Meta Global ou Parâmetros de Universos | **Sim** | **Sim** | **Sim** | Não |
| **Lojas** | Cadastrar, Editar ou Excluir Lojas (`store_master`) | **Sim** | **Sim** | Não | Não |
| **Importar** | Purgar Banco de Dados Completo | **Sim** | Não | Não | Não |
| **Importar** | Importar via Arquivo (CSV/Excel/JSON) ou OCR | **Sim** | **Sim** | Não | Não |
| **Backup** | Restaurar Backup JSON Completo | **Sim** | Não | Não | Não |
| **Screensaver**| Alterar Parâmetros da Tela de Descanso | **Sim** | **Sim** | **Sim** | Não |

*Nota: Usuários com nível inferior de privilégio visualizam os painéis com controles desabilitados (`disabled`) e opacidade reduzida, acompanhados de um banner informativo com o status **🔒 Nível de Permissão**.*

---

## 📂 3. Detalhamento Técnico das Subcategorias

### 👥 3.1. Geral (Liderança de Turno)
Permite a designação rápida da equipe de comando ativo do turno de trabalho.
- **Campos**: Nome do Coordenador (selecionável da lista de colaboradores cadastrados) e URL da Foto de Perfil.
- **Padrão de UI**: Formulário centralizado com tratamento de estados reativos e bloqueio automático de escrita para perfis de liderança inferior.

### 📅 3.2. Escala (Referentes da Semana)
Gerencia a escala rotativa dos representantes operacionais do CD para os canais de comunicação e suporte do sistema.
- **Colunas Cadastradas**:
  - *Dia da Semana*: Segunda-feira a Domingo.
  - *Ref. S87*: Referente operacional do Setor 87 (Volumosos S87).
  - *Ref. Volumosos*: Referente do setor geral de volumosos.
  - *Apoios*: Colaborador complementar alocado para o dia.
- **Estrutura de Dados**: Integrado de forma reativa, sincronizando alterações diretamente com a store e bases globais.

### 🏭 3.3. Setores (Parâmetros Físicos e Universos)
Administra as restrições físicas de capacidade e as metas de produtividade da operação.
- **Gestão de Setores**: Criação de setores com definição de número identificador e meta global de **UPH (Unidades por Hora)**.
- **Mix de Universos**: Vinculação de famílias de produtos (Ex: *Alimento, Montanha, Colis, Reabastecimento*) com suas respectivas metas específicas de desempenho, permitindo detalhamento microscópico de pacing operacional.

### 🏪 3.4. Cadastro de Lojas (`store_master`)
O banco master de lojas é a espinha dorsal de validação do **Radar de Lojas**.
- **Campos do Registro**:
  - Código numérico da filial (ex: `2722`).
  - Nome Amigável / Descrição da Filial (ex: `FLORIPA`).
  - Cidade e Unidade Federativa (UF).
  - Nome da Transportadora Padrão designada.
- **Fluxo de Integridade**: Impede exclusões acidentais por meio de modais de confirmação específicos de dois fatores operacionais.

### 📊 3.5. Importação e Purga de Dados (Módulo Ingestion)
O gateway para carga em lote de faturamentos e planejamentos diários.
- **Upload Inteligente de Arquivos**: Suporte nativo a planilhas eletrônicas (`.xlsx`, `.xls`), arquivos separados por vírgulas (`.csv`) e blobs estruturados (`.json`).
- **OCR Integrado (Sincronização por Imagem)**: Processador de imagens inteligente para capturar grades físicas e sincronizar cortes e volumes capturados em tempo real diretamente ao Radar Live.
- **Ação Crítica de Purga (Limpeza Total)**: Limpa os registros de tabelas voláteis de produção sem comprometer os cadastros master permanentes. *Gatilhada estritamente com chave de verificação administrativa por segurança.*

### 💾 3.6. Backup e Restauração
Assegura a resiliência operacional contra desastres ou mudanças na programação da infraestrutura local do CD.
- **Exportação instantânea**: Geração de arquivo JSON consolidado contendo toda a memória operacional do dia atual.
- **Restauração em Lote**: Upload de arquivos de histórico com revalidação estrita de tipos para preenchimento de métricas de relatórios e relançamento de cargas do Radar.

### 🖥️ 3.7. Tela de Descanso (Inatividade)
Controle de sinalização física nas telas de monitoramento (TVs do CD) para economia de energia ou avisos de bloqueio de inatividade.
- **Parâmetros Editáveis**:
  - *Ativar Tela de Descanso*: Booleano de controle liga/desliga geral.
  - *Tempo Limite*: Tempo em segundos de inatividade para disparo da tela de descanso.
  - *Duração*: Tempo de exibição ativo.
  - *Imagem de Fundo*: URL de banner de sinalização operacional.

---

## 🔌 4. Integração de Estado com Zustand

O componente de Ajustes consome diretamente ações de escrita e estados derivados do ecossistema de stores. Toda modificação submetida dispara gatilhos atômicos de sincronização:

```typescript
// Exemplo conceitual de consumo de permissões e estados nas stores
const currentRole = useUserStore((state) => state.role);
const { setores, addSetor, updateSetor } = useSectorStore();
const { colaboradores } = useCollaboratorStore();
```

As stores operacionais encapsulam a lógica de sincronização ativa com as APIs do Firebase/Supabase (quando configurados), garantindo persistência sem latência perceptível no frontend.

---

## 🎨 5. Padrões de Design e UX Aplicados

1.  **Flattened Visual Depth**: O painel evita o aninhamento excessivo de cards (`nested cards`). O agrupamento visual é realizado através de bordas sutis (`border-white/5`), variação tipográfica fina e espaçamento proporcional.
2.  **Disabled Interactive States**: Botões e inputs desabilitados por restrições de permissão recebem opacidade matemática exata de 30% a 50%, com modificadores de cursor `not-allowed`, prevenindo cliques acidentais e poluição interativa.
3.  **Toasts e Banners Contextuais**: Mensagens de feedback de sucesso e erro utilizam animações fluidas baseadas em framer-motion (`AnimatePresence`) para evitar trepidação do layout durante transições de estado.
4.  **No All-Caps para Textos Longos**: Mantém-se o uso de caixa alta estritamente restrito a rótulos de dados microscópicos e metadados (`eyebrows` de cabeçalho), assegurando alta legibilidade em textos de instrução técnica.
