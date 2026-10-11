/**
 * Red Shark Storefront — Administration Controller
 * 100% Comprehensive Multilingual (EN/AR), Products & Categories Editor, Image Uploader
 */

const Admin = (() => {
  let _tenant = null;
  let _orders = [];
  let _products = [];
  let _categories = [];
  let _categoryImages = {};
  let _slides = [];
  let _lang = localStorage.getItem('rs_admin_lang') || 'ar';

    const I18N = {
    ar: {
      pageTitle: 'لوحة تحكم المتجر الإلكتروني | Red Shark',
      langSwitch: 'English',
      headerTitle: 'لوحة تحكم المتجر الإلكتروني',
      headerSubtitle: 'Red Shark Admin Portal',
      viewStore: 'معاينة المتجر',
      pinTitle: 'لوحة تحكم المتجر الإلكتروني',
      pinDesc: 'هذه الصفحة مخصصة لمدير المتجر فقط. يرجى إدخال رمز PIN للمتابعة.',
      pinDefaultHint: 'الرمز الافتراضي: 1234',
      pinBtn: '🔓 دخول لوحة التحكم',
      pinIncorrect: '❌ رمز PIN غير صحيح!',
      tabSettings: 'إعدادات المتجر',
      tabBanner: 'عروض البانر',
      tabCategories: 'الأقسام والتصنيفات',
      tabCatalog: 'أصناف المتجر والمخزون',
      tabOrders: 'الطلبات الواردة',
      h2Settings: '⚙️ الإعدادات العامة للمتجر',
      btnSaveSettings: 'حفظ الإعدادات',
      lblShopName: 'اسم المتجر',
      lblShopSlug: 'رابط المتجر (Slug)',
      lblWhatsapp: 'رقم الواتساب للطلبات',
      lblPin: 'رمز PIN للأمان وحماية لوحة التحكم',
      lblDelivery: 'أجور التوصيل ($)',
      lblMinOrder: 'الحد الأدنى للطلب ($)',
      lblLbpRate: 'سعر صرف الليرة مقابل الدولار (LBP)',
      lblAddress: 'عنوان وموقع المتجر',
      phAddress: 'بيروت - وسط المدينة',
      lblLogo: 'شعار المتجر',
      phLogo: 'https://... أو اضغط رفع صورة',
      btnUploadFile: 'رفع صورة',
      lblDesc: 'وصف المتجر الترويجي',
      phDesc: 'أفضل تشكيلة من المنتجات الغذائية والمواد التموينية...',
      lblPosTitle: '⚡ الربط بمخزون الكاشير المباشر (POS Live Stock)',
      lblLinkPos: 'ربط كميات المتجر الإلكتروني بمخزون نقطة البيع (الكاشير) لحظياً',
      lblLinkPosHint: 'عند إلغاء هذا الخيار، سيتم سؤالك عما إذا كنت ترغب في مسح أصناف الكاشير من المتجر لإنشاء قائمة أصناف خاصة وحصرية للمتجر مع إمكانية حذف الأصناف يدوياً.',
      lblAllowOut: 'السماح للزبون بالطلب حتى لو نفد المخزون (Backorder)',
      h2Banner: '🎯 عروض البانر والشرائح الترويجية',
      pBannerDesc: 'يمكنك إضافة أكثر من عرض وسيتنقل البانر تلقائياً بينها للزبائن مع الصور',
      btnAddSlide: 'إضافة شريحة عرض جديدة',
      btnSaveBanner: 'حفظ عروض البانر',
      lblBannerActiveTitle: 'تفعيل بانر العروض الخاصة والتخفيضات أونلاين',
      lblBannerActiveDesc: 'إذا تم إيقافه سيختفي شريط العروض من الصفحة الرئيسية للزبائن',
      bannerActiveBadge: 'نشط أونلاين 🟢',
      bannerInactiveBadge: 'مخفي حالياً ⚠️',
      slideNum: 'شريحة عرض',
      slideHeadline: 'عنوان العرض الرئيسي',
      slideSub: 'تفاصيل العرض الترويجي',
      slideBadge: 'شارة العرض',
      slideImg: 'صورة البانر',
      btnDeleteSlide: '🗑️ حذف هذا العرض',
      h2Categories: '📂 إدارة أقسام وتصنيفات المتجر',
      pCategoriesDesc: 'تعديل أسماء الأقسام، ورفع صور الغلاف الكبيرة التي تظهر للزبائن في الواجهة',
      btnAddCatText: 'إضافة قسم جديد مع صورة غلاف',
      btnReloadCats: '🔄 تحديث الأقسام',
      thCover: 'صورة الغلاف',
      thCatAr: 'الاسم بالعربي',
      thCatEn: 'الاسم بالإنجليزي',
      thItemsCount: 'عدد الأصناف',
      thActions: 'الإجراءات',
      modalCatTitleAdd: '➕ إضافة قسم جديد مع صورة غلاف',
      modalCatTitleEdit: '✏️ تعديل بيانات وصورة غلاف القسم',
      lblCatModalNameAr: 'اسم القسم بالعربي *',
      phCatModalNameAr: 'مثال: الخضار والفواكه الطازجة',
      lblCatModalNameEn: 'اسم القسم بالإنجليزي *',
      phCatModalNameEn: 'مثال: Fresh Fruits & Vegetables',
      lblCatModalImg: 'صورة غلاف القسم (تظهر في الواجهة الرئيسية)',
      phCatModalImg: 'https://... أو اضغط رفع صورة الغلاف',
      btnUploadCatImg: 'رفع صورة الغلاف',
      btnSaveCat: 'حفظ بيانات وقسم المتجر',
      h2Catalog: '📦 أصناف المتجر والمخزون',
      pCatalogDesc: 'إدارة كاملة للأصناف مع إمكانية تعديلها ورفع صورها وحذف الأصناف غير المرغوبة',
      btnAddItemModal: 'إضافة صنف جديد مع صورة',
      btnClearAll: 'مسح جميع الأصناف',
      btnReloadCatalog: '🔄 تحديث القائمة',
      thImage: 'الصورة',
      thItem: 'الصنف',
      thPrice: 'السعر ($)',
      thStock: 'المخزون',
      thStatus: 'الحالة',
      statusPublished: 'منشور أونلاين',
      statusHidden: 'مخفي',
      btnEdit: '✏️ تعديل',
      btnDelete: '🗑️ حذف',
      modalAddTitle: '➕ إضافة صنف جديد للمتجر الإلكتروني',
      modalEditTitle: '✏️ تعديل بيانات وصورة الصنف',
      lblItemNameAr: 'اسم الصنف بالعربي *',
      phItemNameAr: 'مثال: زيت زيتون بكر ممتاز 1 لتر',
      lblItemNameEn: 'اسم الصنف بالإنجليزي',
      phItemNameEn: 'e.g. Extra Virgin Olive Oil 1L',
      lblItemCat: 'القسم',
      lblItemPrice: 'سعر البيع ($) *',
      lblItemStock: 'كمية المخزون المتوفرة',
      lblItemBarcode: 'الباركود',
      lblItemImage: 'صورة المنتج',
      phItemImage: 'https://... أو اضغط زر رفع صورة',
      btnClearEditImg: 'مسح الصورة',
      lblItemDesc: 'وصف الصنف ومميزاته',
      phItemDesc: 'تفاصيل المنتج، المنشأ، الحجم...',
      lblItemPublished: 'نشر هذا الصنف أونلاين في المتجر للزبائن',
      btnSaveNewItem: 'حفظ ونشر الصنف فوراً',
      btnSaveEditItem: 'حفظ التعديلات وتحديث الصنف',
      confirmDeleteItem: 'هل أنت متأكد من حذف هذا الصنف من المتجر الإلكتروني؟',
      confirmDeleteCat: 'هل أنت متأكد من حذف هذا القسم؟',
      confirmClearAll: 'تحذير: هل أنت متأكد من مسح جميع الأصناف من المتجر الإلكتروني؟ هذا الإجراء لا يمكن التراجع عنه.',
      h2Orders: '📋 الطلبات الواردة من المتجر أونلاين',
      btnReloadOrders: '🔄 تحديث الطلبات',
      saveSuccess: '✅ تم حفظ التعديلات بنجاح!',
      saveError: '⚠️ فشل الحفظ: ',
      itemUpdatedSuccess: '✅ تم تحديث بيانات وصورة الصنف بنجاح!',
      catUpdatedSuccess: '✅ تم حفظ بيانات وقسم المتجر بنجاح!'
    },
    en: {
      pageTitle: 'Storefront Admin Portal | Red Shark',
      langSwitch: 'عربي',
      headerTitle: 'Storefront Admin Portal',
      headerSubtitle: 'Red Shark Admin Portal',
      viewStore: 'View Storefront',
      pinTitle: 'Storefront Admin Portal',
      pinDesc: 'This page is restricted to store administrators. Please enter your PIN to continue.',
      pinDefaultHint: 'Default PIN: 1234',
      pinBtn: '🔓 Unlock Admin Portal',
      pinIncorrect: '❌ Incorrect Security PIN!',
      tabSettings: 'Store Settings',
      tabBanner: 'Offer Banners',
      tabCategories: 'Categories Manager',
      tabCatalog: 'Catalog & Inventory',
      tabOrders: 'Incoming Orders',
      h2Settings: '⚙️ General Store Settings',
      btnSaveSettings: 'Save Settings',
      lblShopName: 'Shop Name',
      lblShopSlug: 'Store Slug Identifier',
      lblWhatsapp: 'WhatsApp Number for Orders',
      lblPin: 'Security PIN Code',
      lblDelivery: 'Delivery Fee ($)',
      lblMinOrder: 'Minimum Order ($)',
      lblLbpRate: 'LBP Exchange Rate to USD',
      lblAddress: 'Store Address & Location',
      phAddress: 'Beirut - Downtown, Hamra...',
      lblLogo: 'Store Logo URL',
      phLogo: 'https://... or click upload',
      btnUploadFile: 'Upload Image',
      lblDesc: 'Promotional Store Description',
      phDesc: 'Finest selection of groceries and household items...',
      lblPosTitle: '⚡ Live POS Stock Synchronization',
      lblLinkPos: 'Link online store quantities directly to POS inventory in real time',
      lblLinkPosHint: 'When disabled, you will be prompted if you want to clear imported POS items to create a dedicated online catalog with manual product deletion.',
      lblAllowOut: 'Allow customer orders even when out of stock (Backorder)',
      h2Banner: '🎯 Offer Banners & Promotional Slides',
      pBannerDesc: 'Add multiple offers and the banner will automatically cycle between them for customers',
      btnAddSlide: 'Add New Offer Slide',
      btnSaveBanner: 'Save Offer Banners',
      lblBannerActiveTitle: 'Enable Offer Banner Carousel Online',
      lblBannerActiveDesc: 'When disabled, the top offer banner will be hidden from the storefront',
      bannerActiveBadge: 'Active Online 🟢',
      bannerInactiveBadge: 'Hidden ⚠️',
      slideNum: 'Offer Slide',
      slideHeadline: 'Headline',
      slideSub: 'Promotional Details (Subtitle)',
      slideBadge: 'Offer Badge',
      slideImg: 'Slide Poster Image',
      btnDeleteSlide: '🗑️ Delete Slide',
      h2Categories: '📂 Categories & Departments Manager',
      pCategoriesDesc: 'Edit category names and upload big cover images displayed on the homepage',
      btnAddCatText: 'Add New Category with Cover Image',
      btnReloadCats: '🔄 Refresh Categories',
      thCover: 'Cover Image',
      thCatAr: 'Arabic Name',
      thCatEn: 'English Name',
      thItemsCount: 'Items Count',
      thActions: 'Actions',
      modalCatTitleAdd: '➕ Add New Category with Cover Image',
      modalCatTitleEdit: '✏️ Edit Category & Cover Photo',
      lblCatModalNameAr: 'Category Name (Arabic) *',
      phCatModalNameAr: 'e.g. Fruits & Vegetables',
      lblCatModalNameEn: 'Category Name (English) *',
      phCatModalNameEn: 'e.g. Fruits & Vegetables',
      lblCatModalImg: 'Category Cover Image (Displayed on Homepage)',
      phCatModalImg: 'https://... or click upload cover image',
      btnUploadCatImg: 'Upload Cover Image',
      btnSaveCat: 'Save Category',
      h2Catalog: '📦 Store Products & Inventory',
      pCatalogDesc: 'Full catalog control: Edit items, upload product photos, and manage inventory',
      btnAddItemModal: 'Add New Product with Image',
      btnClearAll: 'Clear All Products',
      btnReloadCatalog: '🔄 Refresh Catalog',
      thImage: 'Image',
      thItem: 'Product',
      thPrice: 'Price ($)',
      thStock: 'Stock',
      thStatus: 'Status',
      statusPublished: 'Published Online',
      statusHidden: 'Hidden',
      btnEdit: '✏️ Edit',
      btnDelete: '🗑️ Delete',
      modalAddTitle: '➕ Add New Product to Online Store',
      modalEditTitle: '✏️ Edit Product Details & Photo',
      lblItemNameAr: 'Product Name (Arabic) *',
      phItemNameAr: 'e.g. Extra Virgin Olive Oil 1L',
      lblItemNameEn: 'Product Name (English)',
      phItemNameEn: 'e.g. Extra Virgin Olive Oil 1L',
      lblItemCat: 'Category',
      lblItemPrice: 'Selling Price ($) *',
      lblItemStock: 'Stock Quantity',
      lblItemBarcode: 'Barcode',
      lblItemImage: 'Product Image',
      phItemImage: 'https://... or click upload image',
      btnClearEditImg: 'Clear Photo',
      lblItemDesc: 'Description & Highlights',
      phItemDesc: 'Product details, origin, package size...',
      lblItemPublished: 'Publish this product online for customers',
      btnSaveNewItem: 'Save & Publish Product',
      btnSaveEditItem: 'Save Changes & Update Product',
      confirmDeleteItem: 'Are you sure you want to delete this product from the online store?',
      confirmDeleteCat: 'Are you sure you want to delete this category?',
      confirmClearAll: 'Warning: Are you sure you want to delete ALL products from the online store? This cannot be undone.',
      h2Orders: '📋 Online Orders Received',
      btnReloadOrders: '🔄 Refresh Orders',
      saveSuccess: '✅ Saved successfully!',
      saveError: '⚠️ Save failed: ',
      itemUpdatedSuccess: '✅ Product and image updated successfully!',
      catUpdatedSuccess: '✅ Category updated successfully!'
    }
  };

  function t(k) { return (I18N[_lang] && I18N[_lang][k]) || k; }

  function getShopSlug() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shop') || params.get('slug') || localStorage.getItem('rs_last_shop_slug') || 'shop101';
  }

    function getActiveSession() {
    try {
      const s = sessionStorage.getItem('rs_admin_session');
      return s ? JSON.parse(s) : null;
    } catch(e) {
      return null;
    }
  }

  function setActiveSession(session) {
    if (session) {
      sessionStorage.setItem('rs_admin_session', JSON.stringify(session));
    } else {
      sessionStorage.removeItem('rs_admin_session');
    }
  }

  function toggleLoginPwdVisibility() {
    const input = document.getElementById('admin-login-pwd');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

    async function verifyCredentials() {
    const slugInput = document.getElementById('admin-login-slug');
    const pwdInput = document.getElementById('admin-login-pwd') || document.getElementById('admin-pin-input');

    const slug = (slugInput?.value.trim().toLowerCase()) || getShopSlug() || 'shop101';
    const pwd = pwdInput?.value.trim() || '';

    if (!pwd) {
      alert(_lang === 'ar' ? 'يرجى إدخال كلمة المرور / رمز PIN!' : 'Please enter the password / PIN!');
      pwdInput?.focus();
      return;
    }

    const btn = document.getElementById('btn-login-submit');
    if (btn) btn.disabled = true;

    try {
      const tenant = await StorefrontAPI.fetchTenant(slug);
      if (!tenant) {
        alert(_lang === 'ar' ? `❌ معرف المتجر "${slug}" غير مسجل في النظام!` : `❌ Shop slug "${slug}" not found in system!`);
        if (btn) btn.disabled = false;
        return;
      }

      // Check tenant password inside banner_url JSON
      let expectedPwd = '1234';
      if (tenant.banner_url) {
        try {
          const bObj = typeof tenant.banner_url === 'string' ? JSON.parse(tenant.banner_url) : tenant.banner_url;
          if (bObj.admin_password) expectedPwd = String(bObj.admin_password);
        } catch(e){}
      }

      // Allow either the tenant password OR standard default 1234
      if (pwd === expectedPwd || pwd === '1234') {
        setActiveSession({
          slug: tenant.slug,
          id: tenant.id,
          name: tenant.shop_name
        });

        // Update URL query parameter without reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('shop', tenant.slug);
        window.history.replaceState({}, '', newUrl.toString());

        const modal = document.getElementById('admin-pin-modal');
        if (modal) modal.style.display = 'none';
        updateHeaderShopBadge(tenant.slug);
        await loadData();
      } else {
        alert(_lang === 'ar' ? `❌ كلمة المرور غير صحيحة للمتجر (${slug})!` : `❌ Incorrect password for shop (${slug})!`);
        if (pwdInput) {
          pwdInput.value = '';
          pwdInput.focus();
        }
      }
    } catch(e) {
      alert((_lang === 'ar' ? '⚠️ خطأ في الاتصال: ' : '⚠️ Connection error: ') + e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function logout() {
    setActiveSession(null);
    window.location.reload();
  }

  function updateHeaderShopBadge(slug) {
    const el = document.getElementById('admin-active-shop-text');
    if (el) el.textContent = slug || 'shop';
  }

  async function init() {
    applyLang(_lang);

    const urlSlug = getShopSlug();
    const session = getActiveSession();

    // Fill login slug input
    const slugInput = document.getElementById('admin-login-slug');
    if (slugInput) {
      slugInput.value = (session && session.slug) || urlSlug || 'shop101';
    }

    // Verify session matches current URL slug
    if (session && session.slug && (!urlSlug || session.slug === urlSlug)) {
      document.getElementById('admin-pin-modal').style.display = 'none';
      updateHeaderShopBadge(session.slug);
      await loadData();
    } else {
      document.getElementById('admin-pin-modal').style.display = 'flex';
      const pwdInput = document.getElementById('admin-login-pwd');
      if (pwdInput) pwdInput.focus();
    }
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
    _lang = lang;
    localStorage.setItem('rs_admin_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.title = t('pageTitle');

    // Header elements
    setText('admin-header-title', t('headerTitle'));
    setText('admin-lang-text', t('langSwitch'));
    setText('admin-view-store-text', t('viewStore'));

    // PIN modal
    setText('pin-modal-title', t('pinTitle'));
    setText('pin-modal-desc', t('pinDesc'));
    setText('pin-default-hint', t('pinDefaultHint'));
    setText('pin-modal-btn', t('pinBtn'));

    // Tabs
    setText('tab-title-settings', t('tabSettings'));
    setText('tab-title-banner', t('tabBanner'));
    setText('tab-title-categories', t('tabCategories'));
    setText('tab-title-catalog', t('tabCatalog'));
    setText('tab-title-orders', t('tabOrders'));

    // Tab 1: Settings
    setText('h2-settings', t('h2Settings'));
    setText('btn-save-text', t('btnSaveSettings'));
    setText('lbl-shop-name', t('lblShopName'));
    setText('lbl-shop-slug', t('lblShopSlug'));
    setText('lbl-whatsapp', t('lblWhatsapp'));
    setText('lbl-pin', t('lblPin'));
    setText('lbl-delivery', t('lblDelivery'));
    setText('lbl-min-order', t('lblMinOrder'));
    setText('lbl-lbp-rate', t('lblLbpRate'));
    setText('lbl-address', t('lblAddress'));
    setPlaceholder('admin-address', t('phAddress'));
    setText('lbl-logo', t('lblLogo'));
    setPlaceholder('admin-shop-logo', t('phLogo'));
    setText('btn-upload-logo-text', t('btnUploadFile'));
    setText('lbl-desc-ar', t('lblDesc'));
    setPlaceholder('admin-desc-ar', t('phDesc'));
    setText('lbl-pos-title', t('lblPosTitle'));
    setText('lbl-link-pos-text', t('lblLinkPos'));
    setText('lbl-link-pos-hint', t('lblLinkPosHint'));
    setText('lbl-allow-out-text', t('lblAllowOut'));

    // Tab 2: Banner
    setText('h2-banner', t('h2Banner'));
    setText('p-banner-desc', t('pBannerDesc'));
    setText('btn-add-slide-text', t('btnAddSlide'));
    setText('btn-save-banner-text', t('btnSaveBanner'));
    setText('lbl-banner-active-title', t('lblBannerActiveTitle'));
    setText('lbl-banner-active-desc', t('lblBannerActiveDesc'));

    // Tab 3: Categories
    setText('h2-categories', t('h2Categories'));
    setText('p-categories-desc', t('pCategoriesDesc'));
    setText('btn-add-cat-text', t('btnAddCatText'));
    setText('btn-reload-cats', t('btnReloadCats'));
    setText('modal-category-title', t('modalCatTitleEdit'));
    setText('lbl-cat-modal-name-ar', t('lblCatModalNameAr'));
    setPlaceholder('category-modal-name-ar', t('phCatModalNameAr'));
    setText('lbl-cat-modal-name-en', t('lblCatModalNameEn'));
    setPlaceholder('category-modal-name-en', t('phCatModalNameEn'));
    setText('lbl-cat-modal-img', t('lblCatModalImg'));
    setPlaceholder('category-modal-img', t('phCatModalImg'));
    setText('btn-upload-cat-img-text', t('btnUploadCatImg'));
    setText('btn-save-cat-text', t('btnSaveCat'));

    // Tab 4: Catalog
    setText('h2-catalog', t('h2Catalog'));
    setText('p-catalog-desc', t('pCatalogDesc'));
    setText('btn-add-item-modal-text', t('btnAddItemModal'));
    setText('btn-clear-all-text', t('btnClearAll'));
    setText('btn-reload-catalog', t('btnReloadCatalog'));

    // Add Item Modal
    setText('modal-add-item-title', t('modalAddTitle'));
    setText('lbl-item-name-ar', t('lblItemNameAr'));
    setPlaceholder('new-item-name-ar', t('phItemNameAr'));
    setText('lbl-item-name-en', t('lblItemNameEn'));
    setPlaceholder('new-item-name-en', t('phItemNameEn'));
    setText('lbl-item-cat', t('lblItemCat'));
    setText('lbl-item-price', t('lblItemPrice'));
    setText('lbl-item-stock', t('lblItemStock'));
    setText('lbl-item-barcode', t('lblItemBarcode'));
    setText('lbl-item-image', t('lblItemImage'));
    setPlaceholder('new-item-img', t('phItemImage'));
    setText('btn-upload-item-img-text', t('btnUploadFile'));
    setText('lbl-item-desc', t('lblItemDesc'));
    setPlaceholder('new-item-desc', t('phItemDesc'));
    setText('btn-save-new-item-text', t('btnSaveNewItem'));

    // Edit Item Modal
    setText('modal-edit-item-title', t('modalEditTitle'));
    setText('lbl-edit-name-ar', t('lblItemNameAr'));
    setText('lbl-edit-name-en', t('lblItemNameEn'));
    setText('lbl-edit-cat', t('lblItemCat'));
    setText('lbl-edit-price', t('lblItemPrice'));
    setText('lbl-edit-stock', t('lblItemStock'));
    setText('lbl-edit-barcode', t('lblItemBarcode'));
    setText('lbl-edit-image', t('lblItemImage'));
    setPlaceholder('edit-item-img', t('phItemImage'));
    setText('btn-upload-edit-img-text', t('btnUploadFile'));
    setText('btn-clear-edit-img-text', t('btnClearEditImg'));
    setText('lbl-edit-desc', t('lblItemDesc'));
    setText('lbl-edit-published', t('lblItemPublished'));
    setText('btn-save-edit-item-text', t('btnSaveEditItem'));

    // Tab 5: Orders
    setText('h2-orders', t('h2Orders'));
    setText('btn-reload-orders', t('btnReloadOrders'));

    // Update banner badge
    const bannerActiveCheck = document.getElementById('admin-banner-active');
    if (bannerActiveCheck) updateBannerStatusBadge(bannerActiveCheck.checked);

    // Re-render dynamic lists with updated language
    renderSlidesList();
    renderCategoriesTable();
    renderCatalog();
  }

  function toggleLang() {
    applyLang(_lang === 'ar' ? 'en' : 'ar');
  }

  // ── IMAGE FILE UPLOADER (CLIENT-SIDE CANVAS COMPRESSION TO COMPACT BASE64) ──
  function handleFileUpload(fileInput, targetInputId, previewImgId) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        const targetInput = document.getElementById(targetInputId);
        if (targetInput) targetInput.value = dataUrl;

        const previewImg = document.getElementById(previewImgId);
        if (previewImg) {
          previewImg.src = dataUrl;
          previewImg.style.display = 'block';
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function loadData() {
    const slug = getShopSlug();
    _tenant = await StorefrontAPI.fetchTenant(slug);
    if (!_tenant) {
      showAlert('⚠️ Shop not found: ' + slug, 'error');
      return;
    }

    populateSettingsForm();
    await loadCategories();
    loadCatalog();
    loadOrders();
  }

  function populateSettingsForm() {
    document.getElementById('admin-shop-name').value = _tenant.shop_name || '';
    document.getElementById('admin-shop-slug').value = _tenant.slug || '';
    document.getElementById('admin-link-pos-stock').checked = _tenant.link_pos_stock !== false;
    document.getElementById('admin-allow-out-of-stock').checked = _tenant.allow_out_of_stock === true;
    document.getElementById('admin-whatsapp').value = _tenant.whatsapp_phone || '';
    document.getElementById('admin-security-pin').value = localStorage.getItem('rs_admin_pin') || '1234';
    document.getElementById('admin-delivery-fee').value = _tenant.delivery_fee || 0;
    document.getElementById('admin-min-order').value = _tenant.min_order || 0;
    document.getElementById('admin-lbp-rate').value = _tenant.currency_lbp_rate || 89500;
    document.getElementById('admin-address').value = _tenant.address || '';
    document.getElementById('admin-shop-logo').value = _tenant.logo_url || '';
    if (_tenant.logo_url) {
      const p = document.getElementById('preview-shop-logo');
      if (p) { p.src = _tenant.logo_url; p.style.display = 'block'; }
    }
    document.getElementById('admin-desc-ar').value = _tenant.description_ar || '';

    // Parse Banner URL & Category Images Map
    _slides = [];
    _categoryImages = {};
    if (_tenant.banner_url) {
      const trimmed = _tenant.banner_url.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed.slides)) _slides = parsed.slides;
          else if (parsed.title || parsed.image_url) _slides = [parsed];
          if (parsed.category_images && typeof parsed.category_images === 'object') {
            _categoryImages = parsed.category_images;
          }
          if (typeof parsed.active !== 'undefined') {
            document.getElementById('admin-carousel-active').checked = parsed.active;
            updateBannerStatusBadge(parsed.active);
          }
        } catch(e) {}
      } else if (trimmed.startsWith('http')) {
        _slides = [{ active: true, image_url: trimmed }];
      }
    }

    renderSlidesList();
  }

  function updateBannerStatusBadge(isChecked) {
    const badge = document.getElementById('banner-active-badge');
    if (!badge) return;
    if (isChecked) {
      badge.style.background = '#d1fae5';
      badge.style.color = '#065f46';
      badge.textContent = _lang === 'ar' ? 'نشط أونلاين 🟢' : 'Active Online 🟢';
    } else {
      badge.style.background = '#fee2e2';
      badge.style.color = '#991b1b';
      badge.textContent = _lang === 'ar' ? 'معطل ومخفي ⚪' : 'Disabled & Hidden ⚪';
    }
  }

  function renderSlidesList() {
    const container = document.getElementById('admin-slides-list');
    if (!container) return;

    container.innerHTML = _slides.map((s, i) => `
      <div class="slide-editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:900;font-size:0.95rem;color:var(--brand-primary)">${t('slideNum')} #${i + 1}</div>
          <button class="btn-clear-cart" onclick="Admin.removeSlide(${i})" style="padding:2px 8px">${t('btnDeleteSlide')}</button>
        </div>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label class="field-label">${t('slideHeadline')}</label>
            <input type="text" class="field-input" value="${s.title || ''}" onchange="Admin.updateSlideField(${i}, 'title', this.value)">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="field-label">${t('slideSub')}</label>
            <input type="text" class="field-input" value="${s.subtitle || ''}" onchange="Admin.updateSlideField(${i}, 'subtitle', this.value)">
          </div>
          <div class="form-group">
            <label class="field-label">${t('slideBadge')}</label>
            <input type="text" class="field-input" value="${s.badge || '🔥 عرض محدود'}" onchange="Admin.updateSlideField(${i}, 'badge', this.value)">
          </div>
          <div class="form-group">
            <label class="field-label">${t('slideImg')}</label>
            <div class="upload-field-row">
              <input type="text" class="field-input" id="slide-img-${i}" value="${s.image_url || ''}" onchange="Admin.updateSlideField(${i}, 'image_url', this.value)">
              <input type="file" id="file-slide-${i}" accept="image/*" style="display:none" onchange="Admin.handleSlideUpload(this, ${i})">
              <button type="button" class="btn-upload-file" onclick="document.getElementById('file-slide-${i}').click()">
                <span>📁</span>
                <span>${t('btnUploadFile')}</span>
              </button>
            </div>
            ${s.image_url ? `<img src="${s.image_url}" class="img-preview-thumb" style="display:block;margin-top:6px;width:120px;height:65px;border-radius:8px">` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  function handleSlideUpload(fileInput, slideIdx) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        updateSlideField(slideIdx, 'image_url', dataUrl);
        renderSlidesList();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function addNewSlide() {
    _slides.push({ active: true, title: '🔥 New Special Offer', subtitle: 'Offer description shown here', badge: '🔥 Special Offer', image_url: '' });
    renderSlidesList();
  }

  function removeSlide(idx) {
    if (confirm('Delete this slide?')) {
      _slides.splice(idx, 1);
      renderSlidesList();
    }
  }

  function updateSlideField(idx, field, value) {
    if (_slides[idx]) _slides[idx][field] = value.trim();
  }

  // ── 4. CATEGORIES MANAGER (EDIT, ADD, UPLOAD BIG COVER IMAGES) ──
  async function loadCategories() {
    if (!_tenant) return;
    try {
      _categories = await StorefrontAPI.fetchCategories(_tenant.id);
      renderCategoriesTable();
    } catch(e) {
      console.error('Failed to load categories:', e);
    }
  }

  function renderCategoriesTable() {
    const container = document.getElementById('admin-categories-table');
    if (!container) return;

    if (_categories.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No categories registered</div>';
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:0.88rem">
          <thead>
            <tr style="border-bottom:2px solid var(--border-color);text-align:start">
              <th style="padding:10px">${t('thCover')}</th>
              <th style="padding:10px">${t('thCatAr')}</th>
              <th style="padding:10px">${t('thCatEn')}</th>
              <th style="padding:10px">${t('thItemsCount')}</th>
              <th style="padding:10px;text-align:center">${t('thActions')}</th>
            </tr>
          </thead>
          <tbody>
            ${_categories.map(c => {
              const img = _categoryImages[c.id] || c.image_url;
              const count = _products.filter(p => p.category_id === c.id).length;
              return `
                <tr style="border-bottom:1px solid var(--border-color)">
                  <td style="padding:10px;width:70px">
                    ${img ? `<img src="${img}" class="cat-cover-thumb" alt="${c.name}">` : '<div class="cat-cover-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem">📂</div>'}
                  </td>
                  <td style="padding:10px;font-weight:800;color:var(--text-main)">${c.name_ar || c.name || '—'}</td>
                  <td style="padding:10px;font-weight:700;color:var(--text-muted)">${c.name_en || c.name || '—'}</td>
                  <td style="padding:10px;font-weight:800;color:var(--brand-primary)">${count} ${_lang === 'ar' ? 'أصناف' : 'items'}</td>
                  <td style="padding:10px;text-align:center">
                    <div class="table-btn-group">
                      <button class="btn-edit-item" onclick="Admin.openEditCategoryModal('${c.id}')">
                        <span>✏️</span>
                        <span>${t('btnEdit')}</span>
                      </button>
                      <button class="btn-clear-cart" onclick="Admin.deleteCategory('${c.id}')" style="background:#fee2e2;color:#dc2626;padding:4px 8px;border-radius:6px;font-weight:800">
                        <span>🗑️</span>
                        <span>${t('btnDelete')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openAddCategoryModal() {
    document.getElementById('category-modal-id').value = '';
    document.getElementById('category-modal-name-ar').value = '';
    document.getElementById('category-modal-name-en').value = '';
    document.getElementById('category-modal-img').value = '';
    document.getElementById('preview-category-img').style.display = 'none';
    setText('modal-category-title', t('modalCatTitleAdd'));
    document.getElementById('modal-category').classList.add('open');
  }

  function openEditCategoryModal(catId) {
    const cat = _categories.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('category-modal-id').value = cat.id;
    document.getElementById('category-modal-name-ar').value = cat.name_ar || cat.name || '';
    document.getElementById('category-modal-name-en').value = cat.name_en || cat.name || '';
    
    const img = _categoryImages[cat.id] || cat.image_url || '';
    document.getElementById('category-modal-img').value = img;
    const prev = document.getElementById('preview-category-img');
    if (img && prev) { prev.src = img; prev.style.display = 'block'; }
    else if (prev) { prev.style.display = 'none'; }

    setText('modal-category-title', t('modalCatTitleEdit'));
    document.getElementById('modal-category').classList.add('open');
  }

  function closeCategoryModal() {
    document.getElementById('modal-category').classList.remove('open');
  }

  async function submitCategoryForm() {
    const catId = document.getElementById('category-modal-id').value;
    const nameAr = document.getElementById('category-modal-name-ar').value.trim();
    const nameEn = document.getElementById('category-modal-name-en').value.trim() || nameAr;
    const imgUrl = document.getElementById('category-modal-img').value.trim();

    if (!nameAr && !nameEn) {
      alert(_lang === 'ar' ? 'يرجى إدخال اسم القسم' : 'Please enter category name');
      return;
    }

    const btn = document.getElementById('btn-save-category');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>...</span>'; }

    try {
      if (catId) {
        const url = `${StorefrontAPI.getUrl()}/rest/v1/categories?id=eq.${catId}`;
        await fetch(url, {
          method: 'PATCH',
          headers: {
            "apikey": StorefrontAPI.getKey(),
            "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: nameAr || nameEn, name_ar: nameAr, name_en: nameEn })
        });

        if (imgUrl) _categoryImages[catId] = imgUrl;
        else delete _categoryImages[catId];
      } else {
        const slug = (nameEn || nameAr).toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random()*1000);
        const url = `${StorefrontAPI.getUrl()}/rest/v1/categories`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            "apikey": StorefrontAPI.getKey(),
            "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            shop_id: _tenant.id,
            name: nameAr || nameEn,
            name_ar: nameAr,
            name_en: nameEn,
            slug: slug,
            is_active: true
          })
        });
        const created = await res.json();
        if (created && created[0] && imgUrl) {
          _categoryImages[created[0].id] = imgUrl;
        }
      }

      await persistCategoryImagesMap();

      closeCategoryModal();
      showAlert(t('saveSuccess'), 'success');
      await loadCategories();
    } catch(e) {
      alert('Error: ' + e.message);
    }

    if (btn) { btn.disabled = false; btn.innerHTML = `<span>💾</span><span>${t('btnSaveCat')}</span>`; }
  }

  async function persistCategoryImagesMap() {
    if (!_tenant) return;
    const bannerPayload = {
      active: document.getElementById('admin-carousel-active')?.checked ?? true,
      slides: _slides,
      category_images: _categoryImages
    };

    const url = `${StorefrontAPI.getUrl()}/rest/v1/tenants?id=eq.${_tenant.id}`;
    await fetch(url, {
      method: 'PATCH',
      headers: {
        "apikey": StorefrontAPI.getKey(),
        "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ banner_url: JSON.stringify(bannerPayload) })
    });
  }

  async function deleteCategory(catId) {
    if (!confirm(t('confirmDeleteCat'))) return;
    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/categories?id=eq.${catId}`;
      await fetch(url, {
        method: 'DELETE',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`
        }
      });
      delete _categoryImages[catId];
      await persistCategoryImagesMap();
      showAlert('✅ Category deleted successfully!', 'success');
      loadCategories();
    } catch(e) {
      alert('Error: ' + e.message);
    }
  }

  // ── 5. PRODUCTS & CATALOG: EDIT PRODUCTS & UPLOAD IMAGES ──
  async function loadCatalog() {
    if (!_tenant) return;
    const container = document.getElementById('admin-catalog-table');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:20px">Loading products...</div>';

    try {
      _products = await StorefrontAPI.fetchProducts(_tenant.id);
      renderCatalog();
    } catch(e) {
      container.innerHTML = '<div style="color:red">Failed to load catalog: ' + e.message + '</div>';
    }
  }

  function renderCatalog() {
    const container = document.getElementById('admin-catalog-table');
    if (!container) return;

    if (_products.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">${_lang === 'ar' ? 'لا توجد أصناف حالياً. يمكنك إضافة صنف جديد من الزر بالأعلى.' : 'No products available. You can add new products above.'}</div>`;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
          <thead>
            <tr style="border-bottom:2px solid var(--border-color);text-align:start">
              <th style="padding:10px">${t('thImage')}</th>
              <th style="padding:10px">${t('thItem')}</th>
              <th style="padding:10px">${t('thPrice')}</th>
              <th style="padding:10px">${t('thStock')}</th>
              <th style="padding:10px">${t('thStatus')}</th>
              <th style="padding:10px;text-align:center">${t('thActions')}</th>
            </tr>
          </thead>
          <tbody>
            ${_products.map(p => {
              const displayName = _lang === 'en' ? (p.name_en || p.name || p.name_ar) : (p.name_ar || p.name);
              const subName = _lang === 'en' ? (p.name_ar !== displayName ? p.name_ar : '') : (p.name_en !== displayName ? p.name_en : '');

              return `
                <tr style="border-bottom:1px solid var(--border-color)">
                  <td style="padding:10px;width:58px">
                    <div class="table-img-clickable" onclick="Admin.openEditItemModal('${p.id}')" title="Click to edit product & image">
                      ${p.image_url ? `<img src="${p.image_url}" alt="${displayName}" style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color)">` : '<div style="width:46px;height:46px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:1.4rem">📦</div>'}
                    </div>
                  </td>
                  <td style="padding:10px;font-weight:700">
                    <div style="cursor:pointer" onclick="Admin.openEditItemModal('${p.id}')">${displayName}</div>
                    ${subName ? `<div style="font-size:0.75rem;color:var(--text-subtle)">${subName}</div>` : ''}
                  </td>
                  <td style="padding:10px;font-weight:800">$${(parseFloat(p.price) || 0).toFixed(2)}</td>
                  <td style="padding:10px;font-weight:800;color:${p.stock_quantity > 0 ? '#059669' : '#dc2626'}">
                    ${p.stock_quantity || 0}
                  </td>
                  <td style="padding:10px">
                    <span style="background:${p.is_published ? '#d1fae5' : '#f1f5f9'};color:${p.is_published ? '#059669' : '#64748b'};padding:3px 8px;border-radius:12px;font-weight:800">
                      ${p.is_published ? t('statusPublished') : t('statusHidden')}
                    </span>
                  </td>
                  <td style="padding:10px;text-align:center">
                    <div class="table-btn-group">
                      <button class="btn-edit-item" onclick="Admin.openEditItemModal('${p.id}')">
                        <span>✏️</span>
                        <span>${t('btnEdit')}</span>
                      </button>
                      <button class="btn-clear-cart" onclick="Admin.deleteProduct('${p.id}')" style="background:#fee2e2;color:#dc2626;padding:4px 8px;border-radius:6px;font-weight:800">
                        <span>🗑️</span>
                        <span>${t('btnDelete')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openEditItemModal(productId) {
    const p = _products.find(it => it.id === productId);
    if (!p) return;

    document.getElementById('edit-item-id').value = p.id;
    document.getElementById('edit-item-name-ar').value = p.name_ar || p.name || '';
    document.getElementById('edit-item-name-en').value = p.name_en || '';
    document.getElementById('edit-item-price').value = p.price || 0;
    document.getElementById('edit-item-stock').value = p.stock_quantity || 0;
    document.getElementById('edit-item-barcode').value = p.barcode || '';
    document.getElementById('edit-item-desc').value = p.description || p.description_ar || '';
    document.getElementById('edit-item-published').checked = p.is_published !== false;

    const catSelect = document.getElementById('edit-item-cat');
    if (catSelect) {
      catSelect.innerHTML = _categories.map(c => {
        const cName = _lang === 'en' ? (c.name_en || c.name || c.name_ar) : (c.name_ar || c.name);
        return `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${cName}</option>`;
      }).join('');
    }

    document.getElementById('edit-item-img').value = p.image_url || '';
    const prev = document.getElementById('preview-edit-item-img');
    if (p.image_url && prev) {
      prev.src = p.image_url;
      prev.style.display = 'block';
    } else if (prev) {
      prev.style.display = 'none';
    }

    document.getElementById('modal-edit-item').classList.add('open');
  }

  function closeEditItemModal() {
    document.getElementById('modal-edit-item').classList.remove('open');
  }

  async function submitEditItem() {
    const id = document.getElementById('edit-item-id').value;
    const nameAr = document.getElementById('edit-item-name-ar').value.trim();
    const nameEn = document.getElementById('edit-item-name-en').value.trim() || nameAr;
    const catId = document.getElementById('edit-item-cat').value || null;
    const price = parseFloat(document.getElementById('edit-item-price').value) || 0;
    const stock = parseInt(document.getElementById('edit-item-stock').value) || 0;
    const barcode = document.getElementById('edit-item-barcode').value.trim() || null;
    const imgUrl = document.getElementById('edit-item-img').value.trim() || null;
    const desc = document.getElementById('edit-item-desc').value.trim() || '';
    const isPub = document.getElementById('edit-item-published').checked;

    if (!nameAr && !nameEn) {
      alert(_lang === 'ar' ? 'يرجى إدخال اسم الصنف' : 'Please enter product name');
      return;
    }

    const btn = document.getElementById('btn-save-edit-item');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>...</span>'; }

    const payload = {
      name: nameAr || nameEn,
      name_ar: nameAr,
      name_en: nameEn,
      category_id: catId,
      price: price,
      stock_quantity: stock,
      barcode: barcode,
      image_url: imgUrl,
      description: desc,
      description_ar: desc,
      is_published: isPub,
      updated_at: new Date().toISOString()
    };

    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/products?id=eq.${id}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        closeEditItemModal();
        showAlert(t('itemUpdatedSuccess'), 'success');
        loadCatalog();
      } else {
        const err = await res.text();
        alert('Error: ' + err);
      }
    } catch(e) {
      alert('Error: ' + e.message);
    }

    if (btn) { btn.disabled = false; btn.innerHTML = `<span>💾</span><span>${t('btnSaveEditItem')}</span>`; }
  }

  function openAddItemModal() {
    const catSelect = document.getElementById('new-item-cat');
    if (catSelect) {
      catSelect.innerHTML = _categories.map(c => {
        const cName = _lang === 'en' ? (c.name_en || c.name || c.name_ar) : (c.name_ar || c.name);
        return `<option value="${c.id}">${cName}</option>`;
      }).join('');
    }
    document.getElementById('modal-add-item').classList.add('open');
  }

  function closeAddItemModal() {
    document.getElementById('modal-add-item').classList.remove('open');
  }

  async function submitNewItem() {
    const nameAr = document.getElementById('new-item-name-ar')?.value.trim();
    const nameEn = document.getElementById('new-item-name-en')?.value.trim() || nameAr;
    const catId = document.getElementById('new-item-cat')?.value || null;
    const price = parseFloat(document.getElementById('new-item-price')?.value) || 0;
    const stock = parseInt(document.getElementById('new-item-stock')?.value) || 20;
    const barcode = document.getElementById('new-item-barcode')?.value.trim() || null;
    const imgUrl = document.getElementById('new-item-img')?.value.trim() || null;
    const desc = document.getElementById('new-item-desc')?.value.trim() || '';

    if (!nameAr && !nameEn) {
      alert(_lang === 'ar' ? 'يرجى كتابة اسم الصنف' : 'Please enter product name');
      return;
    }

    const payload = {
      shop_id: _tenant.id,
      category_id: catId,
      name: nameAr || nameEn,
      name_ar: nameAr,
      name_en: nameEn,
      price: price,
      stock_quantity: stock,
      barcode: barcode,
      image_url: imgUrl,
      description: desc,
      is_published: true,
      track_inventory: true
    };

    const btn = document.getElementById('btn-save-new-item');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>...</span>'; }

    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/products`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        closeAddItemModal();
        showAlert(t('saveSuccess'), 'success');
        loadCatalog();
      } else {
        const err = await res.text();
        alert('Error: ' + err);
      }
    } catch(e) {
      alert('Error: ' + e.message);
    }

    if (btn) { btn.disabled = false; btn.innerHTML = `<span>💾</span><span>${t('btnSaveNewItem')}</span>`; }
  }

  async function deleteProduct(productId) {
    if (!confirm(t('confirmDeleteItem'))) return;
    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/products?id=eq.${productId}`;
      await fetch(url, {
        method: 'DELETE',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`
        }
      });
      showAlert('✅ Product deleted successfully!', 'success');
      loadCatalog();
    } catch(e) {
      alert('Error: ' + e.message);
    }
  }

  async function confirmClearAllProducts() {
    if (!confirm(t('confirmClearAll'))) return;
    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/products?shop_id=eq.${_tenant.id}`;
      await fetch(url, {
        method: 'DELETE',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`
        }
      });
      showAlert('✅ All products cleared!', 'success');
      loadCatalog();
    } catch(e) {
      alert('Error: ' + e.message);
    }
  }

  // ── SETTINGS & GENERAL SAVE ──
  async function saveSettings() {
    if (!_tenant) return;
    const btn = document.getElementById('btn-save-settings');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>...</span>'; }

    const newSlug = document.getElementById('admin-shop-slug').value.trim() || _tenant.slug;
    const pin = document.getElementById('admin-security-pin')?.value.trim() || '1234';
    localStorage.setItem('rs_admin_pin', pin);

    const isCarouselActive = document.getElementById('admin-carousel-active')?.checked ?? true;
    const bannerPayload = {
      active: isCarouselActive,
      slides: _slides,
      category_images: _categoryImages
    };

    const payload = {
      shop_name: document.getElementById('admin-shop-name').value.trim(),
      slug: newSlug,
      link_pos_stock: document.getElementById('admin-link-pos-stock').checked,
      allow_out_of_stock: document.getElementById('admin-allow-out-of-stock').checked,
      whatsapp_phone: document.getElementById('admin-whatsapp').value.trim(),
      delivery_fee: parseFloat(document.getElementById('admin-delivery-fee').value) || 0,
      min_order: parseFloat(document.getElementById('admin-min-order').value) || 0,
      currency_lbp_rate: parseFloat(document.getElementById('admin-lbp-rate').value) || 89500,
      address: document.getElementById('admin-address').value.trim(),
      logo_url: document.getElementById('admin-shop-logo').value.trim() || null,
      description_ar: document.getElementById('admin-desc-ar').value.trim(),
      banner_url: JSON.stringify(bannerPayload),
      updated_at: new Date().toISOString()
    };

    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/tenants?id=eq.${_tenant.id}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        _tenant = { ..._tenant, ...payload };
        localStorage.setItem('rs_last_shop_slug', newSlug);
        showAlert(t('saveSuccess'), 'success');
      } else {
        const err = await res.text();
        showAlert(t('saveError') + err, 'error');
      }
    } catch(e) {
      showAlert('⚠️ Error: ' + e.message, 'error');
    }

    if (btn) { btn.disabled = false; btn.innerHTML = `<span>💾</span><span>${t('btnSaveSettings')}</span>`; }
  }

  function showAlert(msg, type) {
    const el = document.getElementById('admin-alert');
    if (el) {
      el.className = 'save-alert ' + (type === 'success' ? 'success' : 'error');
      el.style.display = 'block';
      el.textContent = msg;
      if (type === 'success') {
        setTimeout(() => { el.style.display = 'none'; }, 5000);
      }
    }
  }

  // ── ORDERS ──
  async function loadOrders() {
    if (!_tenant) return;
    const container = document.getElementById('admin-orders-table');
    if (!container) return;

    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/orders?shop_id=eq.${_tenant.id}&order=created_at.desc&limit=50`;
      const res = await fetch(url, {
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`
        }
      });
      _orders = await res.json();
      renderOrders();
    } catch(e) {
      container.innerHTML = '<div style="color:red">Failed to load orders: ' + e.message + '</div>';
    }
  }

  function renderOrders() {
    const container = document.getElementById('admin-orders-table');
    if (!container) return;

    if (_orders.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No orders yet</div>';
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
          <thead>
            <tr style="border-bottom:2px solid var(--border-color);text-align:start">
              <th style="padding:10px"># Order</th>
              <th style="padding:10px">Customer</th>
              <th style="padding:10px">Total ($)</th>
              <th style="padding:10px">Status</th>
              <th style="padding:10px">Time</th>
              <th style="padding:10px">Action</th>
            </tr>
          </thead>
          <tbody>
            ${_orders.map(o => `
              <tr style="border-bottom:1px solid var(--border-color)">
                <td style="padding:10px;font-weight:900">${o.order_number}</td>
                <td style="padding:10px">
                  <div style="font-weight:700">${o.customer_name || 'Anonymous'}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${o.customer_phone || ''}</div>
                </td>
                <td style="padding:10px;font-weight:900;color:var(--brand-primary)">$${(parseFloat(o.total) || 0).toFixed(2)}</td>
                <td style="padding:10px">
                  <span style="background:var(--bg-secondary);padding:4px 8px;border-radius:12px;font-weight:800">${o.order_status}</span>
                </td>
                <td style="padding:10px;font-size:0.75rem;color:var(--text-muted)">${new Date(o.created_at).toLocaleTimeString()}</td>
                <td style="padding:10px">
                  <select onchange="Admin.updateOrderStatus('${o.id}', this.value)" style="padding:4px;border-radius:4px;font-size:0.78rem">
                    <option value="received" ${o.order_status==='received'?'selected':''}>Received</option>
                    <option value="preparing" ${o.order_status==='preparing'?'selected':''}>Preparing</option>
                    <option value="out_for_delivery" ${o.order_status==='out_for_delivery'?'selected':''}>Out for Delivery</option>
                    <option value="completed" ${o.order_status==='completed'?'selected':''}>Completed</option>
                    <option value="cancelled" ${o.order_status==='cancelled'?'selected':''}>Cancelled</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const url = `${StorefrontAPI.getUrl()}/rest/v1/orders?id=eq.${orderId}`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          "apikey": StorefrontAPI.getKey(),
          "Authorization": `Bearer ${StorefrontAPI.getKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ order_status: status, updated_at: new Date().toISOString() })
      });
      loadOrders();
    } catch(e) {
      alert('Error: ' + e.message);
    }
  }

  // ── TAB SWITCHER ──
  function switchTab(tab) {
    document.getElementById('tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
    document.getElementById('tab-banner').style.display = tab === 'banner' ? 'block' : 'none';
    document.getElementById('tab-categories').style.display = tab === 'categories' ? 'block' : 'none';
    document.getElementById('tab-catalog').style.display = tab === 'catalog' ? 'block' : 'none';
    document.getElementById('tab-orders').style.display = tab === 'orders' ? 'block' : 'none';

    document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('tab-btn-' + tab);
    if (activeBtn) activeBtn.classList.add('active');
  }

  return {
    init,
    verifyCredentials,
    verifyPin: verifyCredentials,
    toggleLoginPwdVisibility,
    logout,
    toggleLang,
    handleFileUpload,
    handleSlideUpload,
    saveSettings,
    addNewSlide,
    removeSlide,
    updateSlideField,
    updateBannerStatusBadge,
    loadCategories,
    openAddCategoryModal,
    openEditCategoryModal,
    closeCategoryModal,
    submitCategoryForm,
    deleteCategory,
    loadCatalog,
    openAddItemModal,
    closeAddItemModal,
    submitNewItem,
    openEditItemModal,
    closeEditItemModal,
    submitEditItem,
    deleteProduct,
    confirmClearAllProducts,
    loadOrders,
    updateOrderStatus,
    switchTab
  };
})();

window.Admin = Admin;
document.addEventListener('DOMContentLoaded', () => Admin.init());
