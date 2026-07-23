-- UniVendas — Pioneiros da Colina
-- Schema base para Supabase/PostgreSQL.
-- Execute este arquivo no SQL Editor do Supabase ou via CLI de migrations.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('master', 'admin', 'operator', 'viewer')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_units (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id integer primary key default 1,
  club_logo_url text,
  desbravadores_logo_url text,
  club_name text not null default 'Clube de Desbravadores Pioneiros da Colina',
  season_year text not null default '2026',
  allow_sale_without_stock boolean not null default true,
  auto_reserve_on_receipt boolean not null default true,
  min_stock_alert integer not null default 5,
  reference_sizes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default uuid_generate_v4(),
  internal_code text unique not null,
  name text not null,
  unit text not null,
  cellphone text,
  birth_date date not null,
  address text,
  age integer not null default 0,
  mother_name text,
  father_name text,
  reference_size text,
  responsible_name text not null,
  gender text check (gender in ('M', 'F', 'Outro')),
  mother_phone text,
  father_phone text,
  member_phone text,
  responsible_phone text,
  active boolean not null default true,
  import_id uuid,
  original_row_number integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_members_name on public.members (name);
create index if not exists idx_members_unit on public.members (unit);
create index if not exists idx_members_code on public.members (internal_code);

create table if not exists public.member_imports (
  id uuid primary key default uuid_generate_v4(),
  file_name text not null,
  total_rows integer not null,
  valid_rows integer not null,
  error_rows integer not null,
  duplicate_rows integer not null,
  imported_by uuid references public.profiles(id),
  imported_at timestamptz not null default now(),
  file_url text
);

create table if not exists public.member_import_rows (
  id uuid primary key default uuid_generate_v4(),
  import_id uuid references public.member_imports(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  is_valid boolean not null,
  errors jsonb
);

create table if not exists public.member_duplicate_reviews (
  id uuid primary key default uuid_generate_v4(),
  existing_member_id uuid references public.members(id) on delete cascade,
  new_import_data jsonb not null,
  similarity_score numeric(5,2),
  matched_fields text[],
  status text not null default 'pending' check (status in ('pending', 'kept_both', 'ignored_new', 'updated_existing', 'merged')),
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  sku text not null,
  name text not null,
  description text,
  category_id uuid references public.product_categories(id),
  image_url text,
  supplier_name text,
  base_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  active boolean not null default true,
  control_stock boolean not null default true,
  allow_sale_without_stock boolean not null default true,
  min_stock integer not null default 5,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  sku text not null,
  size text not null,
  color text,
  model text,
  gender text,
  price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  physical_stock integer not null default 0 check (physical_stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.kits (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  original_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kit_items (
  id uuid primary key default uuid_generate_v4(),
  kit_id uuid references public.kits(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity integer not null default 1,
  required boolean not null default true,
  allowed_sizes text[] not null default '{}'::text[]
);

create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  member_id uuid not null references public.members(id),
  member_name text not null,
  member_unit text not null,
  member_phone text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  addition numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  pending_amount numeric(12,2) not null default 0,
  payment_status text not null,
  overall_status text not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_member on public.sales (member_id);
create index if not exists idx_sales_code on public.sales (code);

create table if not exists public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id) on delete cascade,
  is_kit boolean not null default false,
  kit_id uuid references public.kits(id),
  product_id uuid references public.products(id),
  product_name text not null,
  variant_id uuid references public.product_variants(id),
  size text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  status text not null,
  batch_id uuid,
  batch_code text,
  delivery_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_item_components (
  id uuid primary key default uuid_generate_v4(),
  sale_item_id uuid references public.sale_items(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  variant_id uuid references public.product_variants(id),
  size text not null,
  quantity integer not null default 0,
  unit_price numeric(12,2) not null default 0,
  status text not null
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  method text not null,
  status text not null,
  paid_at timestamptz,
  due_date date,
  registered_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_batches (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  supplier_name text not null,
  supplier_contact text,
  external_order_number text,
  status text not null,
  total_items integer not null default 0,
  estimated_cost numeric(12,2) not null default 0,
  real_cost numeric(12,2),
  shipping_cost numeric(12,2),
  sent_at timestamptz,
  expected_delivery_date date,
  received_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_batch_items (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid references public.purchase_batches(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id),
  sale_code text not null,
  member_id uuid references public.members(id),
  member_name text not null,
  member_unit text not null,
  product_id uuid references public.products(id),
  product_name text not null,
  variant_id uuid references public.product_variants(id),
  size text not null,
  quantity_requested integer not null default 0,
  quantity_received integer not null default 0,
  quantity_missing integer not null default 0,
  quantity_surplus integer not null default 0,
  quantity_damaged integer not null default 0,
  unit_cost numeric(12,2) not null default 0,
  status text not null
);

create table if not exists public.delivery_records (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id),
  sale_code text not null,
  member_id uuid references public.members(id),
  member_name text not null,
  member_unit text not null,
  delivered_to text not null,
  delivered_by uuid references public.profiles(id),
  delivered_at timestamptz not null default now(),
  notes text
);

create table if not exists public.delivery_items (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid references public.delivery_records(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id),
  product_name text not null,
  size text not null,
  quantity integer not null default 0
);

create table if not exists public.returns (
  id uuid primary key default uuid_generate_v4(),
  type text check (type in ('troca', 'devolucao')),
  sale_id uuid references public.sales(id),
  sale_code text not null,
  member_id uuid references public.members(id),
  member_name text not null,
  reason text not null,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id),
  product_name text not null,
  variant_id uuid references public.product_variants(id),
  size text not null,
  type text not null,
  quantity integer not null default 0,
  previous_balance integer not null default 0,
  new_balance integer not null default 0,
  reason text not null,
  sale_id uuid,
  sale_code text,
  batch_id uuid,
  batch_code text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  user_name text not null,
  action text not null,
  resource text not null,
  resource_id text,
  details text,
  old_values jsonb,
  new_values jsonb,
  justification text,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.product_categories enable row level security;
alter table public.member_units enable row level security;
alter table public.app_settings enable row level security;
alter table public.members enable row level security;
alter table public.member_imports enable row level security;
alter table public.member_import_rows enable row level security;
alter table public.member_duplicate_reviews enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.kits enable row level security;
alter table public.kit_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_item_components enable row level security;
alter table public.payments enable row level security;
alter table public.purchase_batches enable row level security;
alter table public.purchase_batch_items enable row level security;
alter table public.delivery_records enable row level security;
alter table public.delivery_items enable row level security;
alter table public.returns enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_master_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'master', false);
$$;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_write on public.profiles;
drop policy if exists categories_select on public.product_categories;
drop policy if exists categories_write on public.product_categories;
drop policy if exists settings_select on public.app_settings;
drop policy if exists settings_write on public.app_settings;
drop policy if exists members_select on public.members;
drop policy if exists members_write on public.members;
drop policy if exists products_select on public.products;
drop policy if exists products_write on public.products;
drop policy if exists variants_select on public.product_variants;
drop policy if exists variants_write on public.product_variants;
drop policy if exists kits_select on public.kits;
drop policy if exists kits_write on public.kits;
drop policy if exists kit_items_select on public.kit_items;
drop policy if exists kit_items_write on public.kit_items;
drop policy if exists sales_select on public.sales;
drop policy if exists sales_write on public.sales;
drop policy if exists sale_items_select on public.sale_items;
drop policy if exists sale_items_write on public.sale_items;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_write on public.payments;
drop policy if exists batches_select on public.purchase_batches;
drop policy if exists batches_write on public.purchase_batches;
drop policy if exists batch_items_select on public.purchase_batch_items;
drop policy if exists batch_items_write on public.purchase_batch_items;
drop policy if exists deliveries_select on public.delivery_records;
drop policy if exists deliveries_write on public.delivery_records;
drop policy if exists delivery_items_select on public.delivery_items;
drop policy if exists delivery_items_write on public.delivery_items;
drop policy if exists returns_select on public.returns;
drop policy if exists returns_write on public.returns;
drop policy if exists movements_select on public.stock_movements;
drop policy if exists movements_write on public.stock_movements;
drop policy if exists audit_select on public.audit_logs;
drop policy if exists audit_write on public.audit_logs;

create policy profiles_select on public.profiles
for select
using (auth.uid() = id or public.is_master_user());

create policy profiles_write on public.profiles
for all
using (public.is_master_user() or auth.uid() = id)
with check (public.is_master_user() or auth.uid() = id);

create policy categories_select on public.product_categories
for select
using (public.is_app_user());

create policy categories_write on public.product_categories
for all
using (public.is_master_user())
with check (public.is_master_user());

create policy settings_select on public.app_settings
for select
using (public.is_app_user());

create policy settings_write on public.app_settings
for all
using (public.is_master_user())
with check (public.is_master_user());

create policy members_select on public.members
for select
using (public.is_app_user());

create policy members_write on public.members
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy products_select on public.products
for select
using (public.is_app_user());

create policy products_write on public.products
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy variants_select on public.product_variants
for select
using (public.is_app_user());

create policy variants_write on public.product_variants
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy kits_select on public.kits
for select
using (public.is_app_user());

create policy kits_write on public.kits
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy kit_items_select on public.kit_items
for select
using (public.is_app_user());

create policy kit_items_write on public.kit_items
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy sales_select on public.sales
for select
using (public.is_app_user());

create policy sales_write on public.sales
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy sale_items_select on public.sale_items
for select
using (public.is_app_user());

create policy sale_items_write on public.sale_items
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy payments_select on public.payments
for select
using (public.is_app_user());

create policy payments_write on public.payments
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy batches_select on public.purchase_batches
for select
using (public.is_app_user());

create policy batches_write on public.purchase_batches
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy batch_items_select on public.purchase_batch_items
for select
using (public.is_app_user());

create policy batch_items_write on public.purchase_batch_items
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy deliveries_select on public.delivery_records
for select
using (public.is_app_user());

create policy deliveries_write on public.delivery_records
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy delivery_items_select on public.delivery_items
for select
using (public.is_app_user());

create policy delivery_items_write on public.delivery_items
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy returns_select on public.returns
for select
using (public.is_app_user());

create policy returns_write on public.returns
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy movements_select on public.stock_movements
for select
using (public.is_app_user());

create policy movements_write on public.stock_movements
for all
using (public.is_app_user())
with check (public.is_app_user());

create policy audit_select on public.audit_logs
for select
using (public.is_master_user() or public.is_app_user());

create policy audit_write on public.audit_logs
for all
using (public.is_app_user())
with check (public.is_app_user());

insert into public.app_settings (id, club_name, season_year, allow_sale_without_stock, auto_reserve_on_receipt, min_stock_alert, reference_sizes)
values (
  1,
  'Clube de Desbravadores Pioneiros da Colina',
  '2026',
  true,
  true,
  5,
  '["Infantil 2","Infantil 4","Infantil 6","Infantil 8","Infantil 10","Infantil 12","Infantil 14","Infantil 16","Adulto PP","Adulto P","Adulto M","Adulto G","Adulto GG","Adulto XG","Adulto XXGG","Baby Look PP","Baby Look P","Baby Look M","Baby Look G"]'::jsonb
)
on conflict (id) do nothing;

insert into public.product_categories (name, description, active)
values
  ('Camisas', 'Camisas de atividades e oficiais', true),
  ('Calças', 'Calças de uniforme e passeio', true),
  ('Bermudas', 'Bermudas e calções', true),
  ('Saias', 'Saias e peças femininas', true),
  ('Agasalhos', 'Jaquetas e moletons oficiais', true),
  ('Bonés', 'Bonés e coberturas', true),
  ('Lenços', 'Lenços e itens do clube', true),
  ('Prendedores', 'Prendedores, faixas e acessórios', true),
  ('Insígnias', 'Insígnias e distintivos', true),
  ('Acessórios', 'Itens complementares', true),
  ('Kits', 'Kits e conjuntos', true),
  ('Outros', 'Itens diversos', true)
on conflict (name) do nothing;
