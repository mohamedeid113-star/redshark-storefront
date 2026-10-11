/**
 * Red Shark Storefront — Supabase Cloud API Client
 * Lightweight, zero-dependency REST & Realtime client for Supabase
 */

const StorefrontAPI = (() => {
  const DEFAULT_SUPABASE_URL = "https://mcebwpiswvwqcdwjpagy.supabase.co";
  const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWJ3cGlzd3Z3cWNkd2pwYWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODg5ODAsImV4cCI6MjEwMjQ2NDk4MH0.yCS4QNC4ovg_KT_GSFh2NdTN94jvFXg9la1uHlmq3yg";

  function getUrl() {
    return localStorage.getItem('rs_supabase_url') || DEFAULT_SUPABASE_URL;
  }

  function getKey() {
    return localStorage.getItem('rs_supabase_key') || DEFAULT_SUPABASE_KEY;
  }

  function getHeaders() {
    const key = getKey();
    return {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };
  }

  // 1. Fetch Tenant details by Slug
  async function fetchTenant(slug) {
    try {
      const url = `${getUrl()}/rest/v1/tenants?slug=eq.${encodeURIComponent(slug)}&select=*`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) return data[0];
      }
      // Fallback check against 'shops' if tenants returns nothing
      const shopRes = await fetch(`${getUrl()}/rest/v1/shops?slug=eq.${encodeURIComponent(slug)}&select=*`, { headers: getHeaders() });
      if (shopRes.ok) {
        const shops = await shopRes.json();
        if (shops && shops.length > 0) return shops[0];
      }
    } catch (err) {
      console.error('[StorefrontAPI] Error fetching tenant:', err);
    }
    return null;
  }

  // 2. Fetch Categories for Shop
  async function fetchCategories(shopId) {
    try {
      const url = `${getUrl()}/rest/v1/categories?shop_id=eq.${shopId}&is_active=eq.true&order=display_order.asc`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('[StorefrontAPI] Error fetching categories:', err);
    }
    return [];
  }

  // 3. Fetch Products for Shop
  async function fetchProducts(shopId) {
    try {
      let allProducts = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const to = from + pageSize - 1;
        const url = `${getUrl()}/rest/v1/products?shop_id=eq.${shopId}&is_published=eq.true&order=created_at.desc`;
        const res = await fetch(url, {
          headers: {
            ...getHeaders(),
            'Range-Unit': 'items',
            'Range': `${from}-${to}`
          }
        });
        if (!res.ok) break;
        const page = await res.json();
        if (!Array.isArray(page) || page.length === 0) break;
        allProducts = allProducts.concat(page);
        if (page.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      }
      return allProducts;
    } catch (err) {
      console.error('[StorefrontAPI] Error fetching products:', err);
      return [];
    }
  }

  // 4. Submit New Online Order
  async function submitOrder(orderData) {
    try {
      const url = `${getUrl()}/rest/v1/orders`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        const result = await res.json();
        const createdOrder = result[0] || result;

        // Also insert into order_items table for relational integrity
        if (createdOrder && createdOrder.id && Array.isArray(orderData.items) && orderData.items.length > 0) {
          try {
            const lineItems = orderData.items.map(it => ({
              order_id: createdOrder.id,
              product_id: it.product_id || null,
              product_name: it.product_name || it.name,
              quantity: it.quantity || 1,
              unit_price: it.unit_price || it.price || 0,
              total_price: (it.unit_price || it.price || 0) * (it.quantity || 1)
            }));
            await fetch(`${getUrl()}/rest/v1/order_items`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(lineItems)
            });
          } catch(errLine) {
            console.warn('[StorefrontAPI] Line items insert note:', errLine);
          }
        }

        return { success: true, order: createdOrder };
      }
      const errText = await res.text();
      return { success: false, error: errText };
    } catch (err) {
      console.error('[StorefrontAPI] Submit order error:', err);
      return { success: false, error: err.message };
    }
  }

  return {
    fetchTenant,
    fetchCategories,
    fetchProducts,
    submitOrder,
    getUrl,
    getKey
  };
})();

window.StorefrontAPI = StorefrontAPI;
