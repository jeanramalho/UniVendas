import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL não informado.');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não informado.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  const migrationSql = `
create table if not exists public.product_sizes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_name text not null,
  size_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size_name)
);

create index if not exists idx_product_sizes_product_id on public.product_sizes (product_id);
create index if not exists idx_product_sizes_order on public.product_sizes (product_id, size_order);

alter table public.product_sizes enable row level security;

create policy product_sizes_select on public.product_sizes
for select
using (public.is_app_user());

create policy product_sizes_write on public.product_sizes
for all
using (public.is_app_user())
with check (public.is_app_user());

create index if not exists idx_product_variants_product on public.product_variants (product_id);
`;

  const { error } = await supabase.rpc('execute_sql', { sql: migrationSql });

  if (error) {
    throw error;
  }

  console.log('Migration product_sizes aplicada com sucesso.');
}

applyMigration().catch((error) => {
  console.error('Falha ao aplicar migration product_sizes:', error);
  process.exitCode = 1;
});
