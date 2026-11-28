/**
 * Red Shark Storefront — Core Application Controller
 * Big Categories Grid on First Open, Category Detail View, Live Search, Multi-Offer Carousel
 */

const Storefront = (() => {
  let _tenant = null;
  let _categories = [];
  let _categoryImages = {};
  let _products = [];
  let _isLoadingProducts = true;
  let _cart = [];
  let _currentLang = localStorage.getItem('rs_lang') || 'en';
  let _currentTheme = localStorage.getItem('rs_theme') || 'fresh-light';
  let _selectedCategory = 'all'; // 'all', or category id
  let _viewMode = 'categories'; // 'categories' (big grid) or 'products' (items grid)
  let _searchQuery = '';
  let _deferredPrompt = null;
  
  // Carousel state
  let _carouselSlides = [];
  let _currentSlideIndex = 0;
  let _carouselTimer = null;

  // What the store manager saved (tenants.banner_url JSON): offers, brand, announcement…
  let _banner = {};
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const _attrUrl = (u) => String(u || '').replace(/"/g, '%22').replace(/'/g, '%27');
  function parseBanner(t) { try { const r = t && t.banner_url; if (r && typeof r === 'object') return r; const s = String(r || '').trim(); return s.startsWith('{') ? JSON.parse(s) : {}; } catch (e) { return {}; } }
  // Product ids are numbers on a shop's own server and text in the cloud: compare them as text.
  function normProd(p) { if (p && p.id != null) p.id = String(p.id); return p; }
  const findProd = (id) => _products.find(p => String(p.id) === String(id));
  // Products and categories the shop chose to show (store manager → Products / Categories).
  function hiddenCatSet() { return new Set((Array.isArray(_banner.hidden_categories) ? _banner.hidden_categories : []).map(String)); }
  function visibleProd(p) {
    if (!p) return false;
    if (p.category_id != null && hiddenCatSet().has(String(p.category_id))) return false;
    const vis = _banner.product_visibility || {};
    const v = vis[String(p.id)];
    return typeof v === 'boolean' ? v : p.is_published !== false;
  }
  // Hidden categories, and categories with nothing to sell, are not shown to customers.
  function shownCategories() {
    const hid = hiddenCatSet();
    return _categories.filter(c => !hid.has(String(c.id)) && (_isLoadingProducts || _products.some(p => String(p.category_id) === String(c.id))));
  }
  function shopDate() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  const inDates = (x) => { const d = shopDate(); return (!x.starts_at || x.starts_at <= d) && (!x.ends_at || x.ends_at >= d); };
  function activeOffer(prod) {
    if (!prod) return null;
    const list = Array.isArray(_banner.online_offers) ? _banner.online_offers : [];
    const o = list.find(x => x && String(x.product_id) === String(prod.id) && x.active !== false && inDates(x));
    if (!o) return null;
    const reg = parseFloat(prod.price) || 0, p = parseFloat(o.price);
    return (isFinite(p) && p >= 0 && p < reg) ? o : null;
  }
  function effPrice(prod) { const o = activeOffer(prod); return o ? parseFloat(o.price) : (parseFloat(prod && prod.price) || 0); }
  function shopWhatsApp() {
    let d = String((_tenant && (_tenant.whatsapp_phone || _tenant.owner_phone)) || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 8 || d.length === 7) d = '961' + d;
    return d.length >= 8 ? d : '';
  }

  const DEFAULT_CAT_IMAGES = {
    'fruits': 'assets/categories/fruits_vegetables.jpg',
    'dairy': 'assets/categories/dairy_cheese.jpg',
    'bakery': 'assets/categories/bakery_pastry.jpg',
    'beverages': 'assets/categories/beverages_coffee.jpg',
    'meats': 'assets/categories/meats_poultry.jpg',
    'snacks': 'assets/categories/snacks_sweets.jpg',
    'general': 'assets/categories/fruits_vegetables.jpg'
  };

    const I18N = {
    ar: {
      openNow: 'مفتوح للطلبات الآن',
      closed: 'المتجر مغلق حالياً',
      searchPlaceholder: 'ابحث بالاسم أو الباركود...',
      allCategories: 'جميع الأقسام',
      browseCategories: 'الأقسام',
      allProducts: 'جميع الأصناف',
      categoriesTitle: '📂 أقسام وتصنيفات المتجر',
      categoriesSubtitle: 'اختر القسم لتصفح منتجاته أو اضغط عرض جميع الأصناف',
      viewAllProducts: 'عرض جميع الأصناف',
      backToCategories: 'الرجوع لجميع الأقسام',
      browseCategory: 'تصفح القسم ←',
      itemsCount: 'صنف',
      inStock: 'متوفر',
      lowStock: 'الكمية محدودة',
      outOfStock: 'نفد من المتجر',
      remaining: 'بقي',
      addToCart: 'إضافة للسلة',
      cartTitle: 'سلة المشتريات',
      clearCart: 'إفراغ السلة',
      emptyCart: 'السلة فارغة. اضغط + على أي صنف لإضافته',
      subtotal: 'المجموع الفرعي',
      deliveryFee: 'أجور التوصيل',
      grandTotal: 'الإجمالي النهائي',
      placeOrder: 'تأكيد وإرسال الطلب الآن',
      orderViaWhatsApp: 'طلب سريع عبر واتساب',
      nameLabel: 'الاسم الكامل *',
      namePlaceholder: 'مثال: رابح أحمد',
      phoneLabel: 'رقم الهاتف (واتساب) *',
      phonePlaceholder: 'مثال: 70 123 456',
      addressLabel: 'عنوان التوصيل *',
      addressPlaceholder: 'المدينة، الشارع، البناية...',
      notesLabel: 'ملاحظات إضافية (اختياري)',
      notesPlaceholder: 'ملاحظات للتحضير أو السائق...',
      mobCartTitle: 'سلة التسوق',
      mobCartItemsUnit: 'أصناف',
      mobCartBtn: 'عرض السلة',
      modalCartTitle: '🛍️ مراجعة الطلب وسلة التسوق',
      successTitle: '🎉 تم إرسال طلبك بنجاح!',
      successDesc: 'وصل طلبك مباشرة إلى نظام الكاشير وسيتم البدء بتحضيره فوراً.',
      orderIdLabel: 'رقم الطلب',
      totalLabel: 'الإجمالي',
      continueShopping: 'متابعة التسوق',
      currencyLBP: 'ل.ل',
      fillRequired: 'يرجى إدخال الاسم ورقم الهاتف وعنوان التوصيل.',
      orderFailed: 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً أو الطلب عبر واتساب.',
      cartCleared: 'تم تفريغ السلة',
      noCategories: 'لا توجد أقسام مسجلة',
      noProducts: 'لا توجد أصناف في هذا القسم حالياً',
      allProductsHeading: 'جميع أصناف المتجر',
      viewingCategory: 'أصناف قسم',
      liveStockBadge: 'مربوط بمخزون الكاشير المباشر',
      menuModeBadge: 'قائمة أصناف المتجر أونلاين'
    },
    en: {
      openNow: 'Open for Orders Now',
      closed: 'Currently Closed',
      searchPlaceholder: 'Search by item name or barcode...',
      allCategories: 'All Categories',
      browseCategories: 'Categories',
      allProducts: 'All Products',
      categoriesTitle: '📂 Store Categories & Departments',
      categoriesSubtitle: 'Select a category to view items or click View All Products',
      viewAllProducts: 'View All Products',
      backToCategories: 'Back to Categories',
      browseCategory: 'Browse Category →',
      itemsCount: 'items',
      inStock: 'In Stock',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      remaining: 'Only',
      addToCart: 'Add to Cart',
      cartTitle: 'Shopping Cart',
      clearCart: 'Clear Cart',
      emptyCart: 'Cart is empty. Tap + on any item to add',
      subtotal: 'Subtotal',
      deliveryFee: 'Delivery Fee',
      grandTotal: 'Grand Total',
      placeOrder: 'Confirm & Place Order',
      orderViaWhatsApp: 'Fast WhatsApp Order',
      nameLabel: 'Full Name *',
      namePlaceholder: 'e.g. John Smith',
      phoneLabel: 'Phone (WhatsApp) *',
      phonePlaceholder: 'e.g. 70 123 456',
      addressLabel: 'Delivery Address *',
      addressPlaceholder: 'City, street, building, apartment...',
      notesLabel: 'Order Notes (Optional)',
      notesPlaceholder: 'Special instructions or notes...',
      mobCartTitle: 'Shopping Cart',
      mobCartItemsUnit: 'items',
      mobCartBtn: 'View Cart',
      modalCartTitle: '🛍️ Review Order & Cart',
      successTitle: '🎉 Order Placed Successfully!',
      successDesc: 'Your order has been received by our POS cashier and is being prepared now.',
      orderIdLabel: 'Order ID',
      totalLabel: 'Total',
      continueShopping: 'Continue Shopping',
      currencyLBP: 'LBP',
      fillRequired: 'Please fill in your name, phone number, and delivery address.',
      orderFailed: 'Failed to submit order, please try again or order via WhatsApp.',
      cartCleared: 'Cart cleared',
      noCategories: 'No categories available',
      noProducts: 'No products in this department yet',
      allProductsHeading: 'All Store Products',
      viewingCategory: 'Category: ',
      liveStockBadge: 'Live POS Stock Connected',
      menuModeBadge: 'Online Store Catalog'
    }
  };

  function t(k) { return (I18N[_currentLang] && I18N[_currentLang][k]) || k; }

  function getShopSlug() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shop') && params.get('shop').trim()) {
      const s = params.get('shop').trim().toLowerCase();
      if (s !== 'shop' && s !== 'null' && s !== 'undefined') {
        localStorage.setItem('rs_last_shop_slug', s);
        return s;
      }
    }
    if (params.get('slug') && params.get('slug').trim()) {
      const s = params.get('slug').trim().toLowerCase();
      if (s !== 'shop' && s !== 'null' && s !== 'undefined') {
        localStorage.setItem('rs_last_shop_slug', s);
        return s;
      }
    }

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const sIdx = pathParts.indexOf('store');
    if (sIdx !== -1 && pathParts[sIdx + 1]) {
      const s = pathParts[sIdx + 1].trim().toLowerCase();
      if (s !== 'shop' && s !== 'null' && s !== 'undefined') {
        localStorage.setItem('rs_last_shop_slug', s);
        return s;
      }
    }

    // Check subdomain, EXCLUDING system subdomains like shop, www, pos, app, admin
    const hostParts = window.location.hostname.toLowerCase().split('.');
    const systemSubdomains = ['shop', 'www', 'pos', 'app', 'api', 'admin', 'localhost', '127', 'demo'];
    if (hostParts.length > 2 && !systemSubdomains.includes(hostParts[0])) {
      const s = hostParts[0].trim();
      localStorage.setItem('rs_last_shop_slug', s);
      return s;
    }

    // Default when no slug is provided in the URL:
    return 'bobmarket';
  }

  
  function isArabicUi() { return (typeof _currentLang !== 'undefined' ? _currentLang : 'ar') === 'ar'; }
  // Last known shop name / logo per store, painted before the network answers (no Red Shark flash).
  function _brandCacheKey() { try { return 'rs_store_brand_' + (getShopSlug() || 'default'); } catch (e) { return 'rs_store_brand_default'; } }
  function _saveBrandCache(tn) {
    try { if (tn && tn.shop_name) localStorage.setItem(_brandCacheKey(), JSON.stringify({ name: tn.shop_name, logo: tn.logo_url || '' })); } catch (e) {}
  }
  function _paintCachedBrand() {
    try {
      const b = JSON.parse(localStorage.getItem(_brandCacheKey()) || 'null');
      if (!b || !b.name) return;
      document.title = b.name;
      const nm = document.getElementById('header-brand-name');
      if (nm && !nm.textContent) nm.textContent = b.name;
      const lg = document.getElementById('header-brand-logo');
      if (lg) {
        if (b.logo) lg.innerHTML = '<img src="' + String(b.logo).replace(/"/g, '&quot;') + '" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">';
        else lg.textContent = String(b.name).trim().charAt(0).toUpperCase();
      }
    } catch (e) {}
  }

  async function applyDynamicManifest(tenant, slug) {
    try {
      const cleanSlug = encodeURIComponent(slug || 'bobmarket');
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      // The shop's own name and logo go into the installed app (not Red Shark's).
      let extra = '';
      if (tenant && tenant.shop_name) extra += '&name=' + encodeURIComponent(tenant.shop_name);
      // A SQUARE icon only (phones refuse to install with a wide logo): the shop server's app icon,
      // or one this page draws from the shop logo and hands to the service worker.
      const brand0 = parseBanner(tenant).brand || {};
      let icon = (tenant && tenant.app_icon_url) || '';
      if (!icon && tenant && tenant.logo_url) icon = await makeShopIcon(tenant, slug);
      if (icon) extra += '&icon=' + encodeURIComponent(icon);
      const bc = brand0.color;
      if (/^#[0-9a-f]{6}$/i.test(bc || '')) extra += '&color=' + encodeURIComponent(bc);
      // the service worker answers manifest requests with this shop's own app (name, icon, start page)
      const controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      link.href = 'manifest.json?shop=' + cleanSlug + extra + '&v=28.2' + (controlled ? '&sw=1' : '');
    } catch(e) {
      console.warn('[Storefront] Dynamic manifest error:', e);
    }
  }

  // The shop logo drawn on a 512×512 square, kept in the browser (IndexedDB) for the service
  // worker, which hands it to the phone as the installed app's icon.
  const ICON_CACHE = 'rs-shop-icon';
  function iconDb() {
    return new Promise((resolve, reject) => {
      const rq = indexedDB.open('rs-shop-icons', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('icons');
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
  }
  async function iconDbOp(mode, fn) {
    const db = await iconDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('icons', mode);
        const rq = fn(tx.objectStore('icons'));
        tx.oncomplete = () => resolve(rq && rq.result);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  async function makeShopIcon(tenant, slug) {
    try {
      if (!window.indexedDB || !navigator.serviceWorker || !navigator.serviceWorker.controller) return '';
      const src = String(tenant.logo_url || '');
      let h = 0; for (let i = 0; i < src.length; i += 61) h = (h * 31 + src.charCodeAt(i)) | 0;
      const url = new URL('shop-icon/' + encodeURIComponent(slug || 'shop') + '.png?v=' + (src.length + '-' + (h >>> 0)), location.href).toString();
      const key = new URL(url).pathname + new URL(url).search;
      if (await iconDbOp('readonly', s => s.get(key))) return url;
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        if (!/^data:/i.test(src)) im.crossOrigin = 'anonymous';
        im.onload = () => resolve(im); im.onerror = reject; im.src = src;
      });
      const S = 512, box = S * 0.8, sc = Math.min(box / img.width, box / img.height);
      const w = Math.round(img.width * sc), hh = Math.round(img.height * sc);
      const c = document.createElement('canvas'); c.width = S; c.height = S;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, S, S);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, Math.round((S - w) / 2), Math.round((S - hh) / 2), w, hh);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      if (!blob) return '';
      // one icon per shop: replace this shop's older icons
      const prefix = new URL(url).pathname;
      await iconDbOp('readwrite', s => {
        const cur = s.openCursor();
        cur.onsuccess = () => { const c = cur.result; if (!c) return; if (String(c.key).startsWith(prefix)) c.delete(); c.continue(); };
        return cur;
      });
      await iconDbOp('readwrite', s => s.put(blob, key));
      return url;
    } catch (e) { return ''; }   // logo from another site that forbids drawing: the default icon is used
  }

  async function init() {
    _paintCachedBrand();
    // Purge any stale cache on client load if version changed
    const APP_VERSION = '28.2';
    if (localStorage.getItem('rs_client_ver') !== APP_VERSION) {
      localStorage.setItem('rs_client_ver', APP_VERSION);
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => { if (k !== ICON_CACHE) caches.delete(k); })).catch(() => {});
      }
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && !isLocal) {
      // scope './' = the folder the store is served from ("/" on the cloud site, "/storefront/"
      // on a shop's own server): the store page must be inside it to be installable.
      navigator.serviceWorker.register('sw.js?v=28.2', { scope: './' }).then(reg => {
        reg.update();
      }).catch(() => {});
    }
  
    try {
      applyTheme(_currentTheme);
      applyLang(_currentLang);
      loadCart();

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        _deferredPrompt = e;
        const btn = document.getElementById('btn-pwa-install');
        if (btn) btn.style.display = 'inline-flex';
      });

      let slug = getShopSlug();
      showLoader(true);
      _tenant = await StorefrontAPI.fetchTenant(slug);

      if (!_tenant) {
        showLoader(false);
        renderNotFound(slug);
        return;
      }
      localStorage.setItem('rs_last_shop_slug', _tenant.slug || slug);
      // A shop that takes orders on its own PC (direct mode) never reads cloud orders: send the
      // customer there, or say it is closed, instead of taking an order nobody will see.
      if (await handleDirectShop(_tenant, _tenant.slug || slug)) return;
      // On the shop's own server: when no POS is open there, nobody would see the order.
      if (_tenant.pos_online === false) {
        showLoader(false);
        renderStoreClosed(_tenant);
        return;
      }
      applyDynamicManifest(_tenant, _tenant.slug || slug);
      // First visit: the service worker only takes over now. Until then the phone saw the shared
      // site file (not installable): ask again so it gets THIS shop's app.
      if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', () => applyDynamicManifest(_tenant, _tenant.slug || slug), { once: true });
      }
      try { setupCheckoutOptions(); } catch (e) { console.warn('[Storefront] checkout options', e); }

      document.title = _tenant.shop_name || document.title;
      _saveBrandCache(_tenant);
      _banner = parseBanner(_tenant);
      applyShopBrand();
      renderAnnouncement();
      renderFooter();

      // 1. Fetch categories and first batch of products in parallel for INSTANT display
      const [cats, initialProds] = await Promise.all([
        StorefrontAPI.fetchCategories(_tenant.id),
        StorefrontAPI.fetchFirstBatchProducts ? StorefrontAPI.fetchFirstBatchProducts(_tenant.id) : StorefrontAPI.fetchProducts(_tenant.id)
      ]);

      _categories = cats || [];
      _products = (initialProds || []).map(normProd).filter(visibleProd);
      _isLoadingProducts = false;

      // Merge custom category cover images
      if (_tenant.banner_url) {
        try {
          const bp = typeof _tenant.banner_url === 'string' ? JSON.parse(_tenant.banner_url) : _tenant.banner_url;
          if (bp && bp.category_images) {
            _categoryImages = bp.category_images;
            _categories.forEach(c => {
              if (bp.category_images[c.id]) c.image_url = bp.category_images[c.id];
            });
          }
        } catch(e) {}
      }

      renderHeader();
      initCarousel();
      renderCategoriesSlider();
      renderBigCategoriesGrid();
      updateLiveCart();
      // Real-time catalog price & info polling every 15 seconds
      let _lastStorefrontCheck = new Date().toISOString();
      setInterval(async () => {
        try {
          if (!document.hidden && StorefrontAPI.fetchUpdatedProducts && _tenant && _tenant.id) {
            const updated = await StorefrontAPI.fetchUpdatedProducts(_tenant.id, _lastStorefrontCheck);
            if (Array.isArray(updated) && updated.length > 0) {
              _lastStorefrontCheck = new Date().toISOString();
              updated.forEach(normProd);
              const updateMap = new Map(updated.map(p => [p.id, p]));
              _products = _products.map(p => updateMap.get(p.id) || p);
              for (const u of updated) {
                if (!_products.some(p => p.id === u.id)) _products.push(u);
              }
              _products = _products.filter(visibleProd);
              renderOffersStrip();
              renderBigCategoriesGrid();
              if (_viewMode === 'products') renderGroupedProducts();
              console.log('[Storefront] Real-time updated products:', updated.length);
            }
          }
        } catch(e) {}
      }, 15000);


      // Show Categories Grid on first open as requested
      showCategoriesGrid();
      showLoader(false);

      // Concurrently fetch remainder of catalog if any
      StorefrontAPI.fetchProducts(_tenant.id).then(allProds => {
        if (allProds && allProds.length > 0) {
          _products = allProds.map(normProd).filter(visibleProd);
          renderOffersStrip();
          renderBigCategoriesGrid();
          if (_viewMode === 'products') renderGroupedProducts();
        }
      }).catch(err => {
        console.warn('Background full catalog fetch warning:', err);
      });

    } catch (err) {
      console.error('Storefront initialization error:', err);
      showLoader(false);
    }
  }

  // ── 1. HEADER & TOP SHOP INFO ──
  function renderHeader() {
    // Hide header info sub-bar by default unless explicitly turned on by store admin
    const subbar = document.getElementById('header-info-subbar');
    let showBadges = false;
    if (_tenant && _tenant.banner_url) {
      try {
        const bp = typeof _tenant.banner_url === 'string' ? JSON.parse(_tenant.banner_url) : _tenant.banner_url;
        if (bp && bp.show_header_badges === true) showBadges = true;
      } catch(e) {}
    }
    if (subbar) {
      subbar.style.display = showBadges ? 'block' : 'none';
    }
    const brandName = document.getElementById('header-brand-name');
    const brandLogo = document.getElementById('header-brand-logo');
    const openStatus = document.getElementById('header-open-status');
    const stockPill = document.getElementById('header-stock-pill');
    const stockText = document.getElementById('header-stock-text');
    const delPill = document.getElementById('header-delivery-pill');
    const delText = document.getElementById('header-delivery-text');
    const addrPill = document.getElementById('header-address-pill');
    const addrText = document.getElementById('header-address-text');
    const descText = document.getElementById('header-desc-text');

    if (brandName) brandName.textContent = _tenant.shop_name;
    if (brandLogo) {
      if (_tenant.logo_url) {
        brandLogo.innerHTML = `<img src="${_attrUrl(_tenant.logo_url)}" alt="${_esc(_tenant.shop_name)}" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">`;
      } else {
        brandLogo.textContent = String(_tenant.shop_name || '🏪').trim().charAt(0).toUpperCase();
      }
    }
    if (openStatus) openStatus.textContent = t('openNow');

    const isLiveStock = _tenant.link_pos_stock === true;
    if (stockText) stockText.textContent = isLiveStock ? t('liveStockBadge') : t('menuModeBadge');
    if (stockPill) stockPill.className = 'header-pill ' + (isLiveStock ? 'pos-live' : '');

    const cfgZ = storeCfg().zones;
    const deliveryFee = cfgZ.length ? Math.min(...cfgZ.map(z => z.fee)).toFixed(2) : (parseFloat(_tenant.delivery_fee) || 0).toFixed(2);
    if (delText) delText.textContent = `${t('deliveryFee')}: ${cfgZ.length ? (_currentLang === 'ar' ? 'من ' : 'from ') : ''}$${deliveryFee}`;

    if (_tenant.address && addrPill && addrText) {
      addrText.textContent = _tenant.address;
      addrPill.style.display = 'inline-flex';
    }

    const desc = _currentLang === 'ar'
      ? (_tenant.description_ar || _tenant.description_en || '')
      : (_tenant.description_en || _tenant.description_ar || '');
    if (descText) descText.textContent = desc;
  }

  // ── 2. MULTI-OFFER SCROLLING CAROUSEL ──
  function initCarousel() {
    const wrap = document.getElementById('carousel-wrapper');
    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!wrap || !track || !_tenant) return;

    _carouselSlides = [];
    const raw = String(_tenant.banner_url || '').trim();
    if (raw.startsWith('{')) {
      if (_banner.active === false) { wrap.style.display = 'none'; return; }
      if (Array.isArray(_banner.slides)) _carouselSlides = _banner.slides.filter(s => s && s.active !== false && inDates(s));
      else if (_banner.title || _banner.image_url) _carouselSlides = [_banner];
    } else if (raw.startsWith('http')) {
      _carouselSlides = [{ active: true, title: '', subtitle: '', image_url: raw }];
    }

    // Only the shop's own banners: nothing is shown until the shop adds one.
    if (_carouselSlides.length === 0) {
      wrap.style.display = 'none';
      if (_carouselTimer) clearInterval(_carouselTimer);
      return;
    }

    wrap.style.display = 'block';
    const en = _currentLang === 'en';
    track.innerHTML = _carouselSlides.map((slide, i) => {
      const hasImage = Boolean(slide.image_url);
      const title = (en && slide.title_en) ? slide.title_en : (slide.title || slide.title_en || '');
      const sub = (en && slide.subtitle_en) ? slide.subtitle_en : (slide.subtitle || slide.subtitle_en || '');
      const btn = (en && slide.button_text_en) ? slide.button_text_en : (slide.button_text || slide.button_text_en || '');
      const linked = slide.link_type && slide.link_type !== 'none';
      return `
        <div class="carousel-slide ${hasImage ? 'has-image' : ''}" ${linked ? `onclick="Storefront.openSlide(${i})" style="cursor:pointer"` : ''}>
          <div class="slide-content">
            ${slide.badge ? `<span class="slide-badge">${_esc(slide.badge)}</span>` : ''}
            ${title ? `<h3 class="slide-title">${_esc(title)}</h3>` : ''}
            ${sub ? `<p class="slide-sub">${_esc(sub)}</p>` : ''}
            ${linked ? `<span class="slide-cta" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;background:#fff;color:#111;padding:7px 16px;border-radius:10px;font-weight:900;font-size:.85rem;box-shadow:0 4px 12px rgba(0,0,0,.18)">${_esc(btn || (en ? 'Shop now' : 'تسوّق الآن'))} ${en ? '→' : '←'}</span>` : ''}
          </div>
          ${hasImage ? `
            <div class="slide-image-side">
              <img src="${_attrUrl(slide.image_url)}" alt="${_esc(title || _tenant.shop_name || '')}" loading="lazy">
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    dotsContainer.innerHTML = _carouselSlides.map((_, i) => `
      <div class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="Storefront.goToSlide(${i})"></div>
    `).join('');

    _currentSlideIndex = 0;
    updateSlidePosition();

    if (_carouselTimer) clearInterval(_carouselTimer);
    if (_carouselSlides.length > 1) {
      _carouselTimer = setInterval(() => nextSlide(), 4500);
    }
  }

  // A banner the shop linked to its offers, a category, a product, WhatsApp or a web page.
  function openSlide(i) {
    const s = _carouselSlides[i]; if (!s) return;
    const v = s.link_value;
    if (s.link_type === 'offers') return showOffers();
    if (s.link_type === 'category' && v) return selectCategory(String(v));
    if (s.link_type === 'product' && v) return openProduct(String(v));
    if (s.link_type === 'whatsapp') { const wa = shopWhatsApp(); if (wa) window.open('https://wa.me/' + wa, '_blank', 'noopener'); return; }
    if (s.link_type === 'url' && /^https?:\/\//i.test(String(v || ''))) window.open(String(v), '_blank', 'noopener');
  }
  function openProduct(id) {
    const p = findProd(id); if (!p) return;
    if (p.category_id) selectCategory(String(p.category_id)); else showAllProducts();
    setTimeout(() => {
      const card = document.querySelector(`.product-card[data-product-id="${CSS.escape(String(id))}"]`);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.style.outline = '3px solid var(--shop-brand, #dc2626)'; setTimeout(() => { card.style.outline = ''; }, 2200); }
    }, 120);
  }

  // ── Shop identity: brand colour, announcement bar, footer ──
  function applyShopBrand() {
    const c = _banner.brand && _banner.brand.color;
    const root = document.documentElement;
    if (/^#[0-9a-f]{6}$/i.test(c || '')) {
      root.style.setProperty('--shop-brand', c);
      root.setAttribute('data-shop-brand', '1');
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', c);
    } else {
      root.style.removeProperty('--shop-brand');
      root.removeAttribute('data-shop-brand');
    }
    if (_tenant && _tenant.logo_url) {
      document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(l => { l.href = _tenant.logo_url; });
    }
  }
  function renderAnnouncement() {
    let bar = document.getElementById('sf-announcement');
    const a = _banner.announcement || {};
    const text = _currentLang === 'en' ? (a.text_en || a.text_ar) : (a.text_ar || a.text_en);
    if (!a.active || !text) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sf-announcement';
      bar.style.cssText = 'background:var(--shop-brand, #dc2626);color:#fff;text-align:center;font-weight:800;font-size:.86rem;padding:8px 14px;line-height:1.4';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.textContent = text;
  }
  function footerHoursText() {
    const h = storeCfg().hours; if (!h || !h.days) return '';
    const ar = _currentLang === 'ar';
    const names = ar ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const d = h.days[i] || h.days[String(i)] || {};
      rows.push(`<div style="display:flex;justify-content:space-between;gap:12px"><span>${names[i]}</span><span style="direction:ltr">${d.closed ? (ar ? 'مغلق' : 'Closed') : (d.open && d.open === d.close ? (ar ? 'مفتوح 24 ساعة' : 'Open 24 hours') : _esc((d.open || '') + ' – ' + (d.close || '')))}</span></div>`);
    }
    return rows.join('');
  }
  function renderFooter() {
    let f = document.getElementById('sf-footer');
    const powered = document.getElementById('rs-powered-by');
    if (!f) {
      f = document.createElement('footer');
      f.id = 'sf-footer';
      if (powered && powered.parentNode) powered.parentNode.insertBefore(f, powered); else document.body.appendChild(f);
    }
    const t = _tenant || {}, b = _banner.brand || {}, ar = _currentLang === 'ar';
    const wa = shopWhatsApp();
    const desc = ar ? (t.description_ar || t.description_en || '') : (t.description_en || t.description_ar || '');
    const phone = b.phone || _banner.phone || '';
    const addr = t.address || _banner.address || '';
    const safeUrl = (u) => /^https?:\/\//i.test(String(u || '')) ? _attrUrl(u) : '';
    const socials = [['instagram', 'Instagram', '📸'], ['facebook', 'Facebook', '📘'], ['tiktok', 'TikTok', '🎵']]
      .filter(([k]) => safeUrl(b[k])).map(([k, n, ic]) => `<a href="${safeUrl(b[k])}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--border-color);border-radius:10px;font-weight:800;font-size:.8rem;text-decoration:none;color:var(--text-main);background:var(--bg-surface)">${ic} ${n}</a>`).join('');
    const logo = t.logo_url ? `<img src="${_attrUrl(t.logo_url)}" alt="" style="width:52px;height:52px;border-radius:14px;object-fit:contain;background:#fff;border:1px solid var(--border-color)">` : `<div style="width:52px;height:52px;border-radius:14px;background:var(--shop-brand, #dc2626);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.4rem">${_esc(String(t.shop_name || '?').trim().charAt(0).toUpperCase())}</div>`;
    const line = (ic, html) => html ? `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px"><span>${ic}</span><span>${html}</span></div>` : '';
    const hours = footerHoursText();
    f.style.cssText = 'max-width:1200px;margin:28px auto 0;padding:22px 16px 6px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:.86rem';
    f.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px">
        <div>
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">${logo}<div><div style="font-weight:900;font-size:1.05rem;color:var(--text-main)">${_esc(t.shop_name || '')}</div>${desc ? `<div style="font-size:.8rem">${_esc(desc)}</div>` : ''}</div></div>
          ${socials ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${socials}</div>` : ''}
        </div>
        <div>
          <div style="font-weight:900;color:var(--text-main);margin-bottom:8px">${ar ? 'تواصل معنا' : 'Contact us'}</div>
          ${line('📍', addr ? (safeUrl(b.maps_url) ? `<a href="${safeUrl(b.maps_url)}" target="_blank" rel="noopener" style="color:inherit">${_esc(addr)}</a>` : _esc(addr)) : (safeUrl(b.maps_url) ? `<a href="${safeUrl(b.maps_url)}" target="_blank" rel="noopener" style="color:inherit">${ar ? 'موقعنا على الخريطة' : 'Find us on the map'}</a>` : ''))}
          ${line('📞', phone ? `<a href="tel:${_esc(String(phone).replace(/[^\d+]/g, ''))}" style="color:inherit;direction:ltr;unicode-bidi:embed">${_esc(phone)}</a>` : '')}
          ${line('💬', wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener" style="color:#16a34a;font-weight:800">WhatsApp</a>` : '')}
          ${line('✉️', b.email ? `<a href="mailto:${_esc(b.email)}" style="color:inherit">${_esc(b.email)}</a>` : '')}
        </div>
        ${hours ? `<div><div style="font-weight:900;color:var(--text-main);margin-bottom:8px">${ar ? 'أوقات العمل' : 'Opening hours'}</div><div style="max-width:240px">${hours}</div></div>` : ''}
      </div>
      <div style="text-align:center;font-size:.75rem;margin-top:18px">© ${new Date().getFullYear()} ${_esc(t.shop_name || '')}</div>`;
    if (powered) powered.innerHTML = '<span style="opacity:.8">Powered by</span> <strong>🦈 Red Shark</strong>';
    // WhatsApp ordering only when the shop has a number
    document.querySelectorAll('.btn-checkout-whatsapp').forEach(btn => { btn.style.display = wa ? '' : 'none'; });
  }

  // ── Offers: a strip on the home page and a full list ──
  function offerProducts() { return _products.filter(p => p.is_published !== false && activeOffer(p)); }
  function priceHtml(prod, big) {
    const o = activeOffer(prod);
    const lbpRate = parseFloat(_tenant && _tenant.currency_lbp_rate) || 89500;
    const now = effPrice(prod);
    const lbp = Math.round(now * lbpRate).toLocaleString();
    const pct = o ? Math.round((1 - now / (parseFloat(prod.price) || 1)) * 100) : 0;
    return `<span class="price-usd" style="font-size:${big ? '1.1rem' : '1rem'} !important;font-weight:900 !important;color:var(--shop-brand, #dc2626) !important;">$${now.toFixed(2)}</span>` +
      (o ? `<span style="font-size:.72rem;color:var(--text-subtle);text-decoration:line-through;font-weight:700;margin-inline-start:4px">$${(parseFloat(prod.price) || 0).toFixed(2)}</span>` : `<span class="price-lbp" style="font-size: 0.65rem !important; color: var(--text-muted) !important; font-weight: 600 !important;">${lbp} ${t('currencyLBP') || 'L.L.'}</span>`) +
      (o && pct > 0 ? `<span style="position:absolute;top:8px;inset-inline-start:8px;background:var(--shop-brand, #dc2626);color:#fff;font-size:.7rem;font-weight:900;padding:2px 8px;border-radius:99px;z-index:2">−${pct}%</span>` : '');
  }
  function renderOffersStrip() {
    let box = document.getElementById('sf-offers-strip');
    const big = document.getElementById('categories-big-view');
    const list = offerProducts();
    if (!list.length || !big) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'sf-offers-strip'; big.parentNode.insertBefore(box, big); }
    box.style.display = _viewMode === 'categories' && !_searchQuery.trim() ? 'block' : 'none';
    const ar = _currentLang === 'ar';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 2px 10px">
        <h2 style="font-size:1.1rem;font-weight:900;margin:0">🔥 ${ar ? 'العروض' : 'Offers'}</h2>
        <button onclick="Storefront.showOffers()" style="background:none;border:0;color:var(--shop-brand, #dc2626);font-weight:900;cursor:pointer;font-size:.85rem">${ar ? 'عرض الكل ←' : 'See all →'}</button>
      </div>
      <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;margin-bottom:14px;scroll-snap-type:x mandatory">
        ${list.slice(0, 12).map(p => {
          const name = _currentLang === 'ar' ? (p.name_ar || p.name) : (p.name_en || p.name);
          const o = activeOffer(p);
          return `<div onclick="Storefront.openProduct('${_esc(p.id)}')" style="flex:0 0 150px;scroll-snap-align:start;cursor:pointer;background:var(--bg-surface);border:1.5px solid var(--border-color);border-radius:14px;padding:8px;position:relative">
            <div style="height:95px;border-radius:10px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:6px">${p.image_url ? `<img src="${_attrUrl(p.image_url)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain">` : '📦'}</div>
            <div style="font-size:.8rem;font-weight:800;line-height:1.3;height:2.6em;overflow:hidden">${_esc(name)}</div>
            ${o && o.label ? `<div style="font-size:.68rem;color:var(--shop-brand, #dc2626);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(o.label)}</div>` : ''}
            <div style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap">${priceHtml(p)}</div>
          </div>`;
        }).join('')}
      </div>`;
  }
  function showOffers() {
    _viewMode = 'products';
    _selectedCategory = '__offers__';
    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');
    if (bigView) bigView.style.display = 'none';
    if (prodsView) prodsView.style.display = 'block';
    const strip = document.getElementById('sf-offers-strip'); if (strip) strip.style.display = 'none';
    const vTitle = document.getElementById('current-view-title');
    const vCount = document.getElementById('current-view-count');
    if (vTitle) vTitle.textContent = '🔥 ' + (_currentLang === 'ar' ? 'العروض' : 'Offers');
    if (vCount) vCount.textContent = `${offerProducts().length} ${t('itemsCount')}`;
    renderCategoriesSlider();
    renderGroupedProducts();
    if (prodsView) prodsView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateSlidePosition() {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    const offset = _currentSlideIndex * 100;
    track.style.transform = `translateX(-${offset}%)`;

    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === _currentSlideIndex);
    });
  }

  function nextSlide() {
    if (_carouselSlides.length <= 1) return;
    _currentSlideIndex = (_currentSlideIndex + 1) % _carouselSlides.length;
    updateSlidePosition();
  }

  function prevSlide() {
    if (_carouselSlides.length <= 1) return;
    _currentSlideIndex = (_currentSlideIndex - 1 + _carouselSlides.length) % _carouselSlides.length;
    updateSlidePosition();
  }

  function goToSlide(idx) {
    _currentSlideIndex = idx;
    updateSlidePosition();
  }

  // ── 3. BIG CATEGORIES GRID RENDERER (SHOWN ON FIRST OPEN) ──
  function renderBigCategoriesGrid() {
    const container = document.getElementById('categories-big-grid');
    if (!container) return;

    if (shownCategories().length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد أقسام مسجلة</div>';
      return;
    }

    container.innerHTML = shownCategories().map(cat => {
      const name = _currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name);
      const count = _products.filter(p => String(p.category_id) === String(cat.id)).length;
      
      // Auto image selector
      let img = _categoryImages[cat.id] || cat.image_url;
      if (!img) {
        const lower = (cat.name || '').toLowerCase();
        if (lower.includes('fruit') || lower.includes('veg') || lower.includes('خضار') || lower.includes('فواكه')) img = DEFAULT_CAT_IMAGES.fruits;
        else if (lower.includes('dairy') || lower.includes('cheese') || lower.includes('ألبان') || lower.includes('جبن')) img = DEFAULT_CAT_IMAGES.dairy;
        else if (lower.includes('bakery') || lower.includes('pastry') || lower.includes('مخبز') || lower.includes('خبز')) img = DEFAULT_CAT_IMAGES.bakery;
        else if (lower.includes('beverage') || lower.includes('drink') || lower.includes('مشروب')) img = DEFAULT_CAT_IMAGES.beverages;
        else if (lower.includes('meat') || lower.includes('لحم') || lower.includes('دجاج')) img = DEFAULT_CAT_IMAGES.meats;
        else if (lower.includes('snack') || lower.includes('sweet') || lower.includes('حلويات')) img = DEFAULT_CAT_IMAGES.snacks;
        else img = DEFAULT_CAT_IMAGES.general;
      }

      return `
        <div class="category-big-card" onclick="Storefront.selectCategory('${cat.id}')">
          <div class="cat-big-img-wrap">
            <img src="${img}" class="cat-big-img" alt="${name}" loading="lazy" onerror="this.src='${DEFAULT_CAT_IMAGES.general}'">
          </div>
          <div class="cat-big-info">
            <div class="cat-big-title">${name}</div>
            <div class="cat-big-count">${count} ${_currentLang === 'ar' ? 'صنف' : 'items'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── 4. VIEW CONTROLLERS: CATEGORIES GRID vs PRODUCTS VIEW ──
  function showCategoriesGrid() {
    _viewMode = 'categories';
    _selectedCategory = 'all';

    const tabCats = document.getElementById('tab-btn-categories');
    const tabAll = document.getElementById('tab-btn-all');
    if (tabCats && tabAll) {
      tabCats.style.background = 'var(--shop-brand, #dc2626)';
      tabCats.style.color = '#fff';
      tabCats.style.borderColor = 'var(--shop-brand, #dc2626)';
      tabAll.style.background = 'var(--bg-surface)';
      tabAll.style.color = 'var(--text-main)';
      tabAll.style.borderColor = 'var(--border-color)';
    }

    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');

    if (bigView) bigView.style.display = 'block';
    if (prodsView) prodsView.style.display = 'none';

    const catSlider = document.getElementById('categories-slider');
    if (catSlider) {
      catSlider.style.display = 'flex';
    }

    renderCategoriesSlider();
    renderOffersStrip();
    renderBigCategoriesGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectCategory(catId) {
    _viewMode = 'products';
    _selectedCategory = catId;

    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');

    if (bigView) bigView.style.display = 'none';
    const strip = document.getElementById('sf-offers-strip'); if (strip) strip.style.display = 'none';

    const catSlider = document.getElementById('categories-slider');
    if (catSlider) {
      catSlider.style.display = _viewMode === 'categories' ? 'none' : 'flex';
    }

    if (prodsView) prodsView.style.display = 'block';

    const cat = _categories.find(c => String(c.id) === String(catId));
    const catName = cat ? (_currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name)) : t('allProducts');
    const catCount = cat ? _products.filter(p => String(p.category_id) === String(catId)).length : _products.length;

    const vTitle = document.getElementById('current-view-title');
    const vCount = document.getElementById('current-view-count');
    if (vTitle) vTitle.textContent = `🛒 ${catName}`;
    if (vCount) vCount.textContent = `${catCount} ${t('itemsCount')}`;

    renderCategoriesSlider();
    renderGroupedProducts();

    const prodsContainer = document.getElementById('products-view');
    if (prodsContainer) prodsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showAllProducts() {
    _viewMode = 'products';
    _selectedCategory = 'all';

    const tabCats = document.getElementById('tab-btn-categories');
    const tabAll = document.getElementById('tab-btn-all');
    if (tabCats && tabAll) {
      tabAll.style.background = 'var(--shop-brand, #dc2626)';
      tabAll.style.color = '#fff';
      tabAll.style.borderColor = 'var(--shop-brand, #dc2626)';
      tabCats.style.background = 'var(--bg-surface)';
      tabCats.style.color = 'var(--text-main)';
      tabCats.style.borderColor = 'var(--border-color)';
    }

    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');

    if (bigView) bigView.style.display = 'none';
    if (prodsView) prodsView.style.display = 'block';
    const strip = document.getElementById('sf-offers-strip'); if (strip) strip.style.display = 'none';

    const vTitle = document.getElementById('current-view-title');
    const vCount = document.getElementById('current-view-count');
    if (vTitle) vTitle.textContent = `🛒 ${t('allProducts')}`;
    if (vCount) vCount.textContent = `${_products.length} ${t('itemsCount')}`;

    renderCategoriesSlider();
    renderGroupedProducts();
  }

  // ── 5. GROUPED CATEGORY PRODUCTS DISPLAY ──
  // 5. PRODUCTS & CATALOG RENDERER (RED SHARK POS LUXURY 2-COLUMN CARDS)
  function renderGroupedProducts() {
    const container = document.getElementById('grouped-categories-container');
    if (!container) return;

    if (_products.length === 0 && _isLoadingProducts) {
      container.innerHTML = `
        <div style="text-align:center;padding:50px 20px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-lg)">
          <div style="display:inline-block;width:34px;height:34px;border:3px solid color-mix(in srgb, var(--shop-brand, #dc2626) 20%, transparent);border-top-color:var(--shop-brand, #dc2626);border-radius:50%;animation:spin 0.8s linear infinite"></div>
          <h3 style="font-size:1.05rem;font-weight:800;margin-top:12px;color:var(--text-main);">${_currentLang === 'ar' ? 'جاري تحميل قائمة المنتجات...' : 'Loading products...'}</h3>
        </div>
      `;
      return;
    }

    const offersMode = _selectedCategory === '__offers__';
    let filtered = offersMode ? offerProducts() : _products;
    if (_searchQuery.trim() !== '') {
      const q = _searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase();
        const nameAr = (p.name_ar || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        return name.includes(q) || nameAr.includes(q) || barcode.includes(q);
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:50px 20px;background:var(--bg-surface);border:1px dashed var(--border-color);border-radius:var(--radius-lg)">
          <div style="font-size:3rem;margin-bottom:8px">📦</div>
          <h3 style="font-size:1.15rem;font-weight:900">${_currentLang === 'ar' ? 'لم يتم العثور على أي منتج' : 'No products found'}</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">${_currentLang === 'ar' ? 'جرب البحث بكلمة أخرى' : 'Try searching with a different term'}</p>
        </div>
      `;
      return;
    }

    const catGroups = new Map();
    const activeCats = (_selectedCategory === 'all' || offersMode)
      ? shownCategories() 
      : _categories.filter(c => String(c.id) === String(_selectedCategory));

    activeCats.forEach(cat => {
      const prodsInCat = filtered.filter(p => String(p.category_id) === String(cat.id));
      if (prodsInCat.length > 0) {
        catGroups.set(String(cat.id), {
          name: _currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name),
          products: prodsInCat
        });
      }
    });

    const uncategorizedProds = filtered.filter(p => !p.category_id || !catGroups.has(String(p.category_id)));
    if (uncategorizedProds.length > 0 && (_selectedCategory === 'all' || offersMode || _searchQuery.trim() !== '')) {
      catGroups.set('uncat', {
        name: t('uncategorized') || (_currentLang === 'ar' ? 'أصناف عامة' : 'General Items'),
        products: uncategorizedProds
      });
    }

    const lbpRate = parseFloat(_tenant.currency_lbp_rate) || 89500;
    let html = '';

    catGroups.forEach((group, catId) => {
      html += `
        <section class="category-group-section" id="cat-group-${catId}" style="margin-bottom:22px;">
          <div class="category-group-header" style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; padding:0 4px;">
            <h3 class="category-group-title" style="margin:0; font-size:1.1rem; font-weight:900; display:flex; align-items:center; gap:8px; color:var(--text-main);">
              <span style="color:var(--shop-brand, #dc2626);">✦</span>
              <span>${_esc(group.name)}</span>
            </h3>
            <span class="category-group-count" style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:var(--bg-surface); padding:3px 10px; border-radius:12px; border:1px solid var(--border-color);">${group.products.length} ${_currentLang === 'ar' ? 'صنف' : 'items'}</span>
          </div>

          <div class="products-grid" style="display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; width: 100% !important; box-sizing: border-box !important;">
            ${group.products.map(prod => {
              const name = _currentLang === 'ar' ? (prod.name_ar || prod.name) : (prod.name_en || prod.name);
              const priceUSD = (parseFloat(prod.price) || 0).toFixed(2);
              const priceLBP = Math.round((parseFloat(prod.price) || 0) * lbpRate).toLocaleString();
              const inCart = _cart.find(c => String(c.productId) === String(prod.id));
              const cartQty = inCart ? inCart.quantity : 0;

              return `
                <div class="product-card ${cartQty > 0 ? 'has-cart' : ''}" data-product-id="${_esc(prod.id)}" style="position: relative !important; min-width: 0 !important; width: 100% !important; box-sizing: border-box !important; border-radius: 14px !important; padding: 10px !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; background: var(--bg-surface) !important; border: 1.5px solid var(--border-color) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;">
                  
                  <div class="product-img-wrap" style="height: 115px !important; min-height: 115px !important; max-height: 115px !important; width: 100% !important; border-radius: 10px !important; overflow: hidden !important; position: relative !important; display: flex !important; align-items: center !important; justify-content: center !important; background: #f8fafc !important; margin-bottom: 8px !important;">
                    ${prod.image_url ? `<img src="${_attrUrl(prod.image_url)}" alt="${_esc(name)}" loading="lazy" style="height: 100% !important; width: 100% !important; object-fit: contain !important; padding: 4px !important;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
                    <div class="prod-no-img" style="${prod.image_url ? 'display:none !important;' : 'display:flex !important;'} height: 100% !important; width: 100% !important; align-items: center !important; justify-content: center !important; background: color-mix(in srgb, var(--shop-brand, #dc2626) 4%, transparent) !important;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="stroke:var(--shop-brand, #dc2626)" stroke-width="1.5">
                        <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                      </svg>
                    </div>
                  </div>

                  <div class="product-info" style="flex: 1 !important; min-width: 0 !important; margin-bottom: 6px !important;">
                    <h4 class="product-title" title="${_esc(name)}" style="font-size: 0.88rem !important; font-weight: 800 !important; line-height: 1.35 !important; height: 2.7em !important; overflow: hidden !important; text-overflow: ellipsis !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; margin: 0 0 4px 0 !important; color: var(--text-main) !important;">${_esc(name)}</h4>
                  </div>

                  <div class="product-footer" style="display: flex !important; flex-direction: column !important; gap: 8px !important; margin-top: auto !important; padding-top: 6px !important; border-top: 1px dashed rgba(0, 0, 0, 0.08) !important;">
                    <div class="product-price" style="display: flex !important; justify-content: space-between !important; align-items: baseline !important;">
                      ${priceHtml(prod, true)}
                    </div>
                    
                    ${cartQty > 0 ? `
                      <div class="card-qty-stepper" style="display: flex !important; align-items: center !important; justify-content: space-between !important; background: color-mix(in srgb, var(--shop-brand, #dc2626) 8%, #fff) !important; border: 1.5px solid var(--shop-brand, #dc2626) !important; border-radius: 8px !important; padding: 4px 8px !important;">
                        <button onclick="Storefront.updateCartQty('${prod.id}', -1)" aria-label="Decrease" style="width: 26px !important; height: 26px !important; border-radius: 6px !important; background: var(--shop-brand, #dc2626) !important; color: #fff !important; border: none !important; font-weight: 900 !important; font-size: 0.95rem !important; cursor: pointer !important;">−</button>
                        <span style="font-size: 0.95rem !important; font-weight: 900 !important; color: var(--shop-brand, #dc2626) !important;">${cartQty}</span>
                        <button onclick="Storefront.updateCartQty('${prod.id}', 1)" aria-label="Increase" style="width: 26px !important; height: 26px !important; border-radius: 6px !important; background: var(--shop-brand, #dc2626) !important; color: #fff !important; border: none !important; font-weight: 900 !important; font-size: 0.95rem !important; cursor: pointer !important;">+</button>
                      </div>
                    ` : `
                      <button class="btn-add-cart" onclick="Storefront.addToCart('${prod.id}')" style="display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; width: 100% !important; padding: 8px 10px !important; border-radius: 8px !important; background: linear-gradient(135deg, var(--shop-brand, #dc2626) 0%, color-mix(in srgb, var(--shop-brand, #dc2626) 82%, #000) 100%) !important; color: #fff !important; border: none !important; font-size: 0.85rem !important; font-weight: 800 !important; cursor: pointer !important; box-shadow: 0 3px 8px color-mix(in srgb, var(--shop-brand, #dc2626) 25%, transparent) !important;">
                        <span>+</span>
                        <span>${t('addToCart')}</span>
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>`;
    });

    container.innerHTML = html;
  }

  function renderCategoriesSlider() {
    const container = document.getElementById('categories-slider');
    if (!container) return;

    let html = `
      <button class="cat-chip ${_viewMode === 'categories' ? 'active' : ''}" onclick="Storefront.showCategoriesGrid()">
        <span>📂</span>
        <span>${t('browseCategories')}</span>
      </button>
      <button class="cat-chip ${_viewMode === 'products' && _selectedCategory === 'all' ? 'active' : ''}" onclick="Storefront.showAllProducts()">
        <span>🛒</span>
        <span>${t('allProducts')}</span>
      </button>
    `;
    if (offerProducts().length) {
      html += `<button class="cat-chip ${_selectedCategory === '__offers__' ? 'active' : ''}" onclick="Storefront.showOffers()"><span>🔥</span><span>${_currentLang === 'ar' ? 'العروض' : 'Offers'}</span></button>`;
    }

    shownCategories().forEach(cat => {
      const catName = _currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name);
      const isActive = _viewMode === 'products' && String(_selectedCategory) === String(cat.id) ? 'active' : '';
      html += `
        <button class="cat-chip ${isActive}" onclick="Storefront.selectCategory('${cat.id}')">
          <span>${catName}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  // ── 6. CART MANAGEMENT ──
  // One cart per shop: on the shared cloud site, visiting another shop never carries items over.
  function cartKey() { return 'rs_cart_' + (getShopSlug() || 'shop'); }
  function loadCart() {
    try {
      const s = sessionStorage.getItem(cartKey());
      if (s) _cart = JSON.parse(s);
    } catch(e) { _cart = []; }
  }

  function saveCart() {
    sessionStorage.setItem(cartKey(), JSON.stringify(_cart));
    updateLiveCart();
    updateProductCardButtons();
  }

  function updateProductCardButtons() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
      const footer = card.querySelector('.product-footer');
      const addBtn = card.querySelector('.btn-add-cart, .btn-add-cart-circle');
      const stepper = card.querySelector('.card-qty-stepper');
      if (!footer) return;

      const prodId = card.getAttribute('data-product-id');
      if (!prodId) return;

      const cartItem = _cart.find(c => c.productId === prodId);
      const cartQty = cartItem ? cartItem.quantity : 0;

      card.classList.toggle('has-cart', cartQty > 0);

      if (cartQty > 0) {
        if (!stepper) {
          if (addBtn) addBtn.remove();
          const newStepper = document.createElement('div');
          newStepper.className = 'card-qty-stepper';
          newStepper.innerHTML = `
            <button onclick="Storefront.updateCartQty('${prodId}', -1)">−</button>
            <span>${cartQty}</span>
            <button onclick="Storefront.updateCartQty('${prodId}', 1)">+</button>
          `;
          footer.appendChild(newStepper);
        } else {
          const span = stepper.querySelector('span');
          if (span) span.textContent = cartQty;
        }
      } else {
        if (stepper) {
          stepper.remove();
          const newBtn = document.createElement('button');
          newBtn.className = 'btn-add-cart-circle';
          newBtn.onclick = () => Storefront.addToCart(prodId);
          newBtn.innerHTML = '+';
          newBtn.title = t('addToCart');
          footer.appendChild(newBtn);
        }
      }
    });
  }

  function addToCart(productId) {
    const prod = findProd(productId);
    if (!prod) return;

    const stock = parseInt(prod.stock_quantity) || 0;
    const existing = _cart.find(c => String(c.productId) === String(productId));
    if (_tenant.link_pos_stock && !_tenant.allow_out_of_stock && ((existing ? existing.quantity : 0) + 1) > stock) {
      alert(_currentLang === 'ar' ? 'عذراً، هذا الصنف غير متوفر حالياً' : 'Sorry, this item is out of stock');
      return;
    }
    if (existing) {
      existing.quantity += 1;
    } else {
      _cart.push({
        productId: String(prod.id),
        name: _currentLang === 'ar' ? (prod.name_ar || prod.name) : (prod.name_en || prod.name),
        price: effPrice(prod),
        quantity: 1,
        imageUrl: prod.image_url || null
      });
    }

    saveCart();
  }

  function updateCartQty(productId, delta) {
    const item = _cart.find(c => String(c.productId) === String(productId));
    if (!item) return;

    const prod = findProd(productId);
    const stock = prod ? (parseInt(prod.stock_quantity) || 0) : 9999;

    if (delta > 0 && _tenant.link_pos_stock && !_tenant.allow_out_of_stock && (item.quantity + delta) > stock) {
      alert(_currentLang === 'ar' ? 'عذراً، لا تتوفر كمية إضافية بالمخزون' : 'No more stock available');
      return;
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
      _cart = _cart.filter(c => String(c.productId) !== String(productId));
    }

    saveCart();
  }

  function deleteItem(productId) {
    const idx = _cart.findIndex(c => String(c.productId) === String(productId));
    if (idx !== -1) {
      _cart.splice(idx, 1);
      saveCart();
    }
  }

  function clearCart() {
    if (_cart.length === 0) return;
    if (confirm(_currentLang === 'ar' ? 'هل تريد إفراغ سلة المشتريات بالكامل؟' : 'Clear all items from your cart?')) {
      _cart = [];
      saveCart();
    }
  }

  function updateLiveCart() {
    // Prices follow the shop: an offer that started or ended, or a new price, updates the cart.
    if (_products.length) {
      _cart.forEach(c => { const p = findProd(c.productId); if (p) c.price = effPrice(p); });
      try { sessionStorage.setItem(cartKey(), JSON.stringify(_cart)); } catch (e) { }
    }
    const totalCount = _cart.reduce((sum, it) => sum + it.quantity, 0);
    const subtotal = _cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    const deliveryFee = currentDeliveryFee();
    const grandTotal = totalCount > 0 ? (subtotal + deliveryFee) : 0;
    const lbpRate = parseFloat(_tenant?.currency_lbp_rate) || 89500;
    const totalLBP = Math.round(grandTotal * lbpRate).toLocaleString();

    // Side cart elements
    const sideBadge = document.getElementById('side-cart-badge');
    const sideItems = document.getElementById('side-cart-items');
    const sideSubtotal = document.getElementById('side-subtotal');
    const sideDelivery = document.getElementById('side-delivery-fee');
    const sideGrand = document.getElementById('side-grand-total');
    const sideLbp = document.getElementById('side-grand-lbp');

    if (sideBadge) sideBadge.textContent = totalCount;
    showMinOrderNotes(subtotal);
    if (sideSubtotal) sideSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (sideDelivery) sideDelivery.textContent = `$${deliveryFee.toFixed(2)}`;
    if (sideGrand) sideGrand.textContent = `$${grandTotal.toFixed(2)}`;
    if (sideLbp) sideLbp.textContent = `≈ ${totalLBP} ${t('currencyLBP')}`;

    if (sideItems) {
      if (_cart.length === 0) {
        sideItems.innerHTML = `<div style="text-align:center;padding:24px 10px;color:var(--text-muted);font-size:0.85rem">${t('emptyCart')}</div>`;
      } else {
        sideItems.innerHTML = _cart.map(item => `
          <div class="cart-item-row">
            <div class="cart-item-details">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <div class="cart-item-actions">
              <div class="card-qty-stepper" style="padding:1px 2px">
                <button onclick="Storefront.updateCartQty('${item.productId}', -1)">−</button>
                <span>${item.quantity}</span>
                <button onclick="Storefront.updateCartQty('${item.productId}', 1)">+</button>
              </div>
              <button class="btn-delete-item" onclick="Storefront.deleteItem('${item.productId}')">🗑️</button>
            </div>
          </div>
        `).join('');
      }
    }

    const mobCount = document.getElementById('mob-cart-count');
    const mobTotal = document.getElementById('mob-cart-total');
    if (mobCount) mobCount.textContent = totalCount;
    if (mobTotal) mobTotal.textContent = `$${grandTotal.toFixed(2)}`;

    const modalItems = document.getElementById('modal-cart-items');
    const modalSub = document.getElementById('modal-subtotal');
    const modalDel = document.getElementById('modal-delivery-fee');
    const modalGrand = document.getElementById('modal-grand-total');
    const modalLbp = document.getElementById('modal-grand-lbp');

    if (modalSub) modalSub.textContent = `$${subtotal.toFixed(2)}`;
    if (modalDel) modalDel.textContent = `$${deliveryFee.toFixed(2)}`;
    if (modalGrand) modalGrand.textContent = `$${grandTotal.toFixed(2)}`;
    if (modalLbp) modalLbp.textContent = `≈ ${totalLBP} ${t('currencyLBP')}`;

    if (modalItems) {
      if (_cart.length === 0) {
        modalItems.innerHTML = `<div style="text-align:center;padding:24px 10px;color:var(--text-muted);font-size:0.85rem">${t('emptyCart')}</div>`;
      } else {
        modalItems.innerHTML = _cart.map(item => `
          <div class="cart-item-row">
            <div class="cart-item-details">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity}</div>
            </div>
            <div class="cart-item-actions">
              <div class="card-qty-stepper">
                <button onclick="Storefront.updateCartQty('${item.productId}', -1)">−</button>
                <span>${item.quantity}</span>
                <button onclick="Storefront.updateCartQty('${item.productId}', 1)">+</button>
              </div>
              <button class="btn-delete-item" onclick="Storefront.deleteItem('${item.productId}')">🗑️</button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  function openMobileCartModal() {
    updateLiveCart();
    const m = document.getElementById('mobile-cart-modal');
    if (m) m.classList.add('open');
  }

  function closeMobileCartModal() {
    const m = document.getElementById('mobile-cart-modal');
    if (m) m.classList.remove('open');
  }

  // ── Delivery zones, pickup, minimum order and opening hours (set in the store admin) ──
  let _cfgCache = { raw: null, cfg: null };
  function storeCfg() {
    const raw = _tenant ? _tenant.banner_url : null;
    if (_cfgCache.raw === raw && _cfgCache.cfg) return _cfgCache.cfg;
    let b = {};
    try { b = raw && String(raw).trim().startsWith('{') ? JSON.parse(raw) : {}; } catch (e) { b = {}; }
    const zones = (Array.isArray(b.delivery_zones) ? b.delivery_zones : []).filter(z => z && z.name)
      .map(z => ({ name: String(z.name), fee: Math.max(0, parseFloat(z.fee) || 0), min: Math.max(0, parseFloat(z.min) || 0) }));
    const cfg = { zones, pickup: b.allow_pickup === true, hours: (b.opening_hours && b.opening_hours.enabled) ? b.opening_hours : null };
    _cfgCache = { raw, cfg };
    return cfg;
  }
  const PICKUP = '__pickup__';
  function selectedZoneKey() { try { return localStorage.getItem('rs_sf_zone_' + (_tenant && _tenant.id)) || ''; } catch (e) { return ''; } }
  function isPickup() { return storeCfg().pickup && selectedZoneKey() === PICKUP; }
  function selectedZone() { const k = selectedZoneKey(); return storeCfg().zones.find(z => z.name === k) || null; }
  function hasChoices() { const c = storeCfg(); return c.zones.length > 0 || c.pickup; }
  function currentDeliveryFee() {
    if (isPickup()) return 0;
    const z = selectedZone();
    if (z) return z.fee;
    return parseFloat(_tenant?.delivery_fee) || 0;
  }
  function currentMinOrder() {
    const z = selectedZone();
    if (z && z.min) return z.min;
    return parseFloat(_tenant?.min_order) || 0;
  }
  function addressWithZone(address) {
    if (isPickup()) return (_currentLang === 'ar' ? '[استلام من المحل / Pickup] ' : '[Pickup / استلام من المحل] ') + String(address || '').trim();
    const z = selectedZone();
    return z ? `[${z.name}] ${String(address || '').trim()}` : address;
  }
  // shop's local time (Lebanon by default)
  function shopClock(tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Beirut', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = k => (parts.find(p => p.type === k) || {}).value;
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
      return { day: day < 0 ? new Date().getDay() : day, min: ((parseInt(g('hour'), 10) || 0) % 24) * 60 + (parseInt(g('minute'), 10) || 0) };
    } catch (e) { const n = new Date(); return { day: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; }
  }
  const _toMin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  function isOpenNow() {
    const h = storeCfg().hours; if (!h || !h.days) return true;
    const { day, min } = shopClock(h.tz);
    const today = h.days[day] || h.days[String(day)], yest = h.days[(day + 6) % 7] || h.days[String((day + 6) % 7)];
    const inDay = (d, part) => {
      if (!d || d.closed) return false;
      const o = _toMin(d.open), c = _toMin(d.close); if (o == null || c == null) return true;
      if (o === c) return true;                      // open all day
      if (o < c) return part === 'today' && min >= o && min < c;
      return part === 'today' ? min >= o : min < c; // closes after midnight
    };
    return inDay(today, 'today') || inDay(yest, 'yesterday');
  }
  function nextOpeningText() {
    const h = storeCfg().hours; if (!h || !h.days) return '';
    const { day, min } = shopClock(h.tz);
    const names = _currentLang === 'ar' ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 8; i++) {
      const dd = (day + i) % 7, d = h.days[dd] || h.days[String(dd)];
      if (!d || d.closed) continue;
      const o = _toMin(d.open); if (o == null) continue;
      if (i === 0 && o <= min) continue;
      const when = i === 0 ? (_currentLang === 'ar' ? 'اليوم' : 'today') : (i === 1 ? (_currentLang === 'ar' ? 'غداً' : 'tomorrow') : names[dd]);
      return _currentLang === 'ar' ? `يفتح ${when} الساعة ${d.open}` : `Opens ${when} at ${d.open}`;
    }
    return '';
  }
  function orderBlockReason(subtotal) {
    const ar = _currentLang === 'ar';
    if (!isOpenNow()) return (ar ? '🕒 المتجر مغلق الآن ولا يستقبل الطلبات. ' : '🕒 The store is closed and not taking orders right now. ') + nextOpeningText();
    if (hasChoices() && !isPickup() && !selectedZone() && storeCfg().zones.length) return ar ? 'يرجى اختيار منطقة التوصيل' : 'Please choose your delivery area';
    const min = currentMinOrder();
    if (min > 0 && subtotal < min) return ar ? `الحد الأدنى للطلب $${min.toFixed(2)} — أضف $${(min - subtotal).toFixed(2)} بعد` : `Minimum order is $${min.toFixed(2)} — add $${(min - subtotal).toFixed(2)} more`;
    return null;
  }
  function showMinOrderNotes(subtotal) {
    const min = currentMinOrder();
    const txt = (min > 0 && subtotal > 0 && subtotal < min)
      ? (_currentLang === 'ar' ? `⚠️ الحد الأدنى للطلب $${min.toFixed(2)} — أضف $${(min - subtotal).toFixed(2)}` : `⚠️ Minimum order $${min.toFixed(2)} — add $${(min - subtotal).toFixed(2)}`) : '';
    ['side', 'modal'].forEach(p => {
      const grand = document.getElementById(p + '-grand-total'); if (!grand) return;
      let el = document.getElementById(p + '-min-note');
      if (!el) {
        el = document.createElement('div'); el.id = p + '-min-note';
        el.style.cssText = 'font-size:.78rem;font-weight:800;color:#b45309;margin-top:6px';
        const box = grand.parentElement && grand.parentElement.parentElement; (box || grand.parentElement).appendChild(el);
      }
      el.textContent = txt; el.style.display = txt ? 'block' : 'none';
    });
  }
  function onZoneChange(val) {
    try { localStorage.setItem('rs_sf_zone_' + (_tenant && _tenant.id), val || ''); } catch (e) { }
    document.querySelectorAll('.sf-zone-select').forEach(s => { if (s.value !== val) s.value = val; });
    const pick = val === PICKUP;
    ['side', 'modal'].forEach(p => { const a = document.getElementById(p + '-checkout-address'); if (a) a.placeholder = pick ? (_currentLang === 'ar' ? 'اختياري عند الاستلام' : 'Optional for pickup') : (_currentLang === 'ar' ? 'المدينة، الشارع، البناية...' : 'City, street, building...'); });
    updateLiveCart();
  }
  function setupCheckoutOptions() {
    const cfg = storeCfg(), ar = _currentLang === 'ar';
    // zone / pickup selector above the address
    if (hasChoices()) {
      const cur = selectedZoneKey();
      const validCur = (cur === PICKUP && cfg.pickup) || cfg.zones.some(z => z.name === cur);
      if (!validCur) { try { localStorage.removeItem('rs_sf_zone_' + _tenant.id); } catch (e) { } }
      const opts = `<option value="">${ar ? '— اختر منطقة التوصيل —' : '— Choose your area —'}</option>` +
        cfg.zones.map(z => `<option value="${String(z.name).replace(/"/g, '&quot;')}">${String(z.name).replace(/</g, '&lt;')} — $${z.fee.toFixed(2)}${z.min ? (ar ? ` (حد أدنى $${z.min})` : ` (min $${z.min})`) : ''}</option>`).join('') +
        (cfg.pickup ? `<option value="${PICKUP}">🏬 ${ar ? 'استلام من المحل — بدون توصيل' : 'Pickup from the shop — no delivery fee'}</option>` : '');
      ['side', 'modal'].forEach(p => {
        const addr = document.getElementById(p + '-checkout-address');
        if (!addr || document.getElementById(p + '-checkout-zone')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = `<label class="field-label">${cfg.zones.length ? (ar ? 'منطقة التوصيل *' : 'Delivery area *') : (ar ? 'طريقة الاستلام' : 'Delivery or pickup')}</label>
          <select id="${p}-checkout-zone" class="field-input sf-zone-select" onchange="Storefront.onZoneChange(this.value)">${cfg.zones.length ? opts : `<option value="">🛵 ${ar ? 'توصيل' : 'Delivery'}</option><option value="${PICKUP}">🏬 ${ar ? 'استلام من المحل' : 'Pickup'}</option>`}</select>`;
        const group = addr.parentElement; group.parentElement.insertBefore(wrap, group);
        const sel = wrap.querySelector('select'); if (validCur) sel.value = cur;
      });
    }
    // opening hours: say so, ordering is blocked while closed
    if (cfg.hours && !isOpenNow()) {
      const main = document.getElementById('main-content');
      if (main && !document.getElementById('sf-closed-bar')) {
        const bar = document.createElement('div'); bar.id = 'sf-closed-bar';
        bar.style.cssText = 'margin:12px auto 0;max-width:1200px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:12px;padding:10px 14px;font-weight:800;text-align:center';
        bar.textContent = (ar ? '🕒 المتجر مغلق الآن — يمكنك التصفح، والطلب متاح عند الفتح. ' : '🕒 The store is closed now — you can browse; ordering opens when we open. ') + nextOpeningText();
        main.parentElement.insertBefore(bar, main);
      }
    }
    updateLiveCart();
  }

  async function submitOrderPayload(name, phone, address, notes, btnEl) {
    if (_cart.length === 0) {
      alert(_currentLang === 'ar' ? 'سلة المشتريات فارغة' : 'Your cart is empty');
      return;
    }
    if (!name.trim()) {
      alert(_currentLang === 'ar' ? 'يرجى كتابة الاسم' : 'Please enter your name');
      return;
    }
    if (!phone.trim()) {
      alert(_currentLang === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Please enter your phone number');
      return;
    }
    if (!isPickup() && !address.trim()) {
      alert(_currentLang === 'ar' ? 'يرجى كتابة عنوان التوصيل' : 'Please enter the delivery address');
      return;
    }

    const subtotal = _cart.reduce((s, it) => s + (it.price * it.quantity), 0);
    const block = orderBlockReason(subtotal);
    if (block) { alert(block); return; }
    const deliveryFee = currentDeliveryFee();
    const grandTotal = subtotal + deliveryFee;
    const orderNumber = 'RS-' + Math.floor(100000 + Math.random() * 900000);
    address = addressWithZone(address);

    const payload = {
      shop_id: _tenant.id,
      order_number: orderNumber,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      delivery_address: address.trim(),
      notes: notes.trim(),
      subtotal: subtotal,
      delivery_fee: deliveryFee,
      total: grandTotal,
      currency_code: _tenant.currency || 'USD',
      payment_method: 'cod',
      payment_status: 'pending',
      order_status: 'received',
      items: _cart.map(c => ({
        product_id: c.productId,
        product_name: c.name,
        quantity: c.quantity,
        unit_price: c.price,
        total_price: c.price * c.quantity
      }))
    };

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `<span>⏳</span><span>${_currentLang === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}</span>`;
    }

    const res = await StorefrontAPI.submitOrder(payload);

    if (res.success) {
      _cart = [];
      saveCart();
      closeMobileCartModal();
      // The shop's server re-checks prices and may change the number: show what it saved.
      const saved = res.order || {};
      showSuccessModal(saved.order_number || orderNumber, parseFloat(saved.total) || grandTotal);
      try { localStorage.setItem('rs_last_order_' + _tenant.id, saved.order_number || orderNumber); } catch (e) { }
    } else {
      alert((_currentLang === 'ar' ? 'فشل إرسال الطلب: ' : 'Error submitting order: ') + res.error);
    }

    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = `<span>🛍️</span><span>${t('placeOrder')}</span>`;
    }
  }

  function submitOrderFromSide() {
    const name = document.getElementById('side-checkout-name')?.value || '';
    const phone = document.getElementById('side-checkout-phone')?.value || '';
    const address = document.getElementById('side-checkout-address')?.value || '';
    const notes = document.getElementById('side-checkout-notes')?.value || '';
    const btn = document.getElementById('btn-side-checkout');
    submitOrderPayload(name, phone, address, notes, btn);
  }

  function submitOrderFromModal() {
    const name = document.getElementById('modal-checkout-name')?.value || '';
    const phone = document.getElementById('modal-checkout-phone')?.value || '';
    const address = document.getElementById('modal-checkout-address')?.value || '';
    const notes = document.getElementById('modal-checkout-notes')?.value || '';
    const btn = document.getElementById('btn-modal-checkout');
    submitOrderPayload(name, phone, address, notes, btn);
  }

  function orderViaWhatsAppFromSide() {
    const name = document.getElementById('side-checkout-name')?.value || '';
    const phone = document.getElementById('side-checkout-phone')?.value || '';
    const address = document.getElementById('side-checkout-address')?.value || '';
    buildWhatsAppMessage(name, phone, address);
  }

  function orderViaWhatsAppFromModal() {
    const name = document.getElementById('modal-checkout-name')?.value || '';
    const phone = document.getElementById('modal-checkout-phone')?.value || '';
    const address = document.getElementById('modal-checkout-address')?.value || '';
    buildWhatsAppMessage(name, phone, address);
  }

  function buildWhatsAppMessage(name, phone, address) {
    if (_cart.length === 0) {
      alert(_currentLang === 'ar' ? 'سلة المشتريات فارغة' : 'Your cart is empty');
      return;
    }

    const targetPhone = shopWhatsApp();
    if (!targetPhone) {
      alert(_currentLang === 'ar' ? 'هذا المتجر لا يستقبل الطلبات عبر واتساب. استخدم زر تأكيد الطلب.' : 'This store does not take WhatsApp orders. Please use the Place order button.');
      return;
    }
    const subtotal = _cart.reduce((s, it) => s + (it.price * it.quantity), 0);
    const block = orderBlockReason(subtotal);
    if (block) { alert(block); return; }
    address = addressWithZone(address);
    const deliveryFee = currentDeliveryFee();
    const grandTotal = subtotal + deliveryFee;

    let msg = `*طلب جديد من المتجر الإلكتروني:*\n`;
    msg += `🏪 *المتجر:* ${_tenant?.shop_name}\n`;
    if (name) msg += `👤 *الاسم:* ${name}\n`;
    if (phone) msg += `📞 *الهاتف:* ${phone}\n`;
    if (address) msg += `📍 *العنوان:* ${address}\n`;
    msg += `-------------------------\n`;
    _cart.forEach(it => {
      msg += `• ${it.name} (x${it.quantity}) - $${(it.price * it.quantity).toFixed(2)}\n`;
    });
    msg += `-------------------------\n`;
    msg += `*المجموع:* $${subtotal.toFixed(2)}\n`;
    msg += `*التوصيل:* $${deliveryFee.toFixed(2)}\n`;
    msg += `*الإجمالي النهائي:* $${grandTotal.toFixed(2)}\n`;

    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  }

  function showSuccessModal(orderNum, total) {
    document.getElementById('success-order-number').textContent = orderNum;
    document.getElementById('success-order-total').textContent = `$${total.toFixed(2)}`;
    document.getElementById('success-modal').classList.add('open');
  }

  function closeSuccessModal() {
    const m = document.getElementById('success-modal');
    if (m) m.classList.remove('open');
  }

  // Live Search Filter (automatically reveals products view if user types)
  function onSearch(query) {
    _searchQuery = query;
    _selectedCategory = 'all';
    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');
    if (query.trim() !== '') {
      _viewMode = 'products';
      if (bigView) bigView.style.display = 'none';
      if (prodsView) prodsView.style.display = 'block';

      const vTitle = document.getElementById('current-view-title');
      if (vTitle) vTitle.textContent = _currentLang === 'ar' ? `🔍 نتائج البحث: "${query}"` : `🔍 Search: "${query}"`;
      renderGroupedProducts();
    } else {
      showCategoriesGrid();
    }
  }

  function applyTheme(theme) {
    _currentTheme = theme;
    localStorage.setItem('rs_theme', theme);
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    const btn = document.getElementById('btn-toggle-theme');
    if (btn) btn.innerHTML = `<span>${theme === 'dark' ? '☀️' : '🌙'}</span>`;
  }

  function toggleTheme() {
    applyTheme(_currentTheme === 'dark' ? 'fresh-light' : 'dark');
  }

    function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setPlaceholder(id, ph) {
    const el = document.getElementById(id);
    if (el) el.placeholder = ph;
  }

  function applyLang(lang) {
    _currentLang = lang;
    localStorage.setItem('rs_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    const btn = document.getElementById('btn-toggle-lang');
    if (btn) btn.innerHTML = `<span>🌐</span><span>${lang === 'ar' ? 'English' : 'عربي'}</span>`;

    // Search bar
    setPlaceholder('search-catalog', t('searchPlaceholder'));
    document.querySelectorAll('.track-btn-label').forEach(el => { el.textContent = lang === 'ar' ? 'تتبع طلبك' : 'Track order'; });
    setText('tab-txt-cats', lang === 'ar' ? 'التصنيفات' : 'Categories');
    setText('tab-txt-all', lang === 'ar' ? 'كل الأصناف' : 'All products');

    // Filter pills
    setText('pill-cats-text', t('browseCategories'));
    setText('pill-all-text', t('allProducts'));

    // Category / Products Views
    setText('title-categories-view', t('categoriesTitle'));
    setText('sub-categories-view', t('categoriesSubtitle'));
    setText('btn-show-all-text', t('viewAllProducts'));
    setText('btn-back-cats-text', t('backToCategories'));

    // Side Cart Labels & Inputs
    setText('cart-title-text', t('cartTitle'));
    setText('btn-clear-cart-text', t('clearCart'));
    setText('label-subtotal', t('subtotal'));
    setText('label-delivery', t('deliveryFee'));
    setText('label-grand-total', t('grandTotal'));
    setText('label-name', t('nameLabel'));
    setPlaceholder('side-checkout-name', t('namePlaceholder'));
    setText('label-phone', t('phoneLabel'));
    setPlaceholder('side-checkout-phone', t('phonePlaceholder'));
    setText('label-address', t('addressLabel'));
    setPlaceholder('side-checkout-address', t('addressPlaceholder'));
    setText('label-notes', t('notesLabel'));
    setPlaceholder('side-checkout-notes', t('notesPlaceholder'));
    setText('btn-submit-order-text', t('placeOrder'));
    setText('btn-whatsapp-text', t('orderViaWhatsApp'));

    // Mobile Cart Bar
    setText('mob-cart-title', t('mobCartTitle'));
    setText('mob-cart-items-unit', t('mobCartItemsUnit'));
    setText('mob-cart-btn-text', t('mobCartBtn'));

    // Mobile Modal Cart Sheet
    setText('modal-cart-title-text', t('modalCartTitle'));
    setText('modal-label-subtotal', t('subtotal'));
    setText('modal-label-delivery', t('deliveryFee'));
    setText('modal-label-grand-total', t('grandTotal'));
    setText('modal-label-name', t('nameLabel'));
    setPlaceholder('modal-checkout-name', t('namePlaceholder'));
    setText('modal-label-phone', t('phoneLabel'));
    setPlaceholder('modal-checkout-phone', t('phonePlaceholder'));
    setText('modal-label-address', t('addressLabel'));
    setPlaceholder('modal-checkout-address', t('addressPlaceholder'));
    setText('modal-label-notes', t('notesLabel'));
    setPlaceholder('modal-checkout-notes', t('notesPlaceholder'));
    setText('btn-modal-checkout-text', t('placeOrder'));
    setText('btn-modal-whatsapp-text', t('orderViaWhatsApp'));

    // Success Modal
    setText('success-modal-title', t('successTitle'));
    setText('success-modal-desc', t('successDesc'));
    setText('success-lbl-order-id', t('orderIdLabel'));
    setText('success-lbl-total', t('totalLabel'));
    setText('btn-continue-shopping-text', t('continueShopping'));
  }

  function toggleLang() {
    applyLang(_currentLang === 'ar' ? 'en' : 'ar');
    if (_tenant) {
      renderHeader();
      initCarousel();
      renderAnnouncement();
      renderFooter();
      renderCategoriesSlider();
      renderOffersStrip();
      renderBigCategoriesGrid();
      if (_viewMode === 'products') renderGroupedProducts();
      updateLiveCart();
    }
  }

  function promptInstallPWA() {
    if (!_deferredPrompt && window.__rsInstallPrompt) _deferredPrompt = window.__rsInstallPrompt;
    if (_deferredPrompt) {
      _deferredPrompt.prompt();
      _deferredPrompt = null;
      window.__rsInstallPrompt = null;
    } else {
      alert(_currentLang === 'ar' 
        ? 'لتثبيت التطبيق: اضغط على زر المشاركة أو القائمة (⋮) ثم اختر "إضافة إلى الشاشة الرئيسية"' 
        : 'To install: Tap the browser menu or share icon and select "Add to Home Screen"');
    }
  }

  function showLoader(visible) {
    const el = document.getElementById('app-loader');
    if (el) el.style.display = visible ? 'flex' : 'none';
  }

  // True when this page is the shared cloud store (not already the shop's own server).
  function isCloudStorePage() {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('server') || u.searchParams.get('api')) return false;
      const p = window.location.pathname;
      if (p.includes('/storefront') || p.includes('/shop')) return false;
      if (window.location.port === '3000' || window.location.port === '3443') return false;
      return true;
    } catch (e) { return false; }
  }

  async function handleDirectShop(tenant, slug) {
    if (!tenant || tenant.store_mode !== 'direct' || !isCloudStorePage()) return false;
    const base = String(tenant.direct_url || '').trim().replace(/\/+$/, '');
    if (base && /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(base)) {
      try {
        const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timer = ctl ? setTimeout(() => ctl.abort(), 7000) : null;
        const r = await fetch(`${base}/rest/v1/tenants?select=id`, { mode: 'cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined });
        if (timer) clearTimeout(timer);
        if (r.ok) {
          const q = new URLSearchParams(window.location.search);
          q.set('shop', slug);
          window.location.replace(`${base}/storefront/?${q.toString()}`);
          return true;
        }
      } catch (e) { /* PC off, no internet, or address not set up */ }
    }
    showLoader(false);
    renderStoreClosed(tenant);
    return true;
  }

  function renderStoreClosed(tenant) {
    document.title = tenant.shop_name || document.title;
    // keep the shop's own name and logo in the header
    try {
      _saveBrandCache(tenant);
      const nm = document.getElementById('header-brand-name');
      if (nm && tenant.shop_name) nm.textContent = tenant.shop_name;
      const lg = document.getElementById('header-brand-logo');
      if (lg) {
        if (tenant.logo_url) lg.innerHTML = '<img src="' + String(tenant.logo_url).replace(/"/g, '&quot;') + '" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">';
        else if (tenant.shop_name) lg.textContent = String(tenant.shop_name).trim().charAt(0).toUpperCase();
      }
    } catch (e) {}
    const main = document.getElementById('main-content');
    const wa = String(tenant.whatsapp_phone || '').replace(/[^0-9]/g, '');
    const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (main) {
      main.innerHTML = `
        <div style="grid-column:1/-1;max-width:500px;margin:80px auto;text-align:center;padding:32px 20px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-lg);box-shadow:var(--shadow-md)">
          <div style="font-size:3.5rem;margin-bottom:12px">🕒</div>
          <h2 style="font-weight:900;margin-bottom:6px">${esc(tenant.shop_name)}</h2>
          <h3 style="font-weight:800;margin-bottom:8px">المتجر مغلق حالياً — Store closed right now</h3>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px">لا يمكن استقبال الطلبات الآن. يرجى المحاولة لاحقاً.<br>Orders cannot be taken right now. Please try again later.</p>
          <button class="icon-btn" onclick="location.reload()" style="margin:0 auto 10px">🔄 إعادة المحاولة / Try again</button>
          ${wa ? `<div><a href="https://wa.me/${wa}" target="_blank" rel="noopener" style="font-weight:800;color:#16a34a">💬 WhatsApp</a></div>` : ''}
        </div>`;
    }
    ['mobile-cart-bar', 'cart-fab', 'btn-cart', 'cart-btn'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  }

  function renderNotFound(slug) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div style="grid-column:1/-1;max-width:500px;margin:80px auto;text-align:center;padding:32px 20px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-lg);box-shadow:var(--shadow-md)">
          <div style="font-size:3.5rem;margin-bottom:12px">🏪</div>
          <h2 style="font-weight:900;margin-bottom:8px">المتجر غير موجود</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px">المعرف (${slug}) غير مسجل في النظام.</p>
          <button class="icon-btn" onclick="window.location.search='?shop=bobmarket'" style="margin:0 auto">الذهاب للمتجر الافتراضي</button>
        </div>
      `;
    }
  }

  
  let _pwaPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _pwaPrompt = e;
  });

    function getDirectCurrentUrl() {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('source');
      return u.toString();
    } catch(e) {
      return window.location.href;
    }
  }

  function openAppDownloadModal() {
    const modal = document.getElementById('modal-app-download');
    if (!modal) return;

    const shopName = (_tenant && _tenant.shop_name) ? _tenant.shop_name : (isArabicUi() ? 'المتجر' : 'the store');
    const currentUrl = getDirectCurrentUrl();

    const titleEl = document.getElementById('modal-app-title');
    if (titleEl) {
      titleEl.innerHTML = `📲 تطبيق متجر ${shopName}`;
    }
    const descEl = document.getElementById('modal-app-desc');
    if (descEl) {
      descEl.innerHTML = `تثبيت تطبيق متجر <strong>${shopName}</strong> مباشرة على شاشة هاتفك الرئيسية للطلب السريع والتصفح الفوري بنقرة واحدة.`;
    }
    const urlEl = document.getElementById('app-direct-url-text');
    if (urlEl) {
      urlEl.textContent = currentUrl;
    }

    modal.style.display = 'flex';
    modal.style.zIndex = '999999';
    modal.classList.add('open');
  }

  function downloadAppApk() {
    installPWA();
  }

  function copyDirectAppLink() {
    const currentUrl = getDirectCurrentUrl();
    const el = document.getElementById('app-direct-url-text');
    if (el) el.textContent = currentUrl;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        alert(_currentLang === 'ar' ? 'تم نسخ رابط المتجر بنجاح!' : 'Store link copied to clipboard!');
      }).catch(() => {
        prompt(_currentLang === 'ar' ? 'انسخ الرابط:' : 'Copy link:', currentUrl);
      });
    } else {
      prompt(_currentLang === 'ar' ? 'انسخ الرابط:' : 'Copy link:', currentUrl);
    }
  }

  function closeAppDownloadModal() {
    const modal = document.getElementById('modal-app-download');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
  }

  function toggleInstallInstructions() {
    const el = document.getElementById('app-install-instructions');
    if (el) {
      el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
    }
  }

  function installPWA() {
    const inst = document.getElementById('app-install-instructions');
    if (inst) inst.style.display = 'block';

    const promptEvent = _deferredPrompt || _pwaPrompt || window.__rsInstallPrompt;
    if (promptEvent) {
      try {
        _deferredPrompt = null;
        _pwaPrompt = null;
        window.__rsInstallPrompt = null;
        promptEvent.prompt();
        if (promptEvent.userChoice) {
          promptEvent.userChoice.then((choice) => {
            if (choice && choice.outcome === 'accepted') {
              closeAppDownloadModal();
            }
          }).catch(() => {});
        }
        return;
      } catch(err) {
        console.warn('Install prompt error:', err);
      }
    }

    // Fallback: Smart device detection & interactive guidance
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isInApp = /FBAN|FBAV|Instagram|WhatsApp|Line|Telegram|Snapchat/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAR = _currentLang === 'ar';

    if (isInApp) {
      alert(isAR
        ? '⚠️ تنبيه مهم:\nأنت تتصفح حالياً من داخل تطبيق (مثل واتساب أو انستغرام).\n\nلتتمكن من تثبيت التطبيق على هاتفك:\n1. اضغط على القائمة (⋮ أو ⋯) في زاوية الشاشة.\n2. اختر "الفتح في متصفح خارجي" (Open in Chrome / Safari).\n3. ثم قم بتثبيت التطبيق بنقرة واحدة.'
        : '⚠️ Notice:\nYou are viewing from inside an in-app browser (e.g. WhatsApp/Instagram).\n\nTo install:\n1. Tap the menu (...) in the corner.\n2. Choose "Open in Chrome / Safari".\n3. Then install the app.');
      return;
    }

    if (isIOS) {
      alert(isAR
        ? '🍏 خطوات تثبيت التطبيق على iPhone:\n\n1. اضغط على زر المشاركة (Share ⬆) في شريط المتصفح السفلي في Safari.\n2. مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).\n\nسيظهر التطبيق كأيقونة دائمة على شاشة هاتفك!'
        : '🍏 To install on iPhone (Safari):\n\n1. Tap the Share button (⬆) at the bottom of Safari.\n2. Scroll down and tap "Add to Home Screen".\n\nThe app will be added to your home screen!');
      if (inst) {
        inst.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        inst.style.border = '2px solid #a78bfa';
        inst.style.boxShadow = '0 0 15px rgba(167, 139, 250, 0.4)';
        setTimeout(() => { inst.style.border = ''; inst.style.boxShadow = ''; }, 3500);
      }
      return;
    }

    // Android / Desktop fallback: Guide to browser menu install
    alert(isAR
      ? '📲 لتثبيت التطبيق على هاتفك بنقرة واحدة وبدون أي تحذيرات:\n\n1. اضغط على قائمة المتصفح (⋮) في أعلى أو أسفل الشاشة في Chrome.\n2. اختر "تثبيت التطبيق" (Install app) أو "إضافة إلى الشاشة الرئيسية" (Add to Home screen).'
      : '📲 To install ' + ((_tenant && _tenant.shop_name) || 'the store') + ':\n\n1. Tap the browser menu (⋮) in Chrome.\n2. Tap "Install App" or "Add to Home screen".');

    if (inst) {
      inst.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      inst.style.border = '2px solid var(--shop-brand, #dc2626)';
      inst.style.boxShadow = '0 0 15px color-mix(in srgb, var(--shop-brand, #dc2626) 40%, transparent)';
      setTimeout(() => { inst.style.border = ''; inst.style.boxShadow = ''; }, 3500);
    }
  }

  function openTrackOrderModal(orderId) {
    const modal = document.getElementById('modal-track-order');
    const input = document.getElementById('track-order-input');
    const res = document.getElementById('track-order-result');
    if (res) res.style.display = 'none';
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open');
      if (orderId && input) {
        input.value = orderId;
        trackOrderQuery();
      }
    }
  }

  function closeTrackOrderModal() {
    const modal = document.getElementById('modal-track-order');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
  }

  async function trackOrderQuery() {
    const input = document.getElementById('track-order-input');
    const resEl = document.getElementById('track-order-result');
    if (!input || !resEl) return;
    const raw = input.value.trim();
    if (!raw) {
      alert(_currentLang === 'ar' ? 'الرجاء إدخال رقم الطلب أو رقم الهاتف' : 'Please enter an order ID or phone number');
      return;
    }

    resEl.style.display = 'block';
    resEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><div style="display:inline-block;width:30px;height:30px;border:3px solid color-mix(in srgb, var(--shop-brand, #dc2626) 20%, transparent);border-top-color:var(--shop-brand, #dc2626);border-radius:50%;animation:spin 0.8s linear infinite"></div><div style="margin-top:10px;font-weight:700;">جاري البحث عن طلبك...</div></div>';

    try {
      const cleanQ = raw.replace(/[^a-zA-Z0-9_-]/g, '');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);

      let orFilter = 'order_number.ilike.*' + encodeURIComponent(cleanQ) + '*,customer_phone.ilike.*' + encodeURIComponent(cleanQ) + '*';
      if (isUUID) {
        orFilter += ',id.eq.' + raw;
      }

      const url = StorefrontAPI.getUrl() + '/rest/v1/orders?shop_id=eq.' + _tenant.id + '&or=(' + orFilter + ')&order=created_at.desc&limit=5';
      const res = await fetch(url, {
        headers: {
          ...StorefrontAPI.getKey() ? { 'apikey': StorefrontAPI.getKey(), 'Authorization': 'Bearer ' + StorefrontAPI.getKey() } : {}
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      const orders = await res.json();

      if (!Array.isArray(orders) || orders.length === 0) {
        resEl.innerHTML = '<div style="text-align:center;padding:24px 12px;">' +
          '<div style="font-size:2.8rem;margin-bottom:8px">🔍</div>' +
          '<div style="font-size:1.05rem;font-weight:900;color:var(--text-main);">لم يتم العثور على أي طلب برقم (' + raw + ')</div>' +
          '<div style="font-size:0.82rem;color:var(--text-muted);margin-top:6px;line-height:1.5;">يرجى التأكد من كتابة رقم الهاتف أو كود الطلب بشكل صحيح، أو التواصل مع المتجر للمساعدة.</div>' +
          '</div>';
        return;
      }

      const statusMap = {
        'pending': { step: 1, label: '📥 تم استلام الطلب', color: '#f59e0b', desc: 'تم استلام طلبك وبانتظار المراجعة من الكاشير' },
        'confirmed': { step: 2, label: '👨‍🍳 جاري التجهيز', color: '#3b82f6', desc: 'يقوم فريق المتجر بتجهيز محتويات طلبك الآن' },
        'preparing': { step: 2, label: '👨‍🍳 جاري التجهيز', color: '#3b82f6', desc: 'يقوم فريق المتجر بتجهيز محتويات طلبك الآن' },
        'out_for_delivery': { step: 3, label: '🛵 مع مندوب التوصيل', color: '#8b5cf6', desc: 'طلبك في الطريق إليك الآن مع مندوب التوصيل' },
        'delivering': { step: 3, label: '🛵 مع مندوب التوصيل', color: '#8b5cf6', desc: 'طلبك في الطريق إليك الآن مع مندوب التوصيل' },
        'completed': { step: 4, label: '✅ تم التسليم بنجاح', color: '#10b981', desc: 'تم تسليم الطلب للعميل بنجاح، شكراً لتسوقكم معنا!' },
        'delivered': { step: 4, label: '✅ تم التسليم بنجاح', color: '#10b981', desc: 'تم تسليم الطلب للعميل بنجاح، شكراً لتسوقكم معنا!' },
        'cancelled': { step: 0, label: '❌ تم الإلغاء', color: '#ef4444', desc: 'تم إلغاء هذا الطلب' }
      };

      resEl.innerHTML = orders.map(ord => {
        const rawStatus = (ord.order_status || ord.status || 'pending').toLowerCase();
        const st = statusMap[rawStatus] || statusMap['pending'];
        const total = (parseFloat(ord.total) || parseFloat(ord.total_amount) || 0).toFixed(2);
        const dateStr = new Date(ord.created_at).toLocaleDateString('ar', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

        const itemsList = Array.isArray(ord.items) && ord.items.length > 0
          ? ord.items.map(it => '<div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);padding:3px 0;"><span>' + (it.product_name || it.name || 'صنف') + '</span><strong>× ' + (it.quantity || 1) + '</strong></div>').join('')
          : '';

        return '<div style="padding:16px; background:var(--bg-surface); border-radius:14px; margin-bottom:12px; border:1.5px solid var(--border-color); box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">' +
            '<div>' +
              '<div style="font-size:1.08rem; font-weight:900; color:var(--text-main);">#' + (ord.order_number || ord.id.slice(0,8)) + '</div>' +
              '<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">' + dateStr + ' • ' + (ord.customer_name || 'عميل') + '</div>' +
            '</div>' +
            '<span style="background:' + st.color + '15; color:' + st.color + '; border:1.5px solid ' + st.color + '40; font-size:0.82rem; font-weight:900; padding:4px 12px; border-radius:20px;">' +
              st.label +
            '</span>' +
          '</div>' +
          '<div style="display:flex; gap:4px; margin:14px 0 10px 0;">' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 1 ? 'var(--shop-brand, #dc2626)' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 2 ? 'var(--shop-brand, #dc2626)' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 3 ? 'var(--shop-brand, #dc2626)' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 4 ? '#10b981' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
          '</div>' +
          '<p style="font-size:0.86rem; color:var(--text-main); font-weight:800; margin:8px 0 12px 0; background:color-mix(in srgb, var(--shop-brand, #dc2626) 4%, transparent); padding:8px 10px; border-radius:8px;">' +
            st.desc +
          '</p>' +
          (itemsList ? '<div style="background:var(--bg-primary); border-radius:8px; padding:8px 10px; margin-bottom:10px;">' + itemsList + '</div>' : '') +
          (ord.delivery_address ? '<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">📍 العنوان: <strong>' + ord.delivery_address + '</strong></div>' : '') +
          '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; border-top:1px dashed var(--border-color); padding-top:10px;">' +
            '<span>المجموع الكلي: <strong style="color:var(--shop-brand, #dc2626); font-size:1.05rem;">$' + total + '</strong></span>' +
            '<a href="https://wa.me/' + shopWhatsApp() + '?text=' + encodeURIComponent('مرحباً، أتابع طلبي رقم #' + (ord.order_number || ord.id)) + '" target="_blank" style="background:#25d366; color:#fff; font-size:0.78rem; font-weight:900; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border-radius:8px; box-shadow:0 2px 6px rgba(37,211,102,0.3);">' +
              '<span>💬 متابعة واتساب</span>' +
            '</a>' +
          '</div>' +
        '</div>';
      }).join('');

    } catch(err) {
      console.error('[TrackOrder] Error:', err);
      resEl.innerHTML = '<div style="color:#ef4444;text-align:center;padding:16px;font-weight:700;">حدث خطأ أثناء تتبع الطلب، يرجى المحاولة لاحقاً</div>';
    }
  }

  return {
    openSlide,
    openProduct,
    showOffers,
    onZoneChange,
    copyDirectAppLink,
    openTrackOrderModal,
    closeTrackOrderModal,
    trackOrderQuery,
    openAppDownloadModal,
    closeAppDownloadModal,
    downloadAppApk,
    installPWA,
    init,
    showCategoriesGrid,
    selectCategory,
    showAllProducts,
    onSearch,
    addToCart,
    updateCartQty,
    deleteItem,
    clearCart,
    openMobileCartModal,
    closeMobileCartModal,
    submitOrderFromSide,
    submitOrderFromModal,
    orderViaWhatsAppFromSide,
    orderViaWhatsAppFromModal,
    closeSuccessModal,
    prevSlide,
    nextSlide,
    goToSlide,
    toggleTheme,
    toggleLang,
    promptInstallPWA,
    toggleInstallInstructions
  };
})();

window.Storefront = Storefront;
document.addEventListener('DOMContentLoaded', () => Storefront.init());



