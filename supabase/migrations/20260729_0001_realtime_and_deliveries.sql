-- Migration: Enable Realtime and delivery sync
-- Date: 2026-07-29

-- Enable publication for Supabase Realtime if not already enabled
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Add tables to realtime publication safely
alter publication supabase_realtime add table public.sales;
alter publication supabase_realtime add table public.sale_items;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.product_variants;
alter publication supabase_realtime add table public.delivery_records;
alter publication supabase_realtime add table public.delivery_items;
alter publication supabase_realtime add table public.purchase_batches;
alter publication supabase_realtime add table public.members;
