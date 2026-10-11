-- ==============================================================================
-- RED SHARK STOREFRONT & POS CLOUD SYNC — SUPABASE SCHEMA
-- Multi-Tenant E-Commerce Platform with Live POS Inventory & Order Dispatch
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS / SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_phone TEXT,
    owner_email TEXT,
    currency TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    currency_lbp_rate NUMERIC DEFAULT 89500,
    is_active BOOLEAN DEFAULT true,
    
    -- Storefront Settings
    link_pos_stock BOOLEAN DEFAULT true,       -- TRUE = Live POS stock, FALSE = Independent web catalog
    allow_out_of_stock BOOLEAN DEFAULT false,   -- Allow ordering when stock is 0
    delivery_fee NUMERIC DEFAULT 2.00,
    min_order NUMERIC DEFAULT 5.00,
    whatsapp_phone TEXT,
    theme TEXT DEFAULT 'fresh-light',           -- 'fresh-light' or 'dark'
    logo_url TEXT,
    banner_url TEXT,
    address TEXT,
    description_ar TEXT,
    description_en TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Upgrade existing tenants table if it was created previously
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '$';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS currency_lbp_rate NUMERIC DEFAULT 89500;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS link_pos_stock BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS allow_out_of_stock BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 2.00;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS min_order NUMERIC DEFAULT 5.00;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'fresh-light';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backward-compatibility view: 'shops' pointing to 'tenants'
CREATE OR REPLACE VIEW public.shops AS 
SELECT 
    id, 
    shop_name AS name, 
    shop_name, 
    slug, 
    owner_phone, 
    owner_email, 
    currency, 
    currency_symbol, 
    currency_lbp_rate, 
    is_active, 
    link_pos_stock, 
    allow_out_of_stock, 
    delivery_fee, 
    min_order, 
    whatsapp_phone, 
    theme, 
    logo_url, 
    banner_url, 
    address, 
    description_ar, 
    description_en, 
    created_at, 
    updated_at
FROM public.tenants;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
    name_en TEXT,
    slug TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shop_id, slug)
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    pos_product_id TEXT,                        -- ID from local Red Shark POS DB
    name TEXT NOT NULL,
    name_ar TEXT,
    name_en TEXT,
    description TEXT,
    description_ar TEXT,
    description_en TEXT,
    barcode TEXT,
    price NUMERIC NOT NULL DEFAULT 0.00,
    cost_price NUMERIC DEFAULT 0.00,
    stock_quantity INT DEFAULT 100,             -- Live Stock Quantity synced from POS
    track_inventory BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shop_id, pos_product_id)
);

-- Upgrade existing products table if it was created previously
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pos_product_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT,
    notes TEXT,
    subtotal NUMERIC NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00,
    currency_code TEXT DEFAULT 'USD',
    payment_method TEXT DEFAULT 'cod',          -- 'cod' (Cash On Delivery), 'whish', 'card'
    payment_status TEXT DEFAULT 'pending',      -- 'pending', 'paid'
    order_status TEXT DEFAULT 'received',       -- 'received', 'preparing', 'out_for_delivery', 'completed', 'cancelled'
    items JSONB DEFAULT '[]'::jsonb,            -- Cached JSON items snapshot
    pos_synced BOOLEAN DEFAULT false,           -- True when converted to POS Sale
    pos_invoice_ref TEXT,                       -- POS Invoice Reference (e.g. INV-10029)
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Upgrade existing orders table if it was created previously
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pos_synced BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pos_invoice_ref TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 5. ORDER ITEMS TABLE (Granular line items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0.00,
    total_price NUMERIC NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INDEXES FOR LIGHTNING FAST QUERIES
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.orders(shop_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow public read of active tenants & published catalog
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;
CREATE POLICY "Public can view active tenants" ON public.tenants FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products FOR SELECT USING (is_published = true);

-- Allow public (customers) to create orders & order items
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view their own orders" ON public.orders;
CREATE POLICY "Public can view their own orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items" ON public.order_items FOR SELECT USING (true);

-- Allow POS systems & Admin with API key to insert / update
DROP POLICY IF EXISTS "Full access with anon/service key" ON public.tenants;
CREATE POLICY "Full access with anon/service key" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full products management" ON public.products;
CREATE POLICY "Full products management" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full categories management" ON public.categories;
CREATE POLICY "Full categories management" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full orders management" ON public.orders;
CREATE POLICY "Full orders management" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 8. DEMO SEED DATA (Default shop: shop101)
INSERT INTO public.tenants (
    id, shop_name, slug, owner_phone, owner_email, currency, currency_symbol,
    link_pos_stock, allow_out_of_stock, delivery_fee, min_order, whatsapp_phone,
    theme, address, description_ar, description_en
) VALUES (
    'a1000000-0000-0000-0000-000000000101',
    'Red Shark Supermarket',
    'shop101',
    '+96170123456',
    'support@redshark-ai.com',
    'USD',
    '$',
    true,
    false,
    2.00,
    5.00,
    '+96170123456',
    'fresh-light',
    'Beirut Central, Downtown',
    'أفضل تشكيلة من المنتجات الغذائية والمواد التموينية الطازجة تصلك إلى باب بيتك بأسرع وقت.',
    'Finest selection of groceries and fresh household items delivered straight to your doorstep.'
) ON CONFLICT (slug) DO UPDATE SET
    shop_name = EXCLUDED.shop_name,
    link_pos_stock = EXCLUDED.link_pos_stock,
    whatsapp_phone = EXCLUDED.whatsapp_phone;

-- Enable Realtime for orders table safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
