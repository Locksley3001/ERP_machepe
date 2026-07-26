create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'employee');
create type public.inventory_kind as enum ('raw_material', 'packaging', 'prepared', 'finished_product', 'cleaning', 'asset', 'tool');
create type public.inventory_status as enum ('active', 'inactive', 'low_stock', 'out_of_stock');
create type public.movement_type as enum ('purchase', 'sale', 'production_input', 'production_output', 'manual_adjustment');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'mixed');
create type public.audit_action as enum ('create', 'update', 'delete', 'void', 'login', 'export');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  contact text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  socials text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  module text not null check (module in ('inventory', 'menu')),
  created_at timestamptz not null default now(),
  unique (name, module, parent_id)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  kind public.inventory_kind not null,
  description text,
  unit text not null,
  quantity numeric(14, 3) not null default 0,
  minimum_quantity numeric(14, 3) not null default 0,
  maximum_quantity numeric(14, 3) not null default 0,
  purchase_cost numeric(14, 2) not null default 0,
  average_cost numeric(14, 2) not null default 0,
  reference_price numeric(14, 2) not null default 0,
  status public.inventory_status not null default 'active',
  location text,
  barcode text,
  image_url text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  expiration_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_quantity_non_negative check (quantity >= 0)
);

create table public.menu_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(14, 2) not null check (price >= 0),
  favorite boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.menu_products(id) on delete cascade,
  version integer not null default 1,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (product_id, version)
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit text not null,
  unit_cost_snapshot numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (recipe_id, inventory_item_id)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  invoice_number text not null,
  purchased_at timestamptz not null default now(),
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (supplier_id, invoice_number)
);

create table public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  tax_rate numeric(6, 4) not null default 0,
  discount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) generated always as ((quantity * unit_cost) + ((quantity * unit_cost) * tax_rate) - discount) stored
);

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  output_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity_produced numeric(14, 3) not null check (quantity_produced > 0),
  total_cost numeric(14, 2) not null default 0,
  responsible_id uuid references public.profiles(id) on delete set null,
  produced_at timestamptz not null default now(),
  notes text
);

create table public.production_inputs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost_snapshot numeric(14, 2) not null default 0
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  sold_at timestamptz not null default now(),
  payment_method public.payment_method not null,
  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  cost_total numeric(14, 2) not null default 0,
  gross_profit numeric(14, 2) generated always as (total - cost_total) stored,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.menu_products(id) on delete restrict,
  recipe_id uuid references public.recipes(id) on delete restrict,
  product_name_snapshot text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(14, 2) not null default 0,
  line_total numeric(14, 2) generated always as (quantity * unit_price) stored
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  type public.movement_type not null,
  quantity numeric(14, 3) not null,
  unit_cost numeric(14, 2) not null default 0,
  occurred_at timestamptz not null default now(),
  reference_table text,
  reference_id uuid,
  notes text,
  responsible_id uuid references public.profiles(id) on delete set null
);

create table public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  expense_date date not null,
  category text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action public.audit_action not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index inventory_items_code_idx on public.inventory_items (code);
create index inventory_items_supplier_idx on public.inventory_items (supplier_id);
create index inventory_movements_item_date_idx on public.inventory_movements (inventory_item_id, occurred_at desc);
create index sales_sold_at_idx on public.sales (sold_at desc);
create index purchases_purchased_at_idx on public.purchases (purchased_at desc);
create index production_batches_produced_at_idx on public.production_batches (produced_at desc);
create index audit_log_actor_created_idx on public.audit_log (actor_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger suppliers_set_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger inventory_items_set_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();

create trigger menu_products_set_updated_at before update on public.menu_products
for each row execute function public.set_updated_at();

create or replace function public.refresh_inventory_status(item_id uuid)
returns void
language plpgsql
as $$
begin
  update public.inventory_items
  set status = case
    when quantity <= 0 then 'out_of_stock'::public.inventory_status
    when quantity <= minimum_quantity then 'low_stock'::public.inventory_status
    else 'active'::public.inventory_status
  end
  where id = item_id;
end;
$$;

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
as $$
begin
  update public.inventory_items
  set quantity = quantity + new.quantity
  where id = new.inventory_item_id;

  perform public.refresh_inventory_status(new.inventory_item_id);
  return new;
end;
$$;

create trigger inventory_movements_apply after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.categories enable row level security;
alter table public.inventory_items enable row level security;
alter table public.menu_products enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_lines enable row level security;
alter table public.production_batches enable row level security;
alter table public.production_inputs enable row level security;
alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'::public.user_role
$$;

create policy "authenticated read profiles" on public.profiles
for select to authenticated using (true);

create policy "admin manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read suppliers" on public.suppliers
for select to authenticated using (true);

create policy "admin manage suppliers" on public.suppliers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read catalog" on public.categories
for select to authenticated using (true);

create policy "admin manage catalog" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read inventory" on public.inventory_items
for select to authenticated using (true);

create policy "admin manage inventory" on public.inventory_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read menu" on public.menu_products
for select to authenticated using (true);

create policy "admin manage menu" on public.menu_products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read recipes" on public.recipes
for select to authenticated using (true);

create policy "admin manage recipes" on public.recipes
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read recipe items" on public.recipe_items
for select to authenticated using (true);

create policy "admin manage recipe items" on public.recipe_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated sales access" on public.sales
for all to authenticated using (true) with check (true);

create policy "authenticated sale lines access" on public.sale_lines
for all to authenticated using (true) with check (true);

create policy "authenticated operations read" on public.inventory_movements
for select to authenticated using (true);

create policy "authenticated operations write" on public.inventory_movements
for insert to authenticated with check (true);

create policy "authenticated purchases access" on public.purchases
for all to authenticated using (true) with check (true);

create policy "authenticated purchase lines access" on public.purchase_lines
for all to authenticated using (true) with check (true);

create policy "authenticated production access" on public.production_batches
for all to authenticated using (true) with check (true);

create policy "authenticated production input access" on public.production_inputs
for all to authenticated using (true) with check (true);

create policy "admin manage expenses" on public.operating_expenses
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin read audit" on public.audit_log
for select to authenticated using (public.is_admin());

create policy "authenticated write audit" on public.audit_log
for insert to authenticated with check (true);
