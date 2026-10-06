-- =====================================================================
-- Room Scent · Shop + POS  (รันทั้งไฟล์ใน Supabase → SQL Editor ได้ซ้ำหลายครั้ง)
-- ใช้ได้ทั้งโปรเจกต์ใหม่ และโปรเจกต์ mini-pos เดิมที่มีตาราง products / sales อยู่แล้ว
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- 1) products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  price numeric not null default 0,
  stock integer not null default 0,
  unit text not null default 'ชิ้น',
  created_at timestamptz default now()
);

alter table public.products add column if not exists mood text;
alter table public.products add column if not exists type text not null default 'spray';
alter table public.products add column if not exists size text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists online boolean not null default false; -- แสดงในหน้าร้านออนไลน์

do $$ begin
  alter table public.products add constraint products_price_nonneg check (price >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_stock_nonneg check (stock >= 0);
exception when duplicate_object or check_violation then null; end $$;
do $$ begin
  alter table public.products add constraint products_mood_valid check (mood is null or mood in ('fresh','relax','focus','romance'));
exception when duplicate_object then null; end $$;

-- ---------- 2) orders (ออเดอร์จากหน้าร้านออนไลน์) ----------
create sequence if not exists public.order_no_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('RS-' || lpad(nextval('public.order_no_seq')::text, 4, '0')),
  customer_name text not null,
  contact text not null,
  note text,
  items jsonb not null,
  total numeric not null,
  status text not null default 'new' check (status in ('new','confirmed','shipped','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 3) sales (ทุกการขาย: หน้าร้าน + ออนไลน์) ----------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  product_name text not null,
  quantity integer not null,
  total_price numeric not null,
  sold_at timestamptz default now()
);

alter table public.sales add column if not exists channel text not null default 'pos';
alter table public.sales add column if not exists bill_no text;
alter table public.sales add column if not exists order_id uuid references public.orders(id) on delete cascade;

-- เดิมลบสินค้าที่เคยขายแล้วไม่ได้ (FK บล็อก) -> ให้ประวัติการขายเก็บชื่อไว้ และตั้ง product_id เป็น null แทน
alter table public.sales drop constraint if exists sales_product_id_fkey;
alter table public.sales add constraint sales_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

-- ---------- 4) Row Level Security ----------
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.orders enable row level security;

-- ลบ policy เดิมทั้งหมดของ 3 ตารางนี้ (mini-pos เดิมเปิดให้ทุกคนแก้ได้)
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('products','sales','orders')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ลูกค้า (anon) เห็นเฉพาะสินค้าที่เปิดขายออนไลน์
create policy shop_read_products on public.products for select to anon using (online);
-- พนักงาน (ล็อกอินแล้ว) จัดการสินค้าได้ทั้งหมด
create policy staff_all_products on public.products for all to authenticated using (true) with check (true);
-- ประวัติการขายและออเดอร์: พนักงานอ่านได้ (การเขียนทำผ่านฟังก์ชันด้านล่างเท่านั้น)
create policy staff_read_sales on public.sales for select to authenticated using (true);
create policy staff_read_orders on public.orders for select to authenticated using (true);

-- ---------- 5) ฟังก์ชันขายหน้าร้าน (POS): ตัดสต็อก + บันทึกการขายในทรานแซกชันเดียว ----------
create or replace function public.pos_checkout(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  p public.products%rowtype;
  q integer;
  v_bill text := 'POS-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMMDD-HH24MI') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authorized';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items';
  end if;

  -- เรียงตาม id เพื่อกัน deadlock เมื่อมีหลายเครื่องขายพร้อมกัน
  for it in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    q := (it->>'qty')::integer;
    if q is null or q < 1 or q > 999 then
      raise exception 'invalid_qty';
    end if;
    select * into p from public.products where id = (it->>'product_id')::uuid for update;
    if not found then
      raise exception 'product_not_found';
    end if;
    if p.stock < q then
      raise exception 'insufficient_stock:%', p.name;
    end if;
    update public.products set stock = stock - q where id = p.id;
    insert into public.sales (product_id, product_name, quantity, total_price, sold_at, channel, bill_no)
    values (p.id, p.name, q, p.price * q, now(), 'pos', v_bill);
    v_total := v_total + p.price * q;
    v_lines := v_lines || jsonb_build_object('name', p.name, 'qty', q, 'unit', p.unit, 'total', p.price * q, 'remaining', p.stock - q);
  end loop;

  return jsonb_build_object('bill_no', v_bill, 'total', v_total, 'lines', v_lines);
end $$;

-- ---------- 6) ฟังก์ชันสั่งซื้อออนไลน์: ราคา/สต็อกตรวจจากฐานข้อมูล ไม่เชื่อค่าที่ส่งมาจากเบราว์เซอร์ ----------
create or replace function public.place_online_order(p_name text, p_contact text, p_note text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  p public.products%rowtype;
  q integer;
  v_order public.orders%rowtype;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_name text := btrim(coalesce(p_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if length(v_name) < 2 or length(v_name) > 100 then raise exception 'invalid_name'; end if;
  if length(v_contact) < 3 or length(v_contact) > 100 then raise exception 'invalid_contact'; end if;
  if v_note is not null and length(v_note) > 1000 then raise exception 'invalid_note'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid_items';
  end if;
  -- กันการยิงออเดอร์ปลอมรัวๆ (ระบบร้านเล็ก): ไม่เกิน 10 ออเดอร์ต่อนาที
  if (select count(*) from public.orders where created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too_many_orders';
  end if;

  insert into public.orders (customer_name, contact, note, items, total)
  values (v_name, v_contact, v_note, '[]'::jsonb, 0)
  returning * into v_order;

  for it in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    q := (it->>'qty')::integer;
    if q is null or q < 1 or q > 20 then raise exception 'invalid_qty'; end if;
    select * into p from public.products where id = (it->>'product_id')::uuid and online for update;
    if not found then raise exception 'product_not_found'; end if;
    if p.stock < q then raise exception 'insufficient_stock:%', p.name; end if;
    update public.products set stock = stock - q where id = p.id;
    insert into public.sales (product_id, product_name, quantity, total_price, sold_at, channel, order_id)
    values (p.id, p.name, q, p.price * q, now(), 'online', v_order.id);
    v_total := v_total + p.price * q;
    v_lines := v_lines || jsonb_build_object('product_id', p.id, 'name', p.name, 'qty', q, 'price', p.price, 'total', p.price * q, 'remaining', p.stock - q, 'unit', p.unit);
  end loop;

  update public.orders set items = v_lines, total = v_total where id = v_order.id;
  return jsonb_build_object('order_no', v_order.order_no, 'total', v_total, 'lines', v_lines,
                            'customer_name', v_name, 'contact', v_contact, 'note', v_note);
end $$;

-- ---------- 7) เปลี่ยนสถานะออเดอร์ (ยกเลิก = คืนสต็อก + ลบยอดขายของออเดอร์นั้น) ----------
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  s record;
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  if p_status not in ('new','confirmed','shipped','cancelled') then raise exception 'invalid_status'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status = 'cancelled' then raise exception 'order_already_cancelled'; end if;

  if p_status = 'cancelled' then
    for s in select product_id, quantity from public.sales where order_id = v_order.id and product_id is not null loop
      update public.products set stock = stock + s.quantity where id = s.product_id;
    end loop;
    delete from public.sales where order_id = v_order.id;
  end if;

  update public.orders set status = p_status, updated_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end $$;

revoke all on function public.pos_checkout(jsonb) from public, anon;
revoke all on function public.set_order_status(uuid, text) from public, anon;
revoke all on function public.place_online_order(text, text, text, jsonb) from public;
grant execute on function public.pos_checkout(jsonb) to authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;
grant execute on function public.place_online_order(text, text, text, jsonb) to anon, authenticated;

-- ---------- 8) สินค้าตัวอย่างของ Room Scent (เพิ่มเฉพาะที่ยังไม่มี SKU นี้) ----------
insert into public.products (sku, name, price, stock, unit, mood, type, size, image_url, description, online) values
  ('RS-FR-30',  'Room Spray Fresh 30ml',    89, 20, 'ขวด', 'fresh',   'spray',  '30ml',  '/images/fresh.jpg',   'กลิ่นสะอาด โปร่งเบา ช่วยให้ห้องรู้สึกสดชื่นพร้อมเริ่มวันใหม่', true),
  ('RS-FR-100', 'Room Spray Fresh 100ml',  199, 20, 'ขวด', 'fresh',   'spray',  '100ml', '/images/fresh.jpg',   'กลิ่นสะอาด โปร่งเบา ช่วยให้ห้องรู้สึกสดชื่นพร้อมเริ่มวันใหม่', true),
  ('RS-RL-30',  'Room Spray Relax 30ml',    89, 20, 'ขวด', 'relax',   'spray',  '30ml',  '/images/relax.jpg',   'กลิ่นนุ่มละมุน ช่วยให้ห้องผ่อนคลาย เหมาะกับช่วงพักหลังจบวัน', true),
  ('RS-RL-100', 'Room Spray Relax 100ml',  199, 20, 'ขวด', 'relax',   'spray',  '100ml', '/images/relax.jpg',   'กลิ่นนุ่มละมุน ช่วยให้ห้องผ่อนคลาย เหมาะกับช่วงพักหลังจบวัน', true),
  ('RS-FC-30',  'Room Spray Focus 30ml',    89, 20, 'ขวด', 'focus',   'spray',  '30ml',  '/images/focus.jpg',   'กลิ่นสงบและชัดเจน ช่วยให้ห้องเงียบนิ่ง เหมาะกับเวลาทำงานหรืออ่านหนังสือ', true),
  ('RS-FC-100', 'Room Spray Focus 100ml',  199, 20, 'ขวด', 'focus',   'spray',  '100ml', '/images/focus.jpg',   'กลิ่นสงบและชัดเจน ช่วยให้ห้องเงียบนิ่ง เหมาะกับเวลาทำงานหรืออ่านหนังสือ', true),
  ('RS-RM-30',  'Room Spray Romance 30ml',  89, 20, 'ขวด', 'romance', 'spray',  '30ml',  '/images/romance.jpg', 'กลิ่นอบอุ่นหวานนุ่ม สร้างบรรยากาศส่วนตัวให้ห้องดูอบอุ่นน่าอยู่', true),
  ('RS-RM-100', 'Room Spray Romance 100ml',199, 20, 'ขวด', 'romance', 'spray',  '100ml', '/images/romance.jpg', 'กลิ่นอบอุ่นหวานนุ่ม สร้างบรรยากาศส่วนตัวให้ห้องดูอบอุ่นน่าอยู่', true),
  ('CD-RL',     'เทียนหอม Relax',          149, 15, 'ชิ้น', 'relax',   'candle', null,    '/images/candle-relax.jpg',   'เทียนหอมกลิ่นนุ่มละมุน จุดแล้วช่วยให้ห้องผ่อนคลายด้วยแสงเทียนและกลิ่นหอมอ่อนๆ', true),
  ('CD-RM',     'เทียนหอม Romance',        149, 15, 'ชิ้น', 'romance', 'candle', null,    '/images/candle-romance.jpg', 'เทียนหอมกลิ่นอบอุ่นหวานนุ่ม จุดแล้วช่วยสร้างบรรยากาศส่วนตัวในห้อง', true)
on conflict (sku) do nothing;

-- รูปเทียนหอมชุดใหม่ (ถ้าเคยรันไฟล์นี้ไปแล้วตอนเทียนยังใช้รูปสเปรย์)
update public.products set image_url = '/images/candle-relax.jpg' where sku = 'CD-RL' and image_url = '/images/relax.jpg';
update public.products set image_url = '/images/candle-romance.jpg' where sku = 'CD-RM' and image_url = '/images/romance.jpg';

-- ---------- 9) Realtime (ไม่บังคับ): ให้หน้าออเดอร์อัปเดตทันที ----------
-- alter publication supabase_realtime add table public.orders;
