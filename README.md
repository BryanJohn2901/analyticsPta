# Analytics PTA

Dashboard de campanhas com autenticacao via Supabase, importacao por Google Sheets/CSV/Meta e dados compartilhados entre usuarios.

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Configurar Supabase (obrigatorio)

1. Crie um projeto no Supabase.
2. No `SQL Editor`, execute o arquivo:
   - `supabase/migrations/002_auth_shared_dashboard.sql`
3. Em `Project Settings > API`, copie:
   - `Project URL`
   - `anon public key`
4. Crie um `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_PUBLIC_KEY
```

5. Reinicie o `npm run dev`.

## Login inicial

- Usuario no app: `admin`
- Senha no app: `admin`

O app converte internamente para o usuario seed no Supabase.

## Deploy na Vercel (simples)

1. Na Vercel, clique em **Add New > Project**.
2. Importe este repositório.
3. Mantenha as configurações padrão:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output: padrão do Next.js
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique em **Deploy**.
6. Sempre que mudar env, use **Redeploy**.

## Observações

- Somente chaves publicas (`NEXT_PUBLIC_*`) no frontend.
- Nunca use `SUPABASE_SERVICE_ROLE_KEY` no cliente.
