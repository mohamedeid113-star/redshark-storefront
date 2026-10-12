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

    const saved = localStorage.getItem('rs_last_shop_slug');
    if (saved && !systemSubdomains.includes(saved) && saved !== 'null' && saved !== 'undefined') {
      return saved;
    }

    return 'shop101';
  }

  async function init() {
    // Purge any stale cache on client load if version changed
    const APP_VERSION = '20.0';
    if (localStorage.getItem('rs_client_ver') !== APP_VERSION) {
      localStorage.setItem('rs_client_ver', APP_VERSION);
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js?v=20.0').then(reg => {
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

      if (!_tenant && slug !== 'shop101') {
        console.warn(`Shop '${slug}' not found, falling back to default shop101...`);
        slug = 'shop101';
        _tenant = await StorefrontAPI.fetchTenant('shop101');
      }

      if (!_tenant) {
        renderNotFound(slug);
        return;
      }
      localStorage.setItem('rs_last_shop_slug', _tenant.slug || slug);

      document.title = `${_tenant.shop_name} — Red Shark Online Store`;

      // 1. Fetch categories and first batch of products in parallel for INSTANT display
      const [cats, initialProds] = await Promise.all([
        StorefrontAPI.fetchCategories(_tenant.id),
        StorefrontAPI.fetchFirstBatchProducts ? StorefrontAPI.fetchFirstBatchProducts(_tenant.id) : StorefrontAPI.fetchProducts(_tenant.id)
      ]);

      _categories = cats || [];
      _products = initialProds || [];
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

      // Show Categories Grid on first open as requested
      showCategoriesGrid();
      showLoader(false);

      // Concurrently fetch remainder of catalog if any
      StorefrontAPI.fetchProducts(_tenant.id).then(allProds => {
        if (allProds && allProds.length > _products.length) {
          _products = allProds;
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
        brandLogo.innerHTML = `<img src="${_tenant.logo_url}" alt="${_tenant.shop_name}" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">`;
      } else {
        brandLogo.innerHTML = `<img src="assets/red_shark_icon.png" alt="Red Shark" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">`;
      }
    }
    if (openStatus) openStatus.textContent = t('openNow');

    const isLiveStock = _tenant.link_pos_stock === true;
    if (stockText) stockText.textContent = isLiveStock ? t('liveStockBadge') : t('menuModeBadge');
    if (stockPill) stockPill.className = 'header-pill ' + (isLiveStock ? 'pos-live' : '');

    const deliveryFee = (parseFloat(_tenant.delivery_fee) || 0).toFixed(2);
    if (delText) delText.textContent = `${t('deliveryFee')}: $${deliveryFee}`;

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

    if (_tenant.banner_url) {
      const trimmed = _tenant.banner_url.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.active === false) {
            wrap.style.display = 'none';
            return;
          }
          if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
            _carouselSlides = parsed.slides.filter(s => s.active !== false);
          } else if (parsed.title || parsed.image_url) {
            _carouselSlides = [parsed];
          }
        } catch(e) {}
      } else if (trimmed.startsWith('http')) {
        _carouselSlides = [{ active: true, title: '', subtitle: '', image_url: trimmed }];
      }
    }

    // Default Fallback Offers
    if (_carouselSlides.length === 0) {
      _carouselSlides = [
        {
          active: true,
          title: '🔥 عروض نهاية الأسبوع: خصومات حصرية تصل إلى 25% على المنتجات الغذائية!',
          subtitle: 'اطلب الآن واستفد من التوصيل السريع والأسعار المميزة مباشرة إلى باب منزلك • كود الخصم SHARK25',
          badge: '🔥 عرض خاص لفترة محدودة',
          image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
        },
        {
          active: true,
          title: '🍎 قسم الخضار والفواكه والمواد التموينية: طازجة يومياً من المزارع إليكم',
          subtitle: 'عروض يومية متجددة وتوصيل سريع يحافظ على جودة ونضارة كل صنف',
          badge: '🌿 طازج وصحي',
          image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80'
        }
      ];
    }

    wrap.style.display = 'block';

    track.innerHTML = _carouselSlides.map((slide) => {
      const hasImage = Boolean(slide.image_url);
      return `
        <div class="carousel-slide ${hasImage ? 'has-image' : ''}">
          <div class="slide-content">
            ${slide.badge ? `<span class="slide-badge">${slide.badge}</span>` : ''}
            ${slide.title ? `<h3 class="slide-title">${slide.title}</h3>` : ''}
            ${slide.subtitle ? `<p class="slide-sub">${slide.subtitle}</p>` : ''}
          </div>
          ${hasImage ? `
            <div class="slide-image-side">
              <img src="${slide.image_url}" alt="${slide.title || 'Special Offer'}" loading="lazy">
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

    if (_categories.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد أقسام مسجلة</div>';
      return;
    }

    container.innerHTML = _categories.map(cat => {
      const name = _currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name);
      const count = _products.filter(p => p.category_id === cat.id).length;
      
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
      tabCats.style.background = '#dc2626';
      tabCats.style.color = '#fff';
      tabCats.style.borderColor = '#dc2626';
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
    renderBigCategoriesGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectCategory(catId) {
    _viewMode = 'products';
    _selectedCategory = catId;

    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');

    if (bigView) bigView.style.display = 'none';

    const catSlider = document.getElementById('categories-slider');
    if (catSlider) {
      catSlider.style.display = _viewMode === 'categories' ? 'none' : 'flex';
    }

    if (prodsView) prodsView.style.display = 'block';

    const cat = _categories.find(c => c.id === catId);
    const catName = cat ? (_currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name)) : t('allProducts');
    const catCount = cat ? _products.filter(p => p.category_id === catId).length : _products.length;

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
      tabAll.style.background = '#dc2626';
      tabAll.style.color = '#fff';
      tabAll.style.borderColor = '#dc2626';
      tabCats.style.background = 'var(--bg-surface)';
      tabCats.style.color = 'var(--text-main)';
      tabCats.style.borderColor = 'var(--border-color)';
    }

    const bigView = document.getElementById('categories-big-view');
    const prodsView = document.getElementById('products-view');

    if (bigView) bigView.style.display = 'none';
    if (prodsView) prodsView.style.display = 'block';

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
          <div style="display:inline-block;width:34px;height:34px;border:3px solid rgba(220,38,38,0.2);border-top-color:#dc2626;border-radius:50%;animation:spin 0.8s linear infinite"></div>
          <h3 style="font-size:1.05rem;font-weight:800;margin-top:12px;color:var(--text-main);">${_currentLang === 'ar' ? 'جاري تحميل قائمة المنتجات...' : 'Loading products...'}</h3>
        </div>
      `;
      return;
    }

    let filtered = _products;
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
    const activeCats = _selectedCategory === 'all' 
      ? _categories 
      : _categories.filter(c => c.id === _selectedCategory);

    activeCats.forEach(cat => {
      const prodsInCat = filtered.filter(p => p.category_id === cat.id);
      if (prodsInCat.length > 0) {
        catGroups.set(cat.id, {
          name: _currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name),
          products: prodsInCat
        });
      }
    });

    const uncategorizedProds = filtered.filter(p => !p.category_id || !catGroups.has(p.category_id));
    if (uncategorizedProds.length > 0 && _selectedCategory === 'all') {
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
              <span style="color:#dc2626;">✦</span>
              <span>${group.name}</span>
            </h3>
            <span class="category-group-count" style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:var(--bg-surface); padding:3px 10px; border-radius:12px; border:1px solid var(--border-color);">${group.products.length} ${_currentLang === 'ar' ? 'صنف' : 'items'}</span>
          </div>

          <div class="products-grid" style="display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; width: 100% !important; box-sizing: border-box !important;">
            ${group.products.map(prod => {
              const name = _currentLang === 'ar' ? (prod.name_ar || prod.name) : (prod.name_en || prod.name);
              const priceUSD = (parseFloat(prod.price) || 0).toFixed(2);
              const priceLBP = Math.round((parseFloat(prod.price) || 0) * lbpRate).toLocaleString();
              const inCart = _cart.find(c => c.productId === prod.id);
              const cartQty = inCart ? inCart.quantity : 0;

              return `
                <div class="product-card ${cartQty > 0 ? 'has-cart' : ''}" data-product-id="${prod.id}" style="min-width: 0 !important; width: 100% !important; box-sizing: border-box !important; border-radius: 14px !important; padding: 10px !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; background: var(--bg-surface) !important; border: 1.5px solid var(--border-color) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;">
                  
                  <div class="product-img-wrap" style="height: 115px !important; min-height: 115px !important; max-height: 115px !important; width: 100% !important; border-radius: 10px !important; overflow: hidden !important; position: relative !important; display: flex !important; align-items: center !important; justify-content: center !important; background: #f8fafc !important; margin-bottom: 8px !important;">
                    ${prod.image_url ? `<img src="${prod.image_url}" alt="${name}" loading="lazy" style="height: 100% !important; width: 100% !important; object-fit: contain !important; padding: 4px !important;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
                    <div class="prod-no-img" style="${prod.image_url ? 'display:none !important;' : 'display:flex !important;'} height: 100% !important; width: 100% !important; align-items: center !important; justify-content: center !important; background: rgba(220, 38, 38, 0.04) !important;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5">
                        <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                      </svg>
                    </div>
                  </div>

                  <div class="product-info" style="flex: 1 !important; min-width: 0 !important; margin-bottom: 6px !important;">
                    <h4 class="product-title" title="${name}" style="font-size: 0.88rem !important; font-weight: 800 !important; line-height: 1.35 !important; height: 2.7em !important; overflow: hidden !important; text-overflow: ellipsis !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; margin: 0 0 4px 0 !important; color: var(--text-main) !important;">${name}</h4>
                  </div>

                  <div class="product-footer" style="display: flex !important; flex-direction: column !important; gap: 8px !important; margin-top: auto !important; padding-top: 6px !important; border-top: 1px dashed rgba(0, 0, 0, 0.08) !important;">
                    <div class="product-price" style="display: flex !important; justify-content: space-between !important; align-items: baseline !important;">
                      <span class="price-usd" style="font-size: 1.1rem !important; font-weight: 900 !important; color: #dc2626 !important;">$${priceUSD}</span>
                      <span class="price-lbp" style="font-size: 0.65rem !important; color: var(--text-muted) !important; font-weight: 600 !important;">${priceLBP} ${t('currencyLBP') || 'L.L.'}</span>
                    </div>
                    
                    ${cartQty > 0 ? `
                      <div class="card-qty-stepper" style="display: flex !important; align-items: center !important; justify-content: space-between !important; background: #fef2f2 !important; border: 1.5px solid #dc2626 !important; border-radius: 8px !important; padding: 4px 8px !important;">
                        <button onclick="Storefront.updateCartQty('${prod.id}', -1)" aria-label="Decrease" style="width: 26px !important; height: 26px !important; border-radius: 6px !important; background: #dc2626 !important; color: #fff !important; border: none !important; font-weight: 900 !important; font-size: 0.95rem !important; cursor: pointer !important;">−</button>
                        <span style="font-size: 0.95rem !important; font-weight: 900 !important; color: #dc2626 !important;">${cartQty}</span>
                        <button onclick="Storefront.updateCartQty('${prod.id}', 1)" aria-label="Increase" style="width: 26px !important; height: 26px !important; border-radius: 6px !important; background: #dc2626 !important; color: #fff !important; border: none !important; font-weight: 900 !important; font-size: 0.95rem !important; cursor: pointer !important;">+</button>
                      </div>
                    ` : `
                      <button class="btn-add-cart" onclick="Storefront.addToCart('${prod.id}')" style="display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; width: 100% !important; padding: 8px 10px !important; border-radius: 8px !important; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important; color: #fff !important; border: none !important; font-size: 0.85rem !important; font-weight: 800 !important; cursor: pointer !important; box-shadow: 0 3px 8px rgba(220, 38, 38, 0.25) !important;">
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

    _categories.forEach(cat => {
      const catName = _currentLang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name);
      const isActive = _viewMode === 'products' && _selectedCategory === cat.id ? 'active' : '';
      html += `
        <button class="cat-chip ${isActive}" onclick="Storefront.selectCategory('${cat.id}')">
          <span>${catName}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  // ── 6. CART MANAGEMENT ──
  function loadCart() {
    try {
      const s = sessionStorage.getItem('rs_cart');
      if (s) _cart = JSON.parse(s);
    } catch(e) { _cart = []; }
  }

  function saveCart() {
    sessionStorage.setItem('rs_cart', JSON.stringify(_cart));
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
    const prod = _products.find(p => p.id === productId);
    if (!prod) return;

    const existing = _cart.find(c => c.productId === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      _cart.push({
        productId: prod.id,
        name: _currentLang === 'ar' ? (prod.name_ar || prod.name) : (prod.name_en || prod.name),
        price: parseFloat(prod.price) || 0,
        quantity: 1,
        imageUrl: prod.image_url || null
      });
    }

    saveCart();
  }

  function updateCartQty(productId, delta) {
    const item = _cart.find(c => c.productId === productId);
    if (!item) return;

    const prod = _products.find(p => p.id === productId);
    const stock = prod ? (parseInt(prod.stock_quantity) || 0) : 9999;

    if (delta > 0 && _tenant.link_pos_stock && !_tenant.allow_out_of_stock && (item.quantity + delta) > stock) {
      alert(_currentLang === 'ar' ? 'عذراً، لا تتوفر كمية إضافية بالمخزون' : 'No more stock available');
      return;
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
      _cart = _cart.filter(c => c.productId !== productId);
    }

    saveCart();
  }

  function deleteItem(productId) {
    const idx = _cart.findIndex(c => c.productId === productId);
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
    const totalCount = _cart.reduce((sum, it) => sum + it.quantity, 0);
    const subtotal = _cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    const deliveryFee = parseFloat(_tenant?.delivery_fee) || 0;
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

    const subtotal = _cart.reduce((s, it) => s + (it.price * it.quantity), 0);
    const deliveryFee = parseFloat(_tenant?.delivery_fee) || 0;
    const grandTotal = subtotal + deliveryFee;
    const orderNumber = 'RS-' + Math.floor(100000 + Math.random() * 900000);

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
      showSuccessModal(orderNumber, grandTotal);
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

    const targetPhone = (_tenant?.whatsapp_phone || _tenant?.owner_phone || '+96170123456').replace(/[^0-9+]/g, '');
    const subtotal = _cart.reduce((s, it) => s + (it.price * it.quantity), 0);
    const deliveryFee = parseFloat(_tenant?.delivery_fee) || 0;
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
      renderCategoriesSlider();
      renderBigCategoriesGrid();
      if (_viewMode === 'products') renderGroupedProducts();
      updateLiveCart();
    }
  }

  function promptInstallPWA() {
    if (_deferredPrompt) {
      _deferredPrompt.prompt();
      _deferredPrompt = null;
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

  function renderNotFound(slug) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div style="grid-column:1/-1;max-width:500px;margin:80px auto;text-align:center;padding:32px 20px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-lg);box-shadow:var(--shadow-md)">
          <div style="font-size:3.5rem;margin-bottom:12px">🏪</div>
          <h2 style="font-weight:900;margin-bottom:8px">المتجر غير موجود</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px">المعرف (${slug}) غير مسجل في النظام.</p>
          <button class="icon-btn" onclick="window.location.search='?shop=shop101'" style="margin:0 auto">الذهاب للمتجر الافتراضي</button>
        </div>
      `;
    }
  }

  
  let _pwaPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _pwaPrompt = e;
  });

  function openAppDownloadModal() {
    const modal = document.getElementById('modal-app-download');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open');
    }
  }

  function closeAppDownloadModal() {
    const modal = document.getElementById('modal-app-download');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
  }

  async function installPWA() {
    if (_pwaPrompt) {
      _pwaPrompt.prompt();
      const choice = await _pwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        closeAppDownloadModal();
      }
      _pwaPrompt = null;
    } else {
      // Browser instructions
      alert(_currentLang === 'ar' 
        ? 'للتثبيت على هاتفك: اضغط على خيارات المتصفح (⋮ أو زر المشاركة) ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home screen).'
        : 'To install on your phone: Tap browser menu (⋮ or Share) and select "Add to Home Screen".');
    }
  }

  
  // ── ORDER TRACKING FEATURE ──
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
    resEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><div style="display:inline-block;width:30px;height:30px;border:3px solid rgba(220,38,38,0.2);border-top-color:#dc2626;border-radius:50%;animation:spin 0.8s linear infinite"></div><div style="margin-top:10px;font-weight:700;">جاري البحث عن طلبك...</div></div>';

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
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 1 ? '#dc2626' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 2 ? '#dc2626' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 3 ? '#dc2626' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
            '<div style="flex:1; height:7px; border-radius:4px; background:' + (st.step >= 4 ? '#10b981' : '#e2e8f0') + '; transition:all 0.3s;"></div>' +
          '</div>' +
          '<p style="font-size:0.86rem; color:var(--text-main); font-weight:800; margin:8px 0 12px 0; background:rgba(220,38,38,0.04); padding:8px 10px; border-radius:8px;">' +
            st.desc +
          '</p>' +
          (itemsList ? '<div style="background:var(--bg-primary); border-radius:8px; padding:8px 10px; margin-bottom:10px;">' + itemsList + '</div>' : '') +
          (ord.delivery_address ? '<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">📍 العنوان: <strong>' + ord.delivery_address + '</strong></div>' : '') +
          '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; border-top:1px dashed var(--border-color); padding-top:10px;">' +
            '<span>المجموع الكلي: <strong style="color:#dc2626; font-size:1.05rem;">$' + total + '</strong></span>' +
            '<a href="https://wa.me/' + ((_tenant.whatsapp_phone || _tenant.owner_phone || '').replace(/[^0-9]/g, '')) + '?text=' + encodeURIComponent('مرحباً، أتابع طلبي رقم #' + (ord.order_number || ord.id)) + '" target="_blank" style="background:#25d366; color:#fff; font-size:0.78rem; font-weight:900; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border-radius:8px; box-shadow:0 2px 6px rgba(37,211,102,0.3);">' +
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
    openTrackOrderModal,
    closeTrackOrderModal,
    trackOrderQuery,
    openAppDownloadModal,
    closeAppDownloadModal,
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
    promptInstallPWA
  };
})();

window.Storefront = Storefront;
document.addEventListener('DOMContentLoaded', () => Storefront.init());
