# 🚀 Guia de Configuração - Torre de Comando Volumosos

## ⚙️ Configuração de Variáveis de Ambiente

### PASSO 1️⃣: Configuração Local para Desenvolvimento

1. **Crie o arquivo `.env.local`** na raiz do projeto (será ignorado pelo Git):
```bash
cp .env.example .env.local
```

2. **Edite `.env.local`** com as credenciais REAIS do seu projeto Supabase:
```env
# Supabase - OBRIGATÓRIO para sincro em tempo real
VITE_SUPABASE_URL=https://ojuewwutcymfqxzpdtci.supabase.co
VITE_SUPABASE_ANON_KEY=sb_anon_sua_chave_completa_aqui
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_CgGDu_1Z6Bptd4mA3Ri33w_v0KuKcW7

# PostgreSQL (opcional)
POSTGRES_HOST=db.ojuewwutcymfqxzpdtci.supabase.co
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_postgres
DATABASE_URL="postgresql://postgres:sua_senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

3. **Reinicie o servidor de desenvolvimento**:
```bash
npm run dev
```

4. **Verifique no console do navegador** (DevTools → Console):
- ✅ Esperado: `"Variáveis de ambiente do Supabase carregadas com sucesso."`
- ❌ Erro: `"No VITE_SUPABASE_URL encontrado..."`

---

### PASSO 2️⃣: Configuração em Produção (Vercel/Lovable/GitHub Pages)

1. Acesse o painel de deploy (Vercel/Lovable/GitHub)
2. Vá para **Settings → Environment Variables**
3. Configure as seguintes variáveis:

```
VITE_SUPABASE_URL=https://ojuewwutcymfqxzpdtci.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL=postgresql://...
```

4. Faça um novo **Deploy/Build** para aplicar as mudanças

---

## 🔑 Onde Obter as Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **ojuewwutcymfqxzpdtci**
3. Vá para: **Settings → API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** → `VITE_SUPABASE_ANON_KEY`
   - **Publishable Key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

5. Vá para: **Settings → Database**
6. Copie:
   - **Host** → `POSTGRES_HOST`
   - **User** → `POSTGRES_USER`
   - **Password** → `POSTGRES_PASSWORD`
   - **Connection strings** → `DATABASE_URL`, `DIRECT_URL`

---

## 🛡️ Segurança - Importante!

⚠️ **NUNCA commite `.env.local`** - ele está no `.gitignore`

⚠️ **Variáveis `VITE_*` são públicas** - embutidas no bundle do frontend durante BUILD

⚠️ **`SUPABASE_SECRET_KEY`** - apenas para servidor/CLI, NÃO use no frontend

⚠️ **Sempre rebuild após atualizar variáveis** - prefixo `VITE_` requer novo build

---

## ✅ Checklist de Verificação

- [ ] `.env.local` criado e preenchido
- [ ] `.env.local` está no `.gitignore` ✓
- [ ] Servidor dev reiniciado (`npm run dev`)
- [ ] Console mostra: "Variáveis de ambiente carregadas com sucesso"
- [ ] Autenticação Supabase funcionando
- [ ] Sincronização em tempo real ativa

---

## 🆘 Troubleshooting

**Problema:** Console mostra "No VITE_SUPABASE_URL encontrado..."
- **Solução:** Verifique se `.env.local` foi criado e preenchido corretamente. Reinicie o servidor.

**Problema:** Erro de conexão ao Supabase
- **Solução:** Verifique se `VITE_SUPABASE_ANON_KEY` foi copiada corretamente (verifique espaços em branco)

**Problema:** Build falha em produção
- **Solução:** Confirme que variáveis `VITE_*` estão configuradas no painel do deploy. Faça um novo deploy.

**Problema:** Sincronização em tempo real não funciona offline
- **Solução:** Normal! O app funciona em modo offline com IndexedDB até reconectar. Verifique se está conectado à internet.

---

## 📚 Referências da Arquitetura

- **`src/lib/supabase.ts`** - Cliente Supabase base
- **`src/lib/supabaseAuth.ts`** - Autenticação e fallback offline
- **`src/lib/supabaseService.ts`** - Camada de integração com sincronização
- **`src/lib/indexedDb.ts`** - Cache local (IndexedDB)

---

**Dúvidas?** Consulte `.env.example` para mais detalhes de configuração.
