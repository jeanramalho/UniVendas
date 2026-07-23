<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# UniVendas — Pioneiros da Colina

Aplicação web para controle de membros, produtos, vendas, lotes e entregas do Clube de Desbravadores Pioneiros da Colina.

## Execução local

**Pré-requisitos:** Node.js e um projeto Supabase configurado.

1. Instale as dependências com `npm install`.
2. Copie [.env.example](.env.example) para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Aplique a migration SQL em [supabase/migrations/20260723_0001_univendas_schema.sql](supabase/migrations/20260723_0001_univendas_schema.sql) no editor SQL do Supabase.
4. Inicie a aplicação com `npm run dev`.

## Fonte de dados

O frontend lê e grava dados reais no Supabase. Não há camada de mock para membros, produtos, vendas, lotes, categorias, configurações e auditoria.

## Autenticação

O login administrativo usa Supabase Auth. Antes do primeiro acesso, execute o script [scripts/create-master-user.ts](scripts/create-master-user.ts) com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MASTER_USER_EMAIL` e `MASTER_USER_PASSWORD` configurados.

Ao cadastrar novos usuários pelo painel, o sistema também tenta criar a conta no Supabase Auth. Se sua instância exigir confirmação de e-mail, ajuste essa política no Supabase ou confirme o e-mail antes do primeiro login.

## Observação sobre autenticação

O projeto ainda mantém a camada atual de login administrativo no frontend. Se você quiser endurecer RLS com Supabase Auth, use o `SUPABASE_SERVICE_ROLE_KEY` apenas em scripts locais/de backend para criar o usuário mestre inicial.
