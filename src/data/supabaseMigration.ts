export const MIGRATION_SQL = `-- ====================================================================
-- MIGRATION COMPLETA SUPABASE - UNIVENDAS PIONEIROS DA COLINA
-- Banco de dados: PostgreSQL Supabase
-- ====================================================================

-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuário (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master', 'admin', 'operator', 'viewer')),
  active BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 3. Tabela de Unidades do Clube (Member Units)
CREATE TABLE IF NOT EXISTS public.member_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Membros do Clube (Members)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  cellphone TEXT,
  birth_date DATE NOT NULL,
  address TEXT,
  age INTEGER NOT NULL,
  mother_name TEXT,
  father_name TEXT,
  reference_size TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'Outro')),
  mother_phone TEXT,
  father_phone TEXT,
  member_phone TEXT,
  responsible_phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  import_id UUID,
  original_row_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca rápida por nome e código
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members (name);
CREATE INDEX IF NOT EXISTS idx_members_unit ON public.members (unit);
CREATE INDEX IF NOT EXISTS idx_members_code ON public.members (internal_code);

-- 5. Tabelas de Importação de Membros
CREATE TABLE IF NOT EXISTS public.member_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  valid_rows INTEGER NOT NULL,
  error_rows INTEGER NOT NULL,
  duplicate_rows INTEGER NOT NULL,
  imported_by UUID REFERENCES public.profiles(id),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT
);

CREATE TABLE IF NOT EXISTS public.member_import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID REFERENCES public.member_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL,
  errors JSONB
);

CREATE TABLE IF NOT EXISTS public.member_duplicate_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  existing_member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  new_import_data JSONB NOT NULL,
  similarity_score NUMERIC(5,2),
  matched_fields TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'kept_both', 'ignored_new', 'updated_existing', 'merged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Categorias de Produtos
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id),
  image_url TEXT,
  supplier_name TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  control_stock BOOLEAN DEFAULT TRUE,
  allow_sale_without_stock BOOLEAN DEFAULT TRUE,
  min_stock INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Variações e Tamanhos de Produtos
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT,
  model TEXT,
  gender TEXT,
  price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  physical_stock INTEGER DEFAULT 0 CHECK (physical_stock >= 0),
  reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Kits e Componentes
CREATE TABLE IF NOT EXISTS public.kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID REFERENCES public.kits(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  required BOOLEAN DEFAULT TRUE
);

-- 11. Tabela de Vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  member_id UUID NOT NULL REFERENCES public.members(id),
  member_name TEXT NOT NULL,
  member_unit TEXT NOT NULL,
  member_phone TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  addition NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  pending_amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL,
  overall_status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_member ON public.sales (member_id);
CREATE INDEX IF NOT EXISTS idx_sales_code ON public.sales (code);

-- 12. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  is_kit BOOLEAN DEFAULT FALSE,
  kit_id UUID REFERENCES public.kits(id),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id),
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,
  batch_id UUID,
  batch_code TEXT,
  delivery_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_item_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id),
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL
);

-- 13. Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  registered_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Lotes de Pedidos ao Fornecedor
CREATE TABLE IF NOT EXISTS public.purchase_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  external_order_number TEXT,
  status TEXT NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  real_cost NUMERIC(10,2),
  shipping_cost NUMERIC(10,2),
  sent_at TIMESTAMPTZ,
  expected_delivery_date DATE,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_batch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES public.purchase_batches(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id),
  sale_code TEXT NOT NULL,
  member_id UUID REFERENCES public.members(id),
  member_name TEXT NOT NULL,
  member_unit TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id),
  size TEXT NOT NULL,
  quantity_requested INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  quantity_missing INTEGER DEFAULT 0,
  quantity_surplus INTEGER DEFAULT 0,
  quantity_damaged INTEGER DEFAULT 0,
  unit_cost NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL
);

-- 15. Tabela de Entregas
CREATE TABLE IF NOT EXISTS public.delivery_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id),
  sale_code TEXT NOT NULL,
  member_id UUID REFERENCES public.members(id),
  member_name TEXT NOT NULL,
  member_unit TEXT NOT NULL,
  delivered_to TEXT NOT NULL,
  delivered_by UUID REFERENCES public.profiles(id),
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.delivery_records(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id),
  product_name TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL
);

-- 16. Tabela de Trocas e Devoluções
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('troca', 'devolucao')),
  sale_id UUID REFERENCES public.sales(id),
  sale_code TEXT NOT NULL,
  member_id UUID REFERENCES public.members(id),
  member_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id),
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  reason TEXT NOT NULL,
  sale_id UUID,
  sale_code TEXT,
  batch_id UUID,
  batch_code TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Tabela de Auditoria (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  old_values JSONB,
  new_values JSONB,
  justification TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  club_logo_url TEXT,
  desbravadores_logo_url TEXT,
  club_name TEXT DEFAULT 'Clube de Desbravadores Pioneiros da Colina',
  season_year TEXT DEFAULT '2026',
  allow_sale_without_stock BOOLEAN DEFAULT TRUE,
  auto_reserve_on_receipt BOOLEAN DEFAULT TRUE,
  min_stock_alert INTEGER DEFAULT 5,
  reference_sizes JSONB
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS genéricas para usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir leitura de produtos" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir leitura de vendas" ON public.sales FOR SELECT USING (auth.role() = 'authenticated');

-- Inserção de categorias e configurações padrão
INSERT INTO public.app_settings (id, club_name, season_year) 
VALUES (1, 'Clube de Desbravadores Pioneiros da Colina', '2026')
ON CONFLICT (id) DO NOTHING;
`;
