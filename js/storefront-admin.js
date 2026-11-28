/**
 * Online store — manager portal (admin.html)
 * Works with the cloud store (Supabase) and with a shop's own server (tenant-local-01).
 * Everything the owner edits that has no column of its own is kept inside tenants.banner_url
 * (a JSON object): slides, offers, announcement, brand, delivery zones, opening hours…
 */
const Admin = (() => {
  const SESSION_KEY = 'rs_admin_session';
  const S = {
    lang: localStorage.getItem('rs_admin_lang') || 'ar',
    tenant: null, banner: {}, local: false,
    slides: [], offers: [], zones: [], hours: null, catImages: {}, brand: {}, announcement: {},
    vis: {}, hiddenCats: new Set(), selected: new Set(), listedIds: [],
    categories: [], products: [], orders: [],
    section: 'overview', dirty: false, filter: 'received', openOrders: new Set(),
    knownNew: null, timer: null
  };

  // ── small helpers ─────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const L = (en, ar) => (S.lang === 'ar' ? ar : en);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
  const money = (v) => '$' + num(v).toFixed(2);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const val = (id) => { const e = $(id); return e ? String(e.value || '').trim() : ''; };
  const setVal = (id, v) => { const e = $(id); if (e) e.value = v == null ? '' : v; };
  const checked = (id) => !!($(id) && $(id).checked);
  const setChecked = (id, v) => { const e = $(id); if (e) e.checked = !!v; };
  const parseJSON = (raw) => { try { if (raw && typeof raw === 'object') return raw; const s = String(raw || '').trim(); return s.startsWith('{') ? JSON.parse(s) : {}; } catch (e) { return {}; } };
  const notesOf = (o) => parseJSON(o && o.notes);
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtTime = (iso) => { try { const d = new Date(iso); const sameDay = d.toDateString() === new Date().toDateString(); return d.toLocaleString(S.lang === 'ar' ? 'ar-LB' : 'en-GB', sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const nameOf = (x) => S.lang === 'en' ? (x.name_en || x.name || x.name_ar || '') : (x.name_ar || x.name || x.name_en || '');

  function toast(msg, type) {
    const box = $('toast'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), type === 'err' ? 6000 : 3200);
  }

  // ── session & API ─────────────────────────────────────────────
  function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function setSession(s) { if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); }

  // The shop's own server checks the manager PIN on every request (x-admin-pin header).
  (function attachPin() {
    const orig = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const s = getSession();
        if (s && s.pin) {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          const base = (window.StorefrontAPI && StorefrontAPI.getUrl) ? StorefrontAPI.getUrl() : location.origin;
          if (url.startsWith('/') || (base && url.startsWith(base)) || url.startsWith(location.origin)) {
            init = Object.assign({}, init || {});
            init.headers = Object.assign({}, (init.headers && !(init.headers instanceof Headers)) ? init.headers : {}, { 'x-admin-pin': s.pin });
          }
        }
      } catch (e) { }
      return orig(input, init);
    };
  })();

  function headers(extra) {
    const k = StorefrontAPI.getKey();
    const h = { 'Content-Type': 'application/json' };
    if (k) { h.apikey = k; h.Authorization = 'Bearer ' + k; }
    return Object.assign(h, extra || {});
  }
  async function api(path, opts = {}) {
    const res = await fetch(StorefrontAPI.getUrl() + path, Object.assign({}, opts, { headers: headers(opts.headers) }));
    if (!res.ok) {
      let t = ''; try { t = await res.text(); } catch (e) { }
      throw new Error((t && t.length < 300 ? t : '') || ('HTTP ' + res.status));
    }
    const txt = await res.text();
    try { return txt ? JSON.parse(txt) : null; } catch (e) { return null; }
  }

  function getSlug() {
    const p = new URLSearchParams(location.search);
    return (p.get('shop') || p.get('slug') || localStorage.getItem('rs_last_shop_slug') || '').trim().toLowerCase();
  }

  // ── language & theme ──────────────────────────────────────────
  function applyLang() {
    const ar = S.lang === 'ar';
    document.documentElement.lang = S.lang;
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-en]').forEach(el => { el.innerHTML = ar ? el.getAttribute('data-ar') : el.getAttribute('data-en'); });
    document.querySelectorAll('[data-ph-en]').forEach(el => { el.placeholder = ar ? el.getAttribute('data-ph-ar') : el.getAttribute('data-ph-en'); });
    document.querySelectorAll('.lang-label').forEach(el => { el.textContent = ar ? 'English' : 'عربي'; });
    updateTitle();
  }
  function toggleLang() {
    S.lang = S.lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('rs_admin_lang', S.lang);
    applyLang();
    if (S.tenant) renderAll();
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    const dark = t === 'dark' || (!t && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if ($('btn-theme')) $('btn-theme').textContent = dark ? '☀️' : '🌙';
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur === 'dark' || (!cur && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    localStorage.setItem('rs_admin_theme', next);
    applyTheme(next);
  }
  function setBrandColor(c) {
    const ok = /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#dc2626';
    document.documentElement.style.setProperty('--brand', ok);
  }

  // ── login ─────────────────────────────────────────────────────
  function paintLogo(el, tenant) {
    if (!el) return;
    if (tenant && tenant.logo_url) el.innerHTML = `<img src="${esc(tenant.logo_url)}" alt="">`;
    else el.textContent = tenant && tenant.shop_name ? String(tenant.shop_name).trim().charAt(0).toUpperCase() : '🏪';
  }
  async function previewLoginShop() {
    const slug = val('login-slug').toLowerCase();
    if (!slug) return;
    try {
      const t = await StorefrontAPI.fetchTenant(slug);
      if (t) {
        paintLogo($('login-logo'), t);
        if ($('login-shop-name')) $('login-shop-name').textContent = t.shop_name || L('Store manager', 'إدارة المتجر');
        const b = parseJSON(t.banner_url);
        if (b.brand && b.brand.color) setBrandColor(b.brand.color);
      }
    } catch (e) { }
  }
  function togglePwd(id) { const e = $(id); if (e) e.type = e.type === 'password' ? 'text' : 'password'; }

  async function login() {
    const slug = val('login-slug').toLowerCase() || getSlug();
    const pwd = val('login-pwd');
    const err = $('login-err');
    err.textContent = '';
    if (!slug) { err.textContent = L('Enter your store ID.', 'أدخل معرّف المتجر.'); return; }
    if (!pwd) { err.textContent = L('Enter your password.', 'أدخل كلمة المرور.'); $('login-pwd').focus(); return; }
    const btn = $('login-btn'); btn.disabled = true;
    try {
      const t = await StorefrontAPI.fetchTenant(slug);
      if (!t || (t.id !== 'tenant-local-01' && !t.id)) { err.textContent = L(`Store “${slug}” was not found.`, `المتجر «${slug}» غير موجود.`); return; }
      if (t.id === 'tenant-local-01') {
        let ok = false, msg = '';
        try {
          const r = await fetch(StorefrontAPI.getUrl() + '/api/storefront/verify-admin-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pwd }) });
          const j = await r.json().catch(() => ({}));
          ok = r.ok && j.ok === true; msg = j.error || '';
        } catch (e) { msg = e.message; }
        if (!ok) { err.textContent = msg && /many/i.test(msg) ? L('Too many attempts. Try again in 15 minutes.', 'محاولات كثيرة. حاول بعد 15 دقيقة.') : L('Wrong PIN.', 'رمز غير صحيح.'); $('login-pwd').value = ''; return; }
        setSession({ slug: t.slug || slug, id: t.id, name: t.shop_name, pin: pwd });
      } else {
        const b = parseJSON(t.banner_url);
        const expected = b.admin_password ? String(b.admin_password) : '';
        if (!((expected && pwd === expected) || (!expected && pwd === '1234'))) { err.textContent = L('Wrong password.', 'كلمة المرور غير صحيحة.'); $('login-pwd').value = ''; return; }
        setSession({ slug: t.slug, id: t.id, name: t.shop_name });
      }
      localStorage.setItem('rs_last_shop_slug', t.slug || slug);
      const u = new URL(location.href); u.searchParams.set('shop', t.slug || slug); history.replaceState({}, '', u.toString());
      await enter();
    } catch (e) {
      err.textContent = L('Connection problem: ', 'مشكلة في الاتصال: ') + e.message;
    } finally { btn.disabled = false; }
  }
  function logout() {
    if (S.dirty && !confirm(L('Discard unsaved changes and sign out?', 'تجاهل التغييرات غير المحفوظة والخروج؟'))) return;
    S.dirty = false;
    setSession(null);
    location.reload();
  }

  // ── loading ───────────────────────────────────────────────────
  async function loadTenant() {
    const s = getSession();
    const t = await StorefrontAPI.fetchTenant(s.slug);
    if (!t) throw new Error(L('Store not found', 'المتجر غير موجود'));
    S.tenant = t;
    S.local = t.id === 'tenant-local-01';
    S.banner = parseJSON(t.banner_url);
    readBannerIntoState();
  }
  function readBannerIntoState() {
    const b = S.banner;
    S.slides = (Array.isArray(b.slides) ? b.slides : (b.title || b.image_url ? [b] : [])).map(x => Object.assign({ id: uid(), active: true }, x, { id: x.id || uid() }));
    S.offers = (Array.isArray(b.online_offers) ? b.online_offers : []).map(o => Object.assign({ id: uid(), active: true }, o, { id: o.id || uid() }));
    S.zones = Array.isArray(b.delivery_zones) ? b.delivery_zones.map(z => ({ name: z.name || '', fee: z.fee ?? '', min: z.min ?? '' })) : [];
    S.hours = (b.opening_hours && b.opening_hours.days) ? JSON.parse(JSON.stringify(b.opening_hours)) : defaultHours();
    S.catImages = (b.category_images && typeof b.category_images === 'object') ? Object.assign({}, b.category_images) : {};
    S.brand = Object.assign({}, b.brand || {});
    S.announcement = Object.assign({ active: false, text_ar: '', text_en: '' }, b.announcement || {});
    S.vis = (b.product_visibility && typeof b.product_visibility === 'object') ? Object.assign({}, b.product_visibility) : {};
    S.hiddenCats = new Set((Array.isArray(b.hidden_categories) ? b.hidden_categories : []).map(String));
  }
  async function loadCatalog() {
    const id = S.tenant.id;
    const [cats, prods] = await Promise.all([
      StorefrontAPI.fetchCategories(id).catch(() => []),
      S.local ? api('/rest/v1/products?shop_id=eq.' + encodeURIComponent(id)).catch(() => []) : loadAllCloudProducts()
    ]);
    S.categories = Array.isArray(cats) ? cats : [];
    S.products = Array.isArray(prods) ? prods : [];
  }
  // The manager sees hidden products too (the customer list only returns published ones).
  async function loadAllCloudProducts() {
    let all = [], from = 0;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(StorefrontAPI.getUrl() + '/rest/v1/products?shop_id=eq.' + encodeURIComponent(S.tenant.id) + '&order=name.asc', { headers: headers({ 'Range-Unit': 'items', Range: from + '-' + (from + 999) }) });
      if (!res.ok) break;
      const page = await res.json();
      if (!Array.isArray(page) || !page.length) break;
      all = all.concat(page);
      if (page.length < 1000) break;
      from += 1000;
    }
    return all;
  }
  async function loadOrders(manual) {
    try {
      const rows = await api('/rest/v1/orders?shop_id=eq.' + encodeURIComponent(S.tenant.id) + '&order=created_at.desc&limit=400');
      const seen = new Set();
      S.orders = (Array.isArray(rows) ? rows : []).filter(o => { const k = String(o.id || o.order_number); if (seen.has(k)) return false; seen.add(k); return true; });
      const newOnes = S.orders.filter(o => isOnline(o) && o.order_status === 'received');
      if (S.knownNew) {
        const fresh = newOnes.filter(o => !S.knownNew.has(String(o.id)));
        if (fresh.length) { chime(); toast(L(`🔔 ${fresh.length} new order(s)`, `🔔 ${fresh.length} طلب جديد`), 'ok'); }
      }
      S.knownNew = new Set(newOnes.map(o => String(o.id)));
      updateNewCount();
      if (S.section === 'orders') renderOrders();
      if (S.section === 'overview') renderOverview();
      if (manual) toast(L('Updated', 'تم التحديث'));
    } catch (e) {
      if (manual) toast(L('Could not load orders: ', 'تعذّر جلب الطلبات: ') + e.message, 'err');
    }
  }
  async function enter() {
    $('login').classList.add('hidden');
    $('shell').classList.remove('hidden');
    try {
      await loadTenant();
      await loadCatalog();
    } catch (e) {
      toast(L('Could not load the store: ', 'تعذّر تحميل المتجر: ') + e.message, 'err');
      return;
    }
    fillForms();
    renderAll();
    const hash = (location.hash || '').replace('#', '');
    go(['overview', 'orders', 'banners', 'offers', 'products', 'categories', 'profile', 'delivery', 'reports', 'security'].includes(hash) ? hash : 'overview');
    await loadOrders();
    clearInterval(S.timer);
    S.timer = setInterval(() => { if (!document.hidden) loadOrders(); }, 20000);
  }

  // ── order helpers ─────────────────────────────────────────────
  function isPosSale(o) {
    if (!o) return false;
    if (notesOf(o).source === 'pos') return true;
    if (o.pos_synced === true && (o.pos_invoice_ref || /^RS-/i.test(String(o.order_number || '')))) return false;
    return o.pos_synced === true;
  }
  const isOnline = (o) => !isPosSale(o);
  const itemsOf = (o) => { const it = o && (o.items || o.order_items); if (Array.isArray(it)) return it; try { const a = JSON.parse(it || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const STATUS = {
    received: { en: 'New', ar: 'جديد', cls: 'p-warn', step: 1 },
    preparing: { en: 'Preparing', ar: 'قيد التحضير', cls: 'p-info', step: 2 },
    out_for_delivery: { en: 'On the way', ar: 'في الطريق', cls: 'p-violet', step: 3 },
    completed: { en: 'Completed', ar: 'مكتمل', cls: 'p-ok', step: 4 },
    cancelled: { en: 'Cancelled', ar: 'ملغى', cls: 'p-bad', step: 0 }
  };
  const statusOf = (o) => STATUS[o.order_status] || STATUS.received;
  const itemName = (it) => { const p = it && it.product_id != null ? S.products.find(x => String(x.id) === String(it.product_id)) : null; return p ? nameOf(p) : (it.product_name || it.name || ''); };
  function updateNewCount() {
    const n = S.orders.filter(o => isOnline(o) && o.order_status === 'received').length;
    const el = $('nav-new-count');
    if (el) { el.textContent = n; el.classList.toggle('hidden', !n); }
    document.title = (n ? `(${n}) ` : '') + (S.tenant ? S.tenant.shop_name + ' · ' : '') + L('Store manager', 'إدارة المتجر');
  }
  let _ac = null;
  function chime() {
    if (localStorage.getItem('rs_admin_sound') === 'off') return;
    try {
      _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18, 0.36].forEach((t, i) => {
        const o = _ac.createOscillator(), g = _ac.createGain();
        o.type = 'sine'; o.frequency.value = [880, 1175, 1568][i];
        g.gain.setValueAtTime(0.0001, _ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, _ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, _ac.currentTime + t + 0.3);
        o.connect(g); g.connect(_ac.destination); o.start(_ac.currentTime + t); o.stop(_ac.currentTime + t + 0.32);
      });
    } catch (e) { }
  }
  function saveSoundPref() { localStorage.setItem('rs_admin_sound', checked('ord-sound') ? 'on' : 'off'); }

  // ── navigation ────────────────────────────────────────────────
  const TITLES = {
    overview: ['Overview', 'الرئيسية'], orders: ['Orders', 'الطلبات'], banners: ['Banners', 'البانرات'],
    offers: ['Offers & announcements', 'العروض والإعلانات'], products: ['Products', 'الأصناف'], categories: ['Categories', 'الأقسام'],
    profile: ['Store profile & look', 'بيانات المتجر والمظهر'], delivery: ['Delivery & hours', 'التوصيل وأوقات العمل'],
    reports: ['Reports', 'التقارير'], security: ['Security', 'الأمان']
  };
  function updateTitle() { const t = TITLES[S.section]; if (t && $('page-title')) $('page-title').textContent = L(t[0], t[1]); }
  function go(sec) {
    S.section = sec;
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'sec-' + sec));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-sec') === sec));
    $('side').classList.remove('open');
    if (history.replaceState) history.replaceState({}, '', location.pathname + location.search + '#' + sec);
    updateTitle();
    renderSection(sec);
    window.scrollTo({ top: 0 });
  }
  function toggleMenu() { $('side').classList.toggle('open'); }
  function renderSection(sec) {
    ({ overview: renderOverview, orders: renderOrders, banners: renderSlides, offers: renderOffers, products: renderProducts,
      categories: renderCategories, delivery: () => { renderZones(); renderHours(); }, reports: renderReports, security: renderSecurity, profile: renderSwatches }[sec] || (() => { }))();
  }
  function renderAll() {
    const t = S.tenant;
    paintLogo($('side-logo'), t);
    $('side-name').textContent = t.shop_name || t.slug;
    setBrandColor(S.brand.color);
    const fav = $('admin-favicon'); if (fav && t.logo_url) fav.href = t.logo_url;
    $('btn-view-store').href = storeLink();
    document.querySelectorAll('.cloud-only').forEach(e => e.classList.toggle('hidden', S.local));
    document.querySelectorAll('.local-only').forEach(e => e.classList.toggle('hidden', !S.local));
    updateNewCount();
    renderSection(S.section);
  }

  // ── forms (profile / delivery / banner switches / announcement) ──
  function fillForms() {
    const t = S.tenant, b = S.banner;
    setVal('pf-name', t.shop_name || '');
    setVal('pf-slug', t.slug || '');
    setVal('pf-logo', t.logo_url || ''); syncPreview('pf-logo', 'pf-logo-prev');
    setVal('pf-desc-ar', t.description_ar || '');
    setVal('pf-desc-en', t.description_en || '');
    setVal('pf-wa', t.whatsapp_phone || '');
    setVal('pf-phone', S.brand.phone || b.phone || '');
    setVal('pf-address', t.address || b.address || '');
    setVal('pf-maps', S.brand.maps_url || '');
    setVal('pf-ig', S.brand.instagram || '');
    setVal('pf-fb', S.brand.facebook || '');
    setVal('pf-tt', S.brand.tiktok || '');
    setVal('pf-email', S.brand.email || '');
    setChecked('pf-badges', b.show_header_badges === true);
    setChecked('pf-linkstock', t.link_pos_stock !== false);
    setChecked('pf-backorder', t.allow_out_of_stock === true);
    setColorInputs(S.brand.color || '#dc2626');
    setVal('dl-fee', num(t.delivery_fee));
    setVal('dl-min', num(t.min_order));
    setVal('dl-rate', num(t.currency_lbp_rate, 89500));
    setChecked('dl-pickup', b.allow_pickup === true);
    setChecked('dl-hours-on', !!(S.hours && S.hours.enabled));
    setChecked('bn-active', b.active !== false);
    setChecked('an-active', !!S.announcement.active);
    setVal('an-text-ar', S.announcement.text_ar || '');
    setVal('an-text-en', S.announcement.text_en || '');
    setChecked('ord-sound', localStorage.getItem('rs_admin_sound') !== 'off');
    // On a shop's own server the name, address, LBP rate (and logo, if the POS has one) come from the POS.
    const lock = (id, on) => { const e = $(id); if (e) e.readOnly = !!on; };
    const posLogo = /\/api\/shop\/logo/.test(String(t.logo_url || ''));
    lock('pf-name', S.local); lock('pf-address', S.local); lock('dl-rate', S.local); lock('pf-logo', S.local && posLogo);
    $('pf-local-note').innerHTML = S.local ? `<div class="notice n-info">ℹ️ <span>${L('Your store name, address, exchange rate and logo come from the POS (Settings → Company). Change them there and they update here.', 'اسم المتجر والعنوان وسعر الصرف والشعار تأتي من برنامج الكاشير (الإعدادات ← بيانات الشركة). عدّلها هناك وستتحدث هنا.')}</span></div>` : '';
    S.dirty = false; $('savebar').classList.remove('show');
  }
  function dirty() { S.dirty = true; $('savebar').classList.add('show'); }
  async function discard() {
    if (!confirm(L('Discard your changes?', 'تجاهل التغييرات؟'))) return;
    readBannerIntoState(); fillForms(); renderAll();
  }
  const SWATCHES = ['#dc2626', '#ea580c', '#d97706', '#16a34a', '#059669', '#0d9488', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#0f172a', '#78350f'];
  function renderSwatches() {
    const cur = (S.brand.color || '#dc2626').toLowerCase();
    $('pf-swatches').innerHTML = SWATCHES.map(c => `<button type="button" class="swatch ${c === cur ? 'sel' : ''}" style="background:${c}" onclick="Admin.setColor('${c}')" aria-label="${c}"></button>`).join('');
  }
  function setColorInputs(c) { setVal('pf-color', c); setVal('pf-color-hex', c); }
  function setColor(c) {
    c = String(c || '').trim();
    if (!/^#[0-9a-f]{6}$/i.test(c)) { setVal('pf-color-hex', c); return; }
    S.brand.color = c.toLowerCase();
    setColorInputs(S.brand.color); setBrandColor(S.brand.color); renderSwatches(); dirty();
  }

  // ── save ──────────────────────────────────────────────────────
  function bannerPatchFromState() {
    const zones = S.zones.map(z => ({ name: String(z.name || '').trim(), fee: Math.max(0, num(z.fee)), min: Math.max(0, num(z.min)) })).filter(z => z.name);
    if (S.hours) S.hours.enabled = checked('dl-hours-on');
    const brand = Object.assign({}, S.brand, {
      phone: val('pf-phone'), maps_url: val('pf-maps'), instagram: val('pf-ig'), facebook: val('pf-fb'), tiktok: val('pf-tt'), email: val('pf-email')
    });
    return {
      active: checked('bn-active'),
      slides: S.slides,
      online_offers: S.offers,
      announcement: { active: checked('an-active'), text_ar: val('an-text-ar'), text_en: val('an-text-en') },
      category_images: S.catImages,
      delivery_zones: zones,
      allow_pickup: checked('dl-pickup'),
      opening_hours: S.hours || defaultHours(),
      show_header_badges: checked('pf-badges'),
      brand
    };
  }
  // Re-read the stored JSON and merge: the POS keeps its own data in the same field (drawers, sync state…).
  async function writeTenant(fields, bannerPatch) {
    let body = Object.assign({}, fields || {});
    if (bannerPatch) {
      if (S.local) {
        body.banner_url = JSON.stringify(bannerPatch); // the shop's server merges it with what it keeps
      } else {
        let cur = {};
        try { const fresh = await StorefrontAPI.fetchTenant(S.tenant.slug); cur = parseJSON(fresh && fresh.banner_url); } catch (e) { cur = Object.assign({}, S.banner); }
        body.banner_url = JSON.stringify(Object.assign({}, cur, bannerPatch));
      }
    }
    body.updated_at = new Date().toISOString();
    await api('/rest/v1/tenants?id=eq.' + encodeURIComponent(S.tenant.id), { method: 'PATCH', body: JSON.stringify(body) });
  }
  async function save() {
    const btn = $('btn-save'); btn.disabled = true;
    try {
      const fee = Math.max(0, num(val('dl-fee'))), min = Math.max(0, num(val('dl-min')));
      const wa = val('pf-wa');
      if (wa && wa.replace(/\D/g, '').length < 7) throw new Error(L('The WhatsApp number looks too short.', 'رقم واتساب قصير جداً.'));
      const fields = {
        whatsapp_phone: wa, delivery_fee: fee, min_order: min,
        description_ar: val('pf-desc-ar'), description_en: val('pf-desc-en'),
        allow_out_of_stock: checked('pf-backorder')
      };
      if (!S.local) {
        Object.assign(fields, { shop_name: val('pf-name') || S.tenant.shop_name, address: val('pf-address'), logo_url: val('pf-logo') || null, link_pos_stock: checked('pf-linkstock'), currency_lbp_rate: Math.max(0, num(val('dl-rate'), 89500)) || 89500 });
      } else if (!$('pf-logo').readOnly) {
        fields.logo_url = val('pf-logo') || null;
      }
      const patch = bannerPatchFromState();
      await writeTenant(fields, patch);
      Object.assign(S.tenant, fields);
      S.banner = Object.assign({}, S.banner, patch);
      S.tenant.banner_url = JSON.stringify(S.banner);
      S.dirty = false; $('savebar').classList.remove('show');
      renderAll();
      toast(L('✅ Saved. Your store is updated.', '✅ تم الحفظ. تم تحديث متجرك.'), 'ok');
      return true;
    } catch (e) {
      toast(L('Not saved: ', 'لم يتم الحفظ: ') + e.message, 'err');
      return false;
    } finally { btn.disabled = false; }
  }

  // ── images ────────────────────────────────────────────────────
  function syncPreview(inputId, prevId) {
    const v = val(inputId), p = $(prevId);
    if (p) p.style.backgroundImage = v ? `url("${v.replace(/"/g, '%22')}")` : '';
  }
  function clearImage(inputId, prevId) { setVal(inputId, ''); syncPreview(inputId, prevId); if (inputId.startsWith('pf-')) dirty(); }
  function compress(file, maxDim, png) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('read'));
      r.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error(L('Not a picture', 'ليست صورة')));
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) { if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; } }
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.82));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  function pickImage(inputId, prevId, maxDim, onDone) {
    const fp = $('file-picker');
    fp.value = '';
    fp.onchange = async () => {
      const f = fp.files && fp.files[0]; if (!f) return;
      if (f.size > 15 * 1024 * 1024) { toast(L('Picture is too large (max 15 MB).', 'الصورة كبيرة جداً (حد أقصى 15 ميغا).'), 'err'); return; }
      try {
        const data = await compress(f, maxDim || 800, inputId === 'pf-logo');
        if (typeof onDone === 'function') onDone(data);
        else { setVal(inputId, data); syncPreview(inputId, prevId); if (inputId.startsWith('pf-')) dirty(); }
      } catch (e) { toast(e.message, 'err'); }
    };
    fp.click();
  }

  // ── links ─────────────────────────────────────────────────────
  function storeLink() {
    const slug = encodeURIComponent((S.tenant && S.tenant.slug) || getSlug());
    try { return new URL('./?shop=' + slug, location.href).toString(); } catch (e) { return './?shop=' + slug; }
  }
  const isLanHost = () => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  function qrUrl(data, size) { return 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size || 220) + 'x' + (size || 220) + '&margin=6&data=' + encodeURIComponent(data); }
  async function copyLink() {
    const l = storeLink();
    try { await navigator.clipboard.writeText(l); toast(L('Link copied', 'تم نسخ الرابط'), 'ok'); } catch (e) { prompt(L('Copy the link:', 'انسخ الرابط:'), l); }
  }
  function shareWhatsApp() {
    const t = S.tenant;
    const msg = L(`Order online from ${t.shop_name}: ${storeLink()}`, `اطلب أونلاين من ${t.shop_name}: ${storeLink()}`);
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }
  function openManagerApp() {
    let link; try { link = new URL('./app.html?shop=' + encodeURIComponent(S.tenant.slug), location.href).toString(); } catch (e) { link = 'app.html'; }
    $('m-app-qr').src = qrUrl(link, 240); setVal('m-app-link', link); $('m-app-open').href = link;
    openModal('m-app');
  }
  function openModal(id) { $(id).classList.add('open'); }
  function closeModal(id) { $(id).classList.remove('open'); }

  // ── OVERVIEW ──────────────────────────────────────────────────
  function isOpenNowHours(h) {
    if (!h || !h.enabled || !h.days) return true;
    let day, min;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: h.tz || 'Asia/Beirut', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = k => (parts.find(p => p.type === k) || {}).value;
      day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
      min = ((parseInt(g('hour'), 10) || 0) % 24) * 60 + (parseInt(g('minute'), 10) || 0);
    } catch (e) { const n = new Date(); day = n.getDay(); min = n.getHours() * 60 + n.getMinutes(); }
    const toMin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
    const inDay = (d, part) => {
      if (!d || d.closed) return false;
      const o = toMin(d.open), c = toMin(d.close); if (o == null || c == null) return true;
      if (o === c) return true;
      if (o < c) return part === 'today' && min >= o && min < c;
      return part === 'today' ? min >= o : min < c;
    };
    return inDay(h.days[day], 'today') || inDay(h.days[(day + 6) % 7], 'yesterday');
  }
  function checklist() {
    const t = S.tenant, b = S.banner;
    const withImg = S.products.filter(p => p.image_url).length;
    const items = [
      { done: !!t.logo_url, en: 'Add your logo', ar: 'أضف شعار المتجر', sec: 'profile' },
      { done: !!String(t.whatsapp_phone || '').replace(/\D/g, ''), en: 'Add a WhatsApp number', ar: 'أضف رقم واتساب', sec: 'profile' },
      { done: S.local ? !!t.admin_pin_required : !!b.admin_password, en: S.local ? 'Set a manager PIN in the POS' : 'Change the default password', ar: S.local ? 'حدّد رمز المدير من برنامج الكاشير' : 'غيّر كلمة المرور الافتراضية', sec: 'security' },
      { done: S.slides.some(s => s.active !== false && s.image_url), en: 'Add a banner with a picture', ar: 'أضف بانراً مع صورة', sec: 'banners' },
      { done: num(t.delivery_fee) > 0 || (b.delivery_zones || []).length > 0 || b.allow_pickup === true, en: 'Set delivery charges or pickup', ar: 'حدّد أجور التوصيل أو الاستلام', sec: 'delivery' },
      { done: !!(b.opening_hours && b.opening_hours.enabled), en: 'Set your opening hours', ar: 'حدّد أوقات العمل', sec: 'delivery' },
      { done: !S.products.length || withImg / S.products.length >= 0.6, en: `Add pictures to products (${withImg}/${S.products.length})`, ar: `أضف صوراً للأصناف (${withImg}/${S.products.length})`, sec: 'products' },
      { done: !!(S.brand.instagram || S.brand.facebook || S.brand.tiktok || S.brand.maps_url), en: 'Add social links or a map', ar: 'أضف روابط التواصل أو الخريطة', sec: 'profile' }
    ];
    return items;
  }
  function renderOverview() {
    if (!S.tenant) return;
    const online = S.orders.filter(isOnline);
    const t0 = today0().getTime();
    const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    const live = online.filter(o => o.order_status !== 'cancelled');
    const todayO = online.filter(o => new Date(o.created_at).getTime() >= t0);
    const todayLive = todayO.filter(o => o.order_status !== 'cancelled');
    const monthLive = live.filter(o => new Date(o.created_at) >= m0);
    $('ov-new').textContent = online.filter(o => o.order_status === 'received').length;
    $('ov-today').textContent = todayO.length;
    $('ov-today-sub').textContent = L(`${todayO.filter(o => o.order_status === 'completed').length} completed`, `${todayO.filter(o => o.order_status === 'completed').length} مكتمل`);
    $('ov-rev-today').textContent = money(todayLive.reduce((s, o) => s + num(o.total), 0));
    $('ov-rev-month').textContent = money(monthLive.reduce((s, o) => s + num(o.total), 0));
    $('ov-month-sub').textContent = L(`${monthLive.length} orders`, `${monthLive.length} طلب`);

    const openByHours = isOpenNowHours(S.banner.opening_hours);
    const posOff = S.local && S.tenant.pos_online === false;
    const st = $('ov-status');
    if (posOff) { st.className = 'pill p-bad'; st.textContent = L('● Closed — POS is off', '● مغلق — الكاشير مطفأ'); }
    else if (!openByHours) { st.className = 'pill p-warn'; st.textContent = L('● Closed (opening hours)', '● مغلق (خارج أوقات العمل)'); }
    else { st.className = 'pill p-ok'; st.textContent = L('● Open for orders', '● مفتوح للطلبات'); }
    const link = storeLink();
    setVal('ov-link', link);
    $('ov-qr').src = qrUrl(link, 260);
    $('ov-qr-dl').href = qrUrl(link, 800);

    const alerts = [];
    if (!S.local && !S.banner.admin_password) alerts.push(`<div class="notice n-warn">⚠️ <span>${L('You are still using the default password. Anyone who knows it can change your store.', 'ما زلت تستخدم كلمة المرور الافتراضية. أي شخص يعرفها يستطيع تعديل متجرك.')} <a href="#security" onclick="Admin.go('security');return false" style="font-weight:900">${L('Change it now', 'غيّرها الآن')}</a></span></div>`);
    if (S.local && isLanHost()) alerts.push(`<div class="notice n-info">ℹ️ <span>${L('You opened this page on the shop network, so the link below is a local address. Share your public store link (shown in the POS → Online orders) with customers.', 'فتحت هذه الصفحة من شبكة المحل، لذا الرابط أدناه عنوان محلي. شارك مع الزبائن رابط متجرك العام (يظهر في الكاشير ← الطلبات الأونلاين).')}</span></div>`);
    if (posOff) alerts.push(`<div class="notice n-warn">⚠️ <span>${L('Customers cannot order now: no cash register is open in the shop. Open the POS to start taking orders.', 'لا يستطيع الزبائن الطلب الآن: لا يوجد كاشير مفتوح في المحل. افتح برنامج الكاشير لاستقبال الطلبات.')}</span></div>`);
    $('ov-alerts').innerHTML = alerts.join('');

    const latest = online.slice(0, 6);
    $('ov-latest').innerHTML = latest.length ? `<div class="table-wrap"><table><tbody>${latest.map(o => {
      const s = statusOf(o);
      return `<tr style="cursor:pointer" onclick="Admin.openOrder('${esc(o.id)}')"><td><b>#${esc(o.order_number || '')}</b><div class="order-meta">${esc(o.customer_name || '')} · ${fmtTime(o.created_at)}</div></td><td><span class="pill ${s.cls}">${L(s.en, s.ar)}</span></td><td class="num"><b>${money(o.total)}</b></td></tr>`;
    }).join('')}</tbody></table></div>` : `<div class="empty"><div class="big">🧾</div>${L('No online orders yet. Share your store link to get the first one.', 'لا توجد طلبات أونلاين بعد. شارك رابط متجرك لتصلك أول طلبية.')}</div>`;

    const list = checklist();
    const done = list.filter(x => x.done).length;
    $('ov-score-text').textContent = L(`${done} of ${list.length} done`, `تم ${done} من ${list.length}`);
    $('ov-checklist').innerHTML = list.map(x => `<li class="${x.done ? 'done' : 'todo'}"><span class="dot">${x.done ? '✓' : '!'}</span><span class="t">${L(x.en, x.ar)}</span>${x.done ? '' : `<span class="spacer"></span><button class="btn btn-sm" onclick="Admin.go('${x.sec}')">${L('Fix', 'إصلاح')}</button>`}</li>`).join('');
  }

  // ── ORDERS ────────────────────────────────────────────────────
  function openOrder(id) { S.openOrders.add(String(id)); S.filter = 'all'; go('orders'); setTimeout(() => { const el = document.querySelector(`[data-order="${CSS.escape(String(id))}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); }
  function setFilter(f) { S.filter = f; renderOrders(); }
  function toggleOrder(id) { id = String(id); if (S.openOrders.has(id)) S.openOrders.delete(id); else S.openOrders.add(id); renderOrders(); }
  function renderOrders() {
    if (!S.tenant) return;
    const online = S.orders.filter(isOnline);
    const counts = { all: online.length };
    Object.keys(STATUS).forEach(k => { counts[k] = online.filter(o => (o.order_status || 'received') === k).length; });
    const chips = [['received', '🔔'], ['preparing', '👨‍🍳'], ['out_for_delivery', '🛵'], ['completed', '✅'], ['cancelled', '✕'], ['all', '']];
    $('ord-chips').innerHTML = chips.map(([k, ic]) => `<button class="chip ${S.filter === k ? 'active' : ''}" onclick="Admin.setFilter('${k}')">${ic} ${k === 'all' ? L('All', 'الكل') : L(STATUS[k].en, STATUS[k].ar)} <span class="c">${counts[k] || 0}</span></button>`).join('');
    const q = val('ord-search').toLowerCase();
    let list = online.filter(o => S.filter === 'all' || (o.order_status || 'received') === S.filter);
    if (q) list = list.filter(o => [o.order_number, o.customer_name, o.customer_phone, o.delivery_address].some(x => String(x || '').toLowerCase().includes(q)));
    if (!list.length) {
      $('ord-list').innerHTML = `<div class="card empty"><div class="big">🧾</div>${S.filter === 'received' ? L('No new orders right now. New orders appear here with a sound.', 'لا توجد طلبات جديدة الآن. تظهر الطلبات الجديدة هنا مع صوت تنبيه.') : L('No orders here.', 'لا توجد طلبات هنا.')}</div>`;
      return;
    }
    const lbp = num(S.tenant.currency_lbp_rate, 89500);
    $('ord-list').innerHTML = list.map(o => {
      const s = statusOf(o), id = String(o.id), open = S.openOrders.has(id);
      const items = itemsOf(o);
      const phone = String(o.customer_phone || '');
      const steps = [1, 2, 3, 4].map(i => `<i class="${s.step >= i ? 'on' : ''}"></i>`).join('');
      const next = {
        received: [['preparing', '👨‍🍳 ' + L('Accept & prepare', 'قبول وتحضير'), 'btn-primary'], ['cancelled', L('Cancel', 'إلغاء'), 'btn-danger']],
        preparing: [['out_for_delivery', '🛵 ' + L('Out for delivery', 'خرج للتوصيل'), 'btn-primary'], ['completed', '✅ ' + L('Completed', 'مكتمل'), ''], ['cancelled', L('Cancel', 'إلغاء'), 'btn-danger']],
        out_for_delivery: [['completed', '✅ ' + L('Delivered', 'تم التسليم'), 'btn-ok'], ['cancelled', L('Cancel', 'إلغاء'), 'btn-danger']],
        completed: [['preparing', L('Reopen', 'إعادة فتح'), '']],
        cancelled: [['received', L('Restore', 'استرجاع'), '']]
      }[o.order_status || 'received'] || [];
      return `<div class="order ${open ? 'open' : ''} ${o.order_status === 'received' ? 'is-new' : ''}" data-order="${esc(id)}">
        <div class="order-head" onclick="Admin.toggleOrder('${esc(id)}')">
          <div><div class="order-no">#${esc(o.order_number || id.slice(0, 8))} <span class="pill ${s.cls}" style="margin-inline-start:6px">${L(s.en, s.ar)}</span>${o.pos_invoice_ref ? ` <span class="pill p-muted">🧾 ${esc(o.pos_invoice_ref)}</span>` : ''}</div>
            <div class="order-meta">${esc(o.customer_name || '')} · ${esc(phone)} · ${fmtTime(o.created_at)} · ${items.length} ${L('items', 'أصناف')}</div></div>
          <div class="order-total">${money(o.total)}</div>
        </div>
        <div class="order-body">
          <div class="steps">${steps}</div>
          <div class="grid g2">
            <div>
              <div class="lbl">${L('Customer', 'الزبون')}</div>
              <div style="font-weight:800">${esc(o.customer_name || '—')}</div>
              <div class="row" style="margin:6px 0 10px">
                ${phone ? `<a class="btn btn-sm" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">📞 ${esc(phone)}</a><button class="btn btn-sm btn-wa" onclick="Admin.waCustomer('${esc(id)}')">💬 WhatsApp</button>` : ''}
              </div>
              <div class="lbl">${L('Address', 'العنوان')}</div>
              <div style="margin-bottom:10px">${esc(o.delivery_address || '—')}</div>
              ${o.notes && !notesOf(o).source ? `<div class="lbl">${L('Notes', 'ملاحظات')}</div><div style="margin-bottom:10px">${esc(o.notes)}</div>` : ''}
            </div>
            <div>
              <table class="order-items"><tbody>${items.map(it => `<tr><td>${esc(num(it.quantity || it.qty, 1))} × ${esc(itemName(it))}</td><td class="num">${money(num(it.total_price) || num(it.unit_price || it.price) * num(it.quantity || it.qty, 1))}</td></tr>`).join('')}
                <tr><td style="border-top:1px dashed var(--line);padding-top:6px;color:var(--muted)">${L('Subtotal', 'المجموع')}</td><td class="num" style="border-top:1px dashed var(--line);padding-top:6px">${money(o.subtotal || (num(o.total) - num(o.delivery_fee)))}</td></tr>
                <tr><td style="color:var(--muted)">${L('Delivery', 'التوصيل')}</td><td class="num">${money(o.delivery_fee)}</td></tr>
                <tr><td><b>${L('Total', 'الإجمالي')}</b></td><td class="num"><b>${money(o.total)}</b><div class="order-meta">≈ ${Math.round(num(o.total) * lbp).toLocaleString()} ${L('LBP', 'ل.ل')}</div></td></tr>
              </tbody></table>
            </div>
          </div>
          <div class="row" style="margin-top:6px">
            ${next.map(([st, label, cls]) => `<button class="btn btn-sm ${cls}" onclick="Admin.setStatus('${esc(id)}','${st}')">${label}</button>`).join('')}
            <span class="spacer"></span>
            <button class="btn btn-sm" onclick="Admin.printOrder('${esc(id)}')">🖨️ ${L('Print', 'طباعة')}</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  async function setStatus(id, status) {
    const o = S.orders.find(x => String(x.id) === String(id)); if (!o) return;
    if (status === 'cancelled' && !confirm(L(`Cancel order #${o.order_number}?`, `إلغاء الطلب رقم ${o.order_number}؟`))) return;
    try {
      await api('/rest/v1/orders?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ order_status: status, updated_at: new Date().toISOString() }) });
      o.order_status = status;
      if (S.knownNew) S.knownNew.delete(String(id));
      updateNewCount(); renderOrders();
      toast(L('Order updated', 'تم تحديث الطلب'), 'ok');
      if (['preparing', 'out_for_delivery', 'completed', 'cancelled'].includes(status) && o.customer_phone && confirm(L('Tell the customer on WhatsApp?', 'إبلاغ الزبون عبر واتساب؟'))) waCustomer(id);
    } catch (e) { toast(L('Not updated: ', 'لم يتم التحديث: ') + e.message, 'err'); }
  }
  function waNumber(p) {
    let d = String(p || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 8 && !d.startsWith('961')) d = '961' + d;
    if (d.length === 7) d = '961' + d;
    return d;
  }
  function waCustomer(id) {
    const o = S.orders.find(x => String(x.id) === String(id)); if (!o) return;
    const shop = S.tenant.shop_name;
    const msgs = {
      received: [`Hello ${o.customer_name}, ${shop} received your order #${o.order_number}. Total ${money(o.total)}.`, `مرحباً ${o.customer_name}، استلم ${shop} طلبك رقم ${o.order_number}. الإجمالي ${money(o.total)}.`],
      preparing: [`Hello ${o.customer_name}, ${shop} is preparing your order #${o.order_number}.`, `مرحباً ${o.customer_name}، ${shop} يحضّر طلبك رقم ${o.order_number} الآن.`],
      out_for_delivery: [`Hello ${o.customer_name}, your order #${o.order_number} from ${shop} is on the way. Total ${money(o.total)}.`, `مرحباً ${o.customer_name}، طلبك رقم ${o.order_number} من ${shop} في الطريق إليك. الإجمالي ${money(o.total)}.`],
      completed: [`Thank you ${o.customer_name}! Your order #${o.order_number} from ${shop} is complete. We hope to see you again.`, `شكراً ${o.customer_name}! تم تسليم طلبك رقم ${o.order_number} من ${shop}. نتمنى أن نراك مجدداً.`],
      cancelled: [`Hello ${o.customer_name}, sorry, your order #${o.order_number} at ${shop} was cancelled. Contact us for help.`, `مرحباً ${o.customer_name}، نعتذر، تم إلغاء طلبك رقم ${o.order_number} لدى ${shop}. تواصل معنا للمساعدة.`]
    }[o.order_status || 'received'];
    const n = waNumber(o.customer_phone);
    if (!n) { toast(L('No phone number on this order', 'لا يوجد رقم هاتف في هذا الطلب'), 'err'); return; }
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(L(msgs[0], msgs[1]))}`, '_blank', 'noopener');
  }
  function printOrder(id) {
    const o = S.orders.find(x => String(x.id) === String(id)); if (!o) return;
    const t = S.tenant, items = itemsOf(o);
    const logo = t.logo_url ? `<img src="${esc(t.logo_url)}" style="max-width:70px;max-height:70px;display:block;margin:0 auto 6px">` : '';
    const contact = [S.brand.phone || t.whatsapp_phone, t.address].filter(Boolean).map(esc).join(' · ');
    $('print-area').innerHTML = `<div style="width:76mm;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;color:#000;direction:${S.lang === 'ar' ? 'rtl' : 'ltr'}">
      <div style="text-align:center">${logo}<div style="font-size:16px;font-weight:bold">${esc(t.shop_name)}</div><div>${contact}</div></div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:8px 0;padding:6px 0">
        <div style="font-size:15px;font-weight:bold;text-align:center">${L('Online order', 'طلب أونلاين')} #${esc(o.order_number)}</div>
        <div>${fmtTime(o.created_at)}</div>
        <div><b>${L('Customer', 'الزبون')}:</b> ${esc(o.customer_name)} — ${esc(o.customer_phone)}</div>
        <div><b>${L('Address', 'العنوان')}:</b> ${esc(o.delivery_address || '—')}</div>
        ${o.notes && !notesOf(o).source ? `<div><b>${L('Notes', 'ملاحظات')}:</b> ${esc(o.notes)}</div>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse">${items.map(it => `<tr><td style="padding:2px 0">${esc(num(it.quantity || it.qty, 1))} × ${esc(itemName(it))}</td><td style="text-align:end">${money(num(it.total_price) || num(it.unit_price || it.price) * num(it.quantity || it.qty, 1))}</td></tr>`).join('')}</table>
      <div style="border-top:1px dashed #000;margin-top:6px;padding-top:4px">
        <div style="display:flex;justify-content:space-between"><span>${L('Delivery', 'التوصيل')}</span><span>${money(o.delivery_fee)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:bold"><span>${L('Total', 'الإجمالي')}</span><span>${money(o.total)}</span></div>
        <div style="text-align:center;margin-top:4px">${L('Cash on delivery', 'الدفع عند الاستلام')}</div>
      </div>
      <div style="text-align:center;margin-top:10px">${L('Thank you!', 'شكراً لكم!')}</div>
      <div style="text-align:center;font-size:9px;color:#555;margin-top:6px">Powered by Red Shark</div>
    </div>`;
    setTimeout(() => window.print(), 80);
  }

  // ── BANNERS ───────────────────────────────────────────────────
  const today = () => new Date().toISOString().slice(0, 10);
  function slideState(s) {
    if (s.active === false) return ['p-muted', L('Off', 'متوقف')];
    const d = today();
    if (s.starts_at && s.starts_at > d) return ['p-info', L('Scheduled', 'مجدول')];
    if (s.ends_at && s.ends_at < d) return ['p-bad', L('Ended', 'انتهى')];
    return ['p-ok', L('Live', 'ظاهر الآن')];
  }
  function linkOptions(s) {
    const opt = (v, t) => `<option value="${v}" ${s.link_type === v ? 'selected' : ''}>${t}</option>`;
    return opt('none', L('No link', 'بدون رابط')) + opt('offers', L('Open the offers', 'فتح العروض')) + opt('category', L('Open a category', 'فتح قسم')) + opt('product', L('Open a product', 'فتح صنف')) + opt('whatsapp', L('Chat on WhatsApp', 'محادثة واتساب')) + opt('url', L('Web link', 'رابط إنترنت'));
  }
  function linkValueField(s, i) {
    if (s.link_type === 'category') return `<select class="input" onchange="Admin.slideSet(${i},'link_value',this.value)"><option value="">—</option>${S.categories.map(c => `<option value="${esc(c.id)}" ${String(s.link_value) === String(c.id) ? 'selected' : ''}>${esc(nameOf(c))}</option>`).join('')}</select>`;
    if (s.link_type === 'product') return `<select class="input" onchange="Admin.slideSet(${i},'link_value',this.value)"><option value="">—</option>${S.products.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map(p => `<option value="${esc(p.id)}" ${String(s.link_value) === String(p.id) ? 'selected' : ''}>${esc(nameOf(p))}</option>`).join('')}</select>`;
    if (s.link_type === 'url') return `<input class="input ltr" value="${esc(s.link_value || '')}" placeholder="https://…" oninput="Admin.slideSet(${i},'link_value',this.value,true)">`;
    return '';
  }
  function slidePreviewHtml(s) {
    const ar = S.lang === 'ar';
    const title = (!ar && s.title_en) ? s.title_en : (s.title || s.title_en || '');
    const sub = (!ar && s.subtitle_en) ? s.subtitle_en : (s.subtitle || s.subtitle_en || '');
    const btn = (!ar && s.button_text_en) ? s.button_text_en : (s.button_text || s.button_text_en || '');
    return `<div class="slide-prev" style="${s.image_url ? `background-image:url('${String(s.image_url).replace(/'/g, '%27')}')` : ''}"><div>
      ${s.badge ? `<span class="sb">${esc(s.badge)}</span>` : ''}<div class="st">${esc(title || L('Banner title', 'عنوان البانر'))}</div>${sub ? `<div class="ss">${esc(sub)}</div>` : ''}${btn && s.link_type && s.link_type !== 'none' ? `<span class="sbtn">${esc(btn)}</span>` : ''}</div></div>`;
  }
  function renderSlides() {
    $('bn-count').textContent = L(`${S.slides.length} banner(s) · ${S.slides.filter(s => slideState(s)[0] === 'p-ok').length} live`, `${S.slides.length} بانر · ${S.slides.filter(s => slideState(s)[0] === 'p-ok').length} ظاهر الآن`);
    if (!S.slides.length) {
      $('bn-list').innerHTML = `<div class="card empty"><div class="big">🖼️</div>${L('No banners yet. Add one to promote your offers on the store home page.', 'لا توجد بانرات بعد. أضف بانراً للترويج لعروضك في الصفحة الرئيسية.')}<div style="margin-top:12px"><button class="btn btn-primary" onclick="Admin.addSlide()">➕ ${L('Add banner', 'إضافة بانر')}</button></div></div>`;
      return;
    }
    $('bn-list').innerHTML = S.slides.map((s, i) => {
      const [cls, label] = slideState(s);
      return `<div class="slide-ed ${s.active === false ? 'off' : ''}">
        <div>
          <div id="sp-${i}">${slidePreviewHtml(s)}</div>
          <div class="slide-tools">
            <button class="btn btn-sm" onclick="Admin.slideImage(${i})">📁 ${L('Picture', 'صورة')}</button>
            ${s.image_url ? `<button class="btn btn-sm btn-ghost" onclick="Admin.slideSet(${i},'image_url','')">🗑️</button>` : ''}
            <span class="spacer"></span>
            <button class="btn btn-sm" ${i === 0 ? 'disabled' : ''} onclick="Admin.moveSlide(${i},-1)" title="${L('Move up', 'تحريك للأعلى')}">▲</button>
            <button class="btn btn-sm" ${i === S.slides.length - 1 ? 'disabled' : ''} onclick="Admin.moveSlide(${i},1)" title="${L('Move down', 'تحريك للأسفل')}">▼</button>
            <button class="btn btn-sm" onclick="Admin.copySlide(${i})" title="${L('Duplicate', 'نسخ')}">⧉</button>
            <button class="btn btn-sm btn-danger" onclick="Admin.removeSlide(${i})" title="${L('Delete', 'حذف')}">🗑️</button>
          </div>
          <div class="hint">${L('Best size: 1200 × 500 px.', 'أفضل مقاس: 1200 × 500 بكسل.')}</div>
        </div>
        <div>
          <div class="row" style="margin-bottom:10px"><b>${L('Banner', 'بانر')} ${i + 1}</b><span class="pill ${cls}">${label}</span><span class="spacer"></span>
            <label class="row" style="gap:6px;font-size:.82rem;font-weight:700">${L('Visible', 'ظاهر')}<span class="switch"><input type="checkbox" ${s.active !== false ? 'checked' : ''} onchange="Admin.slideSet(${i},'active',this.checked)"><span></span></span></label></div>
          <div class="grid g2">
            <div class="field"><label>${L('Title (Arabic)', 'العنوان (عربي)')}</label><input class="input" value="${esc(s.title || '')}" oninput="Admin.slideSet(${i},'title',this.value,true)"></div>
            <div class="field"><label>${L('Title (English)', 'العنوان (إنجليزي)')}</label><input class="input ltr" value="${esc(s.title_en || '')}" oninput="Admin.slideSet(${i},'title_en',this.value,true)"></div>
            <div class="field"><label>${L('Subtitle (Arabic)', 'النص الفرعي (عربي)')}</label><input class="input" value="${esc(s.subtitle || '')}" oninput="Admin.slideSet(${i},'subtitle',this.value,true)"></div>
            <div class="field"><label>${L('Subtitle (English)', 'النص الفرعي (إنجليزي)')}</label><input class="input ltr" value="${esc(s.subtitle_en || '')}" oninput="Admin.slideSet(${i},'subtitle_en',this.value,true)"></div>
            <div class="field"><label>${L('Small tag', 'شارة صغيرة')}</label><input class="input" value="${esc(s.badge || '')}" placeholder="🔥 ${L('Limited time', 'لفترة محدودة')}" oninput="Admin.slideSet(${i},'badge',this.value,true)"></div>
            <div class="field"><label>${L('When tapped', 'عند الضغط')}</label><select class="input" onchange="Admin.slideSet(${i},'link_type',this.value)">${linkOptions(s)}</select></div>
            ${s.link_type && s.link_type !== 'none' ? `
            ${linkValueField(s, i) ? `<div class="field"><label>${L('Target', 'الوجهة')}</label>${linkValueField(s, i)}</div>` : ''}
            <div class="field"><label>${L('Button text (Arabic)', 'نص الزر (عربي)')}</label><input class="input" value="${esc(s.button_text || '')}" placeholder="${L('Shop now', 'تسوّق الآن')}" oninput="Admin.slideSet(${i},'button_text',this.value,true)"></div>
            <div class="field"><label>${L('Button text (English)', 'نص الزر (إنجليزي)')}</label><input class="input ltr" value="${esc(s.button_text_en || '')}" placeholder="Shop now" oninput="Admin.slideSet(${i},'button_text_en',this.value,true)"></div>` : ''}
            <div class="field"><label>${L('Show from', 'يظهر من')}</label><input type="date" class="input ltr" value="${esc(s.starts_at || '')}" onchange="Admin.slideSet(${i},'starts_at',this.value)"></div>
            <div class="field"><label>${L('Until', 'حتى')}</label><input type="date" class="input ltr" value="${esc(s.ends_at || '')}" onchange="Admin.slideSet(${i},'ends_at',this.value)"></div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  function slideSet(i, k, v, soft) {
    const s = S.slides[i]; if (!s) return;
    s[k] = typeof v === 'string' ? (soft ? v : v.trim()) : v;
    dirty();
    if (soft) { const p = $('sp-' + i); if (p) p.innerHTML = slidePreviewHtml(s); }
    else renderSlides();
  }
  function slideImage(i) { pickImage(null, null, 1400, (data) => { slideSet(i, 'image_url', data); }); }
  function addSlide() {
    S.slides.push({ id: uid(), active: true, title: '', title_en: '', subtitle: '', subtitle_en: '', badge: '', image_url: '', link_type: 'none' });
    dirty(); renderSlides();
    setTimeout(() => { const all = document.querySelectorAll('.slide-ed'); const last = all[all.length - 1]; if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
  }
  function removeSlide(i) { if (!confirm(L('Delete this banner?', 'حذف هذا البانر؟'))) return; S.slides.splice(i, 1); dirty(); renderSlides(); }
  function moveSlide(i, d) { const j = i + d; if (j < 0 || j >= S.slides.length) return; const t = S.slides[i]; S.slides[i] = S.slides[j]; S.slides[j] = t; dirty(); renderSlides(); }
  function copySlide(i) { const c = JSON.parse(JSON.stringify(S.slides[i])); c.id = uid(); S.slides.splice(i + 1, 0, c); dirty(); renderSlides(); }

  // ── OFFERS ────────────────────────────────────────────────────
  const productById = (id) => S.products.find(p => String(p.id) === String(id));
  function offerState(o) {
    if (o.active === false) return ['p-muted', L('Stopped', 'متوقف')];
    const d = today();
    if (o.starts_at && o.starts_at > d) return ['p-info', L('Scheduled', 'مجدول')];
    if (o.ends_at && o.ends_at < d) return ['p-bad', L('Ended', 'انتهى')];
    const p = productById(o.product_id);
    if (p && num(o.price) >= num(p.price)) return ['p-warn', L('Not cheaper', 'ليس أرخص')];
    return ['p-ok', L('Live', 'فعّال')];
  }
  function renderOffers() {
    if (!S.offers.length) {
      $('of-list').innerHTML = `<div class="empty"><div class="big">🏷️</div>${L('No offers yet. Create one and it shows on your store with the old price crossed out.', 'لا توجد عروض بعد. أنشئ عرضاً ليظهر في متجرك مع شطب السعر القديم.')}</div>`;
      return;
    }
    $('of-list').innerHTML = `<div class="table-wrap"><table><thead><tr><th>${L('Product', 'الصنف')}</th><th class="num">${L('Price', 'السعر')}</th><th>${L('Dates', 'المدة')}</th><th>${L('Status', 'الحالة')}</th><th></th></tr></thead><tbody>${S.offers.map((o, i) => {
      const p = productById(o.product_id);
      const reg = p ? num(p.price) : num(o.regular_price);
      const pct = reg > 0 ? Math.round((1 - num(o.price) / reg) * 100) : 0;
      const [cls, label] = offerState(o);
      return `<tr>
        <td><div class="row" style="flex-wrap:nowrap">${p && p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="">` : '<div class="thumb">📦</div>'}<div><b>${esc(p ? nameOf(p) : (o.name || L('Product removed', 'صنف محذوف')))}</b>${o.label ? `<div class="order-meta">${esc(o.label)}</div>` : ''}</div></div></td>
        <td class="num"><span class="strike">${money(reg)}</span> <b style="color:var(--brand)">${money(o.price)}</b>${pct > 0 ? ` <span class="pill p-bad">−${pct}%</span>` : ''}</td>
        <td style="font-size:.8rem;color:var(--muted)">${o.starts_at || o.ends_at ? `${esc(o.starts_at || '…')} → ${esc(o.ends_at || '…')}` : L('No end date', 'بدون تاريخ انتهاء')}</td>
        <td><span class="pill ${cls}">${label}</span></td>
        <td class="num"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
          <label class="switch" title="${L('On / off', 'تشغيل / إيقاف')}"><input type="checkbox" ${o.active !== false ? 'checked' : ''} onchange="Admin.toggleOffer(${i},this.checked)"><span></span></label>
          <button class="btn btn-sm" onclick="Admin.openOfferModal(${i})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="Admin.removeOffer(${i})">🗑️</button></div></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function openOfferModal(i, productId) {
    const o = (typeof i === 'number' && S.offers[i]) ? S.offers[i] : null;
    setVal('mo-id', o ? o.id : '');
    setVal('mo-search', '');
    setVal('mo-product', o ? o.product_id : (productId || ''));
    setVal('mo-price', o ? o.price : '');
    setVal('mo-label', o ? (o.label || '') : '');
    setVal('mo-start', o ? (o.starts_at || '') : '');
    setVal('mo-end', o ? (o.ends_at || '') : '');
    $('m-offer-title').textContent = o ? L('Edit offer', 'تعديل العرض') : L('New offer', 'عرض جديد');
    offerProductChanged();
    renderOfferPicker();
    openModal('m-offer');
    if (o && val('mo-price')) offerFromPrice();
  }
  function renderOfferPicker() {
    const q = val('mo-search').toLowerCase();
    const sel = val('mo-product');
    let list = S.products.filter(p => isShown(p));
    if (q) list = list.filter(p => [p.name, p.name_ar, p.name_en, p.barcode].some(x => String(x || '').toLowerCase().includes(q)));
    else if (sel) list = list.filter(p => String(p.id) === sel).concat(list.filter(p => String(p.id) !== sel));
    list = list.slice(0, 40);
    $('mo-picker').innerHTML = list.length ? list.map(p => `<div onclick="Admin.pickOfferProduct('${esc(p.id)}')" style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:10px;cursor:pointer;${String(p.id) === sel ? 'background:color-mix(in srgb,var(--brand) 12%,transparent);font-weight:800' : ''}">
      ${p.image_url ? `<img class="thumb" style="width:34px;height:34px" src="${esc(p.image_url)}" alt="">` : '<div class="thumb" style="width:34px;height:34px">📦</div>'}<span style="flex:1">${esc(nameOf(p))}</span><span class="num">${money(p.price)}</span></div>`).join('')
      : `<div class="hint" style="padding:8px">${L('No product found', 'لم يتم العثور على صنف')}</div>`;
  }
  function pickOfferProduct(id) { setVal('mo-product', id); offerProductChanged(); renderOfferPicker(); offerFromPct(); }
  function offerProductChanged() { const p = productById(val('mo-product')); setVal('mo-regular', p ? money(p.price) : ''); }
  function offerFromPct() {
    const p = productById(val('mo-product')); const pct = num(val('mo-pct'));
    if (p && pct > 0 && pct < 100) setVal('mo-price', (num(p.price) * (1 - pct / 100)).toFixed(2));
  }
  function offerFromPrice() {
    const p = productById(val('mo-product')); const pr = num(val('mo-price'), NaN);
    if (p && isFinite(pr) && num(p.price) > 0) setVal('mo-pct', Math.max(0, Math.round((1 - pr / num(p.price)) * 100)) || '');
  }
  async function saveOffer() {
    const pid = val('mo-product'); const p = productById(pid);
    const price = num(val('mo-price'), NaN);
    if (!p) { toast(L('Choose a product', 'اختر صنفاً'), 'err'); return; }
    if (!isFinite(price) || price < 0) { toast(L('Enter the offer price', 'أدخل سعر العرض'), 'err'); return; }
    if (price >= num(p.price)) { toast(L('The offer price must be lower than the regular price.', 'سعر العرض يجب أن يكون أقل من السعر العادي.'), 'err'); return; }
    const st = val('mo-start'), en = val('mo-end');
    if (st && en && en < st) { toast(L('The end date is before the start date.', 'تاريخ الانتهاء قبل تاريخ البدء.'), 'err'); return; }
    const id = val('mo-id');
    const rec = { id: id || uid(), product_id: p.id, name: nameOf(p), regular_price: num(p.price), price: Math.round(price * 100) / 100, label: val('mo-label'), starts_at: st, ends_at: en, active: true };
    const dup = S.offers.findIndex(o => String(o.product_id) === String(p.id) && o.id !== rec.id);
    if (dup >= 0) { if (!confirm(L('This product already has an offer. Replace it?', 'هذا الصنف عليه عرض. استبداله؟'))) return; S.offers.splice(dup, 1); }
    const idx = S.offers.findIndex(o => o.id === rec.id);
    if (idx >= 0) S.offers[idx] = Object.assign({}, S.offers[idx], rec); else S.offers.unshift(rec);
    closeModal('m-offer');
    renderOffers();
    if (await save()) renderOffers();
  }
  async function toggleOffer(i, on) { if (!S.offers[i]) return; S.offers[i].active = !!on; renderOffers(); await save(); }
  async function removeOffer(i) { if (!confirm(L('Delete this offer?', 'حذف هذا العرض؟'))) return; S.offers.splice(i, 1); renderOffers(); await save(); }

  // ── PRODUCTS ──────────────────────────────────────────────────
  function activeOfferFor(pid) {
    const d = today();
    return S.offers.find(o => String(o.product_id) === String(pid) && o.active !== false && (!o.starts_at || o.starts_at <= d) && (!o.ends_at || o.ends_at >= d));
  }
  function renderProducts() {
    const catSel = $('pr-cat');
    const curCat = catSel.value;
    catSel.innerHTML = `<option value="">${L('All categories', 'كل الأقسام')}</option>` + S.categories.map(c => `<option value="${esc(c.id)}">${esc(nameOf(c))}</option>`).join('');
    catSel.value = curCat;
    $('pr-local-note').innerHTML = S.local ? `<div class="notice n-info">ℹ️ <span>${L('Products, prices, stock and pictures come from your POS and update here within a minute. Here you choose which products customers see, and put products on offer.', 'الأصناف والأسعار والمخزون والصور تأتي من برنامج الكاشير وتتحدث هنا خلال دقيقة. من هنا تختار الأصناف التي يراها الزبون وتضع عروضاً عليها.')}</span></div>` : '';
    const q = val('pr-search').toLowerCase(), f = val('pr-filter') || 'all';
    let list = S.products.slice();
    if (curCat) list = list.filter(p => String(p.category_id) === String(curCat));
    if (q) list = list.filter(p => [p.name, p.name_ar, p.name_en, p.barcode].some(x => String(x || '').toLowerCase().includes(q)));
    if (f === 'noimg') list = list.filter(p => !p.image_url);
    if (f === 'low') list = list.filter(p => num(p.stock_quantity ?? p.stock) <= 5);
    if (f === 'hidden') list = list.filter(p => !isShown(p));
    if (f === 'shown') list = list.filter(p => isShown(p));
    if (f === 'offer') list = list.filter(p => activeOfferFor(p.id));
    list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    const total = list.length;
    S.listedIds = list.map(p => String(p.id));
    list = list.slice(0, 300);
    if (!total) { $('pr-list').innerHTML = `<div class="card empty"><div class="big">📦</div>${S.products.length ? L('No product matches.', 'لا يوجد صنف مطابق.') : L('No products yet.', 'لا توجد أصناف بعد.')}</div>`; return; }
    const catName = (id) => { const c = S.categories.find(x => String(x.id) === String(id)); return c ? nameOf(c) : '—'; };
    const shownCount = S.products.filter(isShown).length;
    S.selected = new Set([...(S.selected || [])].filter(id => S.listedIds.includes(id)));
    const nSel = S.selected.size;
    $('pr-list').innerHTML = `
      <div class="row" style="margin-bottom:8px">
        <span class="hint" style="margin:0">${L(`${total} product(s) listed · ${shownCount} of ${S.products.length} shown in your store`, `${total} صنف في القائمة · ${shownCount} من ${S.products.length} ظاهر في متجرك`)}${total > 300 ? L(' — showing the first 300, search to narrow down', ' — يظهر أول 300، استخدم البحث') : ''}</span>
        <span class="spacer"></span>
        ${nSel ? `<b style="font-size:.84rem">${L(`${nSel} selected`, `${nSel} محدد`)}</b>
          <button class="btn btn-sm btn-ok" onclick="Admin.setSelectedVisible(true)">👁️ ${L('Show selected', 'إظهار المحدد')}</button>
          <button class="btn btn-sm" onclick="Admin.setSelectedVisible(false)">🚫 ${L('Hide selected', 'إخفاء المحدد')}</button>
          <button class="btn btn-sm btn-ghost" onclick="Admin.clearSelection()">✕</button>`
        : `<button class="btn btn-sm" onclick="Admin.setListedVisible(true)">👁️ ${L(`Show all ${total} listed`, `إظهار كل الـ ${total}`)}</button>
          <button class="btn btn-sm" onclick="Admin.setListedVisible(false)">🚫 ${L(`Hide all ${total} listed`, `إخفاء كل الـ ${total}`)}</button>`}
      </div>
      <div class="table-wrap"><table><thead><tr><th style="width:34px"><input type="checkbox" title="${L('Select all listed', 'تحديد الكل')}" ${nSel && nSel === Math.min(total, 300) ? 'checked' : ''} onchange="Admin.selectAllListed(this.checked)"></th><th></th><th>${L('Product', 'الصنف')}</th><th>${L('Category', 'القسم')}</th><th class="num">${L('Price', 'السعر')}</th><th class="num">${L('Stock', 'المخزون')}</th><th>${L('In store', 'في المتجر')}</th><th></th></tr></thead><tbody>${list.map(p => {
        const off = activeOfferFor(p.id), stock = num(p.stock_quantity ?? p.stock);
        const own = shownSelf(p), catHidden = S.hiddenCats.has(String(p.category_id));
        return `<tr style="${isShown(p) ? '' : 'opacity:.6'}">
          <td><input type="checkbox" ${S.selected.has(String(p.id)) ? 'checked' : ''} onchange="Admin.toggleSelect('${esc(p.id)}',this.checked)"></td>
          <td style="width:56px">${p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="" loading="lazy">` : '<div class="thumb">📦</div>'}</td>
          <td><b>${esc(nameOf(p))}</b>${p.barcode ? `<div class="order-meta ltr">${esc(p.barcode)}</div>` : ''}</td>
          <td style="color:var(--muted)">${esc(catName(p.category_id))}</td>
          <td class="num">${off ? `<span class="strike">${money(p.price)}</span> <b style="color:var(--brand)">${money(off.price)}</b>` : `<b>${money(p.price)}</b>`}</td>
          <td class="num" style="font-weight:800;color:${stock <= 0 ? 'var(--bad)' : (stock <= 5 ? 'var(--warn)' : 'var(--ok)')}">${stock}</td>
          <td><div class="row" style="flex-wrap:nowrap;gap:6px"><label class="switch" title="${L('Show in the online store', 'إظهار في المتجر')}"><input type="checkbox" ${own ? 'checked' : ''} onchange="Admin.setProductsVisible(['${esc(p.id)}'],this.checked)"><span></span></label>
            ${catHidden ? `<span class="pill p-warn" title="${L('Its category is hidden', 'قسمه مخفي')}">${L('Category hidden', 'القسم مخفي')}</span>` : ''}</div></td>
          <td class="num"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
            <button class="btn btn-sm" onclick="Admin.offerForProduct('${esc(p.id)}')">🏷️ ${off ? L('Offer', 'العرض') : L('Put on offer', 'عرض')}</button>
            ${S.local ? '' : `<button class="btn btn-sm" onclick="Admin.openProductModal('${esc(p.id)}')">✏️</button>`}</div></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  }

  // ── What customers see: products and categories the owner shows or hides ──
  // Kept in the store settings (product_visibility / hidden_categories) so a POS catalogue sync
  // never undoes them. In the cloud the product's own "published" flag is kept in step too.
  function shownSelf(p) { const v = S.vis[String(p.id)]; return typeof v === 'boolean' ? v : p.is_published !== false; }
  function isShown(p) { return shownSelf(p) && !S.hiddenCats.has(String(p.category_id)); }
  function toggleSelect(id, on) { S.selected = S.selected || new Set(); if (on) S.selected.add(String(id)); else S.selected.delete(String(id)); renderProducts(); }
  function selectAllListed(on) { S.selected = new Set(on ? S.listedIds.slice(0, 300) : []); renderProducts(); }
  function clearSelection() { S.selected = new Set(); renderProducts(); }
  async function setProductsVisible(ids, on) {
    ids = ids.map(String);
    if (!ids.length) return;
    const prev = {};
    ids.forEach(id => { prev[id] = S.vis[id]; S.vis[id] = !!on; });
    renderProducts();
    try {
      if (!S.local) {
        for (let i = 0; i < ids.length; i += 80) {
          const chunk = ids.slice(i, i + 80).map(id => '"' + id.replace(/"/g, '') + '"').join(',');
          await api('/rest/v1/products?id=in.(' + encodeURIComponent(chunk) + ')', { method: 'PATCH', body: JSON.stringify({ is_published: !!on, updated_at: new Date().toISOString() }) });
        }
        S.products.forEach(p => { if (ids.includes(String(p.id))) p.is_published = !!on; });
      }
      await writeTenant(null, { product_visibility: S.vis });
      S.banner.product_visibility = Object.assign({}, S.vis);
      if (ids.length > 1) toast(on ? L(`${ids.length} products shown in the store`, `تم إظهار ${ids.length} صنف في المتجر`) : L(`${ids.length} products hidden from the store`, `تم إخفاء ${ids.length} صنف من المتجر`), 'ok');
      else toast(on ? L('Shown in the store', 'ظاهر في المتجر') : L('Hidden from the store', 'مخفي من المتجر'), 'ok');
    } catch (e) {
      ids.forEach(id => { if (prev[id] === undefined) delete S.vis[id]; else S.vis[id] = prev[id]; });
      renderProducts();
      toast(L('Not saved: ', 'لم يتم الحفظ: ') + e.message, 'err');
    }
  }
  async function setSelectedVisible(on) { const ids = [...(S.selected || [])]; S.selected = new Set(); await setProductsVisible(ids, on); }
  async function setListedVisible(on) {
    const ids = S.listedIds || [];
    if (ids.length > 1 && !confirm(on ? L(`Show all ${ids.length} listed products in the store?`, `إظهار كل الأصناف المعروضة (${ids.length}) في المتجر؟`) : L(`Hide all ${ids.length} listed products from the store?`, `إخفاء كل الأصناف المعروضة (${ids.length}) من المتجر؟`))) return;
    await setProductsVisible(ids, on);
  }
  async function setCategoryVisible(id, on) {
    id = String(id);
    const had = S.hiddenCats.has(id);
    if (on) S.hiddenCats.delete(id); else S.hiddenCats.add(id);
    renderCategories();
    try {
      await writeTenant(null, { hidden_categories: [...S.hiddenCats] });
      S.banner.hidden_categories = [...S.hiddenCats];
      toast(on ? L('Category shown in the store', 'القسم ظاهر في المتجر') : L('Category and its products hidden from the store', 'تم إخفاء القسم وأصنافه من المتجر'), 'ok');
    } catch (e) {
      if (had) S.hiddenCats.add(id); else S.hiddenCats.delete(id);
      renderCategories();
      toast(L('Not saved: ', 'لم يتم الحفظ: ') + e.message, 'err');
    }
  }
  function manageCategoryProducts(catId) {
    go('products');
    setVal('pr-search', ''); setVal('pr-filter', 'all');
    $('pr-cat').value = String(catId);
    S.selected = new Set();
    renderProducts();
  }
  function offerForProduct(pid) {
    const i = S.offers.findIndex(o => String(o.product_id) === String(pid));
    go('offers');
    openOfferModal(i >= 0 ? i : undefined, pid);
  }
  function fillCatSelect(id, cur) {
    $(id).innerHTML = `<option value="">${L('— No category —', '— بدون قسم —')}</option>` + S.categories.map(c => `<option value="${esc(c.id)}" ${String(c.id) === String(cur) ? 'selected' : ''}>${esc(nameOf(c))}</option>`).join('');
  }
  function openProductModal(id) {
    const p = id ? productById(id) : null;
    setVal('mp-id', p ? p.id : '');
    setVal('mp-name-ar', p ? (p.name_ar || p.name || '') : '');
    setVal('mp-name-en', p ? (p.name_en || '') : '');
    fillCatSelect('mp-cat', p ? p.category_id : '');
    setVal('mp-price', p ? num(p.price) : '');
    setVal('mp-stock', p ? num(p.stock_quantity) : 10);
    setVal('mp-barcode', p ? (p.barcode || '') : '');
    setVal('mp-img', p ? (p.image_url || '') : ''); syncPreview('mp-img', 'mp-img-prev');
    setVal('mp-desc', p ? (p.description || p.description_ar || '') : '');
    setChecked('mp-pub', p ? shownSelf(p) : true);
    $('mp-delete').classList.toggle('hidden', !p);
    $('m-product-title').textContent = p ? L('Edit product', 'تعديل الصنف') : L('New product', 'صنف جديد');
    openModal('m-product');
  }
  async function saveProduct() {
    const id = val('mp-id');
    const nameAr = val('mp-name-ar'), nameEn = val('mp-name-en');
    const price = num(val('mp-price'), NaN);
    if (!nameAr && !nameEn) { toast(L('Enter the product name', 'أدخل اسم الصنف'), 'err'); return; }
    if (!isFinite(price) || price < 0) { toast(L('Enter a valid price', 'أدخل سعراً صحيحاً'), 'err'); return; }
    const body = {
      name: nameAr || nameEn, name_ar: nameAr || nameEn, name_en: nameEn || nameAr,
      category_id: val('mp-cat') || null, price, stock_quantity: Math.round(num(val('mp-stock'))),
      barcode: val('mp-barcode') || null, image_url: val('mp-img') || null,
      description: val('mp-desc'), description_ar: val('mp-desc'), is_published: checked('mp-pub'), updated_at: new Date().toISOString()
    };
    const btn = $('mp-save'); btn.disabled = true;
    try {
      let pid = id;
      if (id) await api('/rest/v1/products?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(body) });
      else { const cr = await api('/rest/v1/products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(Object.assign({ shop_id: S.tenant.id, track_inventory: true }, body)) }); pid = cr && cr[0] && cr[0].id; }
      if (pid && typeof S.vis[String(pid)] === 'boolean' && S.vis[String(pid)] !== body.is_published) {
        S.vis[String(pid)] = body.is_published;
        await writeTenant(null, { product_visibility: S.vis });
      }
      closeModal('m-product');
      S.products = await loadAllCloudProducts();
      renderProducts();
      toast(L('Product saved', 'تم حفظ الصنف'), 'ok');
    } catch (e) { toast(L('Not saved: ', 'لم يتم الحفظ: ') + e.message, 'err'); }
    finally { btn.disabled = false; }
  }
  async function deleteProduct() {
    const id = val('mp-id'); if (!id) return;
    if (!confirm(L('Delete this product from the online store?', 'حذف هذا الصنف من المتجر الإلكتروني؟'))) return;
    try {
      await api('/rest/v1/products?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
      closeModal('m-product');
      S.products = S.products.filter(p => String(p.id) !== String(id));
      const before = S.offers.length;
      S.offers = S.offers.filter(o => String(o.product_id) !== String(id));
      if (S.offers.length !== before) await save();
      renderProducts();
      toast(L('Product deleted', 'تم حذف الصنف'), 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  // ── CATEGORIES ────────────────────────────────────────────────
  function renderCategories() {
    $('ct-local-note').innerHTML = S.local ? `<div class="notice n-info">ℹ️ <span>${L('Category names come from your POS. Here you choose which categories customers see and their cover picture.', 'أسماء الأقسام تأتي من برنامج الكاشير. من هنا تختار الأقسام التي يراها الزبون وصورة غلافها.')}</span></div>` : '';
    if (!S.categories.length) { $('ct-list').innerHTML = `<div class="card empty"><div class="big">🗂️</div>${L('No categories yet.', 'لا توجد أقسام بعد.')}</div>`; return; }
    $('ct-list').innerHTML = `<div class="grid g4">${S.categories.map(c => {
      const img = S.catImages[c.id] || c.image_url;
      const prods = S.products.filter(p => String(p.category_id) === String(c.id));
      const shown = prods.filter(shownSelf).length;
      const hidden = S.hiddenCats.has(String(c.id));
      return `<div class="card" style="padding:0;overflow:hidden;margin:0;${hidden ? 'opacity:.6' : ''}">
        <div onclick="Admin.openCategoryModal('${esc(c.id)}')" style="cursor:pointer;height:110px;background:${img ? `url('${String(img).replace(/'/g, '%27')}') center/cover` : 'var(--surface-2)'};display:flex;align-items:center;justify-content:center;font-size:2rem;position:relative">${img ? '' : '🗂️'}${hidden ? `<span class="pill p-bad" style="position:absolute;top:8px;inset-inline-start:8px">${L('Hidden', 'مخفي')}</span>` : ''}</div>
        <div style="padding:10px 12px">
          <div class="row" style="flex-wrap:nowrap"><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nameOf(c))}</b>
            <label class="switch" title="${L('Show in the online store', 'إظهار في المتجر')}"><input type="checkbox" ${hidden ? '' : 'checked'} onchange="Admin.setCategoryVisible('${esc(c.id)}',this.checked)"><span></span></label></div>
          <div class="order-meta">${prods.length ? L(`${shown} of ${prods.length} products shown`, `${shown} من ${prods.length} صنف ظاهر`) : L('Empty — not shown to customers', 'فارغ — لا يظهر للزبائن')}${img ? '' : ' · ' + L('no cover', 'بدون غلاف')}</div>
          <div class="row" style="margin-top:8px;gap:6px">
            <button class="btn btn-sm" onclick="Admin.openCategoryModal('${esc(c.id)}')">🖼️ ${L('Cover', 'الغلاف')}</button>
            <button class="btn btn-sm" onclick="Admin.manageCategoryProducts('${esc(c.id)}')">📦 ${L('Products', 'الأصناف')}</button>
          </div>
        </div></div>`;
    }).join('')}</div>`;
  }
  function openCategoryModal(id) {
    const c = id ? S.categories.find(x => String(x.id) === String(id)) : null;
    setVal('mc-id', c ? c.id : '');
    setVal('mc-name-ar', c ? (c.name_ar || c.name || '') : '');
    setVal('mc-name-en', c ? (c.name_en || '') : '');
    setVal('mc-img', c ? (S.catImages[c.id] || c.image_url || '') : ''); syncPreview('mc-img', 'mc-img-prev');
    $('mc-name-ar').readOnly = S.local; $('mc-name-en').readOnly = S.local;
    $('mc-delete').classList.toggle('hidden', !c || S.local);
    $('m-category-title').textContent = c ? (S.local ? L('Category cover', 'غلاف القسم') : L('Edit category', 'تعديل القسم')) : L('New category', 'قسم جديد');
    openModal('m-category');
  }
  async function saveCategory() {
    const id = val('mc-id'), nameAr = val('mc-name-ar'), nameEn = val('mc-name-en'), img = val('mc-img');
    if (!S.local && !nameAr && !nameEn) { toast(L('Enter the category name', 'أدخل اسم القسم'), 'err'); return; }
    const btn = $('mc-save'); btn.disabled = true;
    try {
      let catId = id;
      if (!S.local) {
        const body = { name: nameAr || nameEn, name_ar: nameAr || nameEn, name_en: nameEn || nameAr };
        if (id) await api('/rest/v1/categories?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(body) });
        else {
          const slug = (nameEn || nameAr).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
          const created = await api('/rest/v1/categories', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(Object.assign({ shop_id: S.tenant.id, slug: slug + '-' + uid().slice(0, 4), is_active: true, display_order: S.categories.length }, body)) });
          catId = created && created[0] && created[0].id;
        }
      }
      if (catId) { if (img) S.catImages[catId] = img; else delete S.catImages[catId]; }
      await writeTenant(null, { category_images: S.catImages });
      S.banner.category_images = Object.assign({}, S.catImages);
      closeModal('m-category');
      if (!S.local) S.categories = await StorefrontAPI.fetchCategories(S.tenant.id);
      renderCategories();
      toast(L('Category saved', 'تم حفظ القسم'), 'ok');
    } catch (e) { toast(L('Not saved: ', 'لم يتم الحفظ: ') + e.message, 'err'); }
    finally { btn.disabled = false; }
  }
  async function deleteCategory() {
    const id = val('mc-id'); if (!id || S.local) return;
    if (!confirm(L('Delete this category? Its products stay, without a category.', 'حذف هذا القسم؟ تبقى أصنافه بدون قسم.'))) return;
    try {
      await api('/rest/v1/categories?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
      delete S.catImages[id];
      await writeTenant(null, { category_images: S.catImages });
      closeModal('m-category');
      S.categories = S.categories.filter(c => String(c.id) !== String(id));
      renderCategories();
      toast(L('Category deleted', 'تم حذف القسم'), 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }

  // ── DELIVERY ──────────────────────────────────────────────────
  const DAYS = [['Sunday', 'الأحد'], ['Monday', 'الاثنين'], ['Tuesday', 'الثلاثاء'], ['Wednesday', 'الأربعاء'], ['Thursday', 'الخميس'], ['Friday', 'الجمعة'], ['Saturday', 'السبت']];
  function defaultHours() { const days = {}; for (let i = 0; i < 7; i++) days[i] = { open: '09:00', close: '22:00', closed: false }; return { enabled: false, tz: 'Asia/Beirut', days }; }
  function renderZones() {
    const box = $('dl-zones');
    if (!S.zones.length) { box.innerHTML = `<div class="hint" style="padding:4px 0 8px">${L('No delivery areas — the delivery fee above applies to everyone.', 'لا توجد مناطق — تُطبّق أجرة التوصيل أعلاه على الجميع.')}</div>`; return; }
    box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>${L('Area', 'المنطقة')}</th><th>${L('Fee ($)', 'الأجرة ($)')}</th><th>${L('Minimum ($)', 'الحد الأدنى ($)')}</th><th></th></tr></thead><tbody>${S.zones.map((z, i) => `<tr>
      <td><input class="input" value="${esc(z.name)}" placeholder="${L('e.g. Hamra', 'مثال: الحمرا')}" oninput="Admin.setZone(${i},'name',this.value)"></td>
      <td style="width:130px"><input class="input ltr" type="number" step="0.25" min="0" value="${esc(z.fee)}" oninput="Admin.setZone(${i},'fee',this.value)"></td>
      <td style="width:130px"><input class="input ltr" type="number" step="0.5" min="0" value="${esc(z.min)}" oninput="Admin.setZone(${i},'min',this.value)"></td>
      <td style="width:50px"><button class="btn btn-sm btn-danger" onclick="Admin.removeZone(${i})">🗑️</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function addZone() { S.zones.push({ name: '', fee: '', min: '' }); dirty(); renderZones(); }
  function setZone(i, k, v) { if (S.zones[i]) { S.zones[i][k] = v; dirty(); } }
  function removeZone(i) { S.zones.splice(i, 1); dirty(); renderZones(); }
  function renderHours() {
    if (!S.hours || !S.hours.days) S.hours = defaultHours();
    const on = checked('dl-hours-on');
    S.hours.enabled = on;
    const box = $('dl-hours');
    box.style.opacity = on ? '1' : '.5';
    box.innerHTML = DAYS.map(([en, ar], i) => {
      const d = S.hours.days[i] || S.hours.days[String(i)] || { open: '09:00', close: '22:00', closed: false };
      return `<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line);flex-wrap:nowrap">
        <b style="width:110px;font-size:.88rem">${L(en, ar)}</b>
        <label class="row" style="gap:6px;font-size:.82rem;width:110px;flex-wrap:nowrap"><span class="switch"><input type="checkbox" ${d.closed ? '' : 'checked'} ${on ? '' : 'disabled'} onchange="Admin.setDay(${i},'closed',!this.checked)"><span></span></span>${d.closed ? L('Closed', 'مغلق') : L('Open', 'مفتوح')}</label>
        <input class="input ltr" type="time" style="max-width:130px" value="${esc(d.open)}" ${d.closed || !on ? 'disabled' : ''} onchange="Admin.setDay(${i},'open',this.value)">
        <span style="color:var(--muted)">→</span>
        <input class="input ltr" type="time" style="max-width:130px" value="${esc(d.close)}" ${d.closed || !on ? 'disabled' : ''} onchange="Admin.setDay(${i},'close',this.value)">
      </div>`;
    }).join('') + `<div class="hint">${L('A closing time after midnight (e.g. 18:00 → 02:00) counts for the same day. Same open and close time = open all day.', 'وقت إغلاق بعد منتصف الليل (مثلاً 18:00 ← 02:00) يُحسب لليوم نفسه. نفس وقت الفتح والإغلاق = مفتوح طوال اليوم.')}</div>`;
  }
  function setDay(i, k, v) { if (!S.hours) S.hours = defaultHours(); S.hours.days[i] = Object.assign({}, S.hours.days[i] || {}, { [k]: v }); dirty(); if (k === 'closed') renderHours(); }

  // ── REPORTS ───────────────────────────────────────────────────
  function renderReports() {
    if (!S.tenant) return;
    const period = val('rp-period') || 'month', source = val('rp-source') || 'online';
    const now = new Date();
    const inPeriod = (o) => {
      const d = new Date(o.created_at || 0);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') return now - d <= 7 * 864e5;
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    };
    let list = S.orders.filter(o => o.order_status !== 'cancelled' && inPeriod(o));
    if (source === 'online') list = list.filter(isOnline);
    else if (source === 'pos') list = list.filter(isPosSale);
    else list = list.filter(o => isPosSale(o) || !(o.pos_synced || o.pos_invoice_ref)); // a converted online order is already in the POS sales
    const sales = list.reduce((s, o) => s + num(o.total), 0);
    const rate = num(S.tenant.currency_lbp_rate, 89500);
    const costOfP = new Map(S.products.map(p => [String(p.id), num(p.cost_price, NaN)]));
    let cost = 0, costKnown = 0;
    list.forEach(o => {
      const n = notesOf(o);
      if (n.cost != null && isFinite(num(n.cost, NaN))) { cost += num(n.cost); costKnown++; return; }
      let c = 0, ok = true;
      itemsOf(o).forEach(it => { const pc = costOfP.get(String(it.product_id)); if (isFinite(pc) && pc > 0) c += pc * num(it.quantity || it.qty, 1); else ok = false; });
      if (ok && itemsOf(o).length) { cost += c; costKnown++; }
    });
    $('rp-sales').textContent = money(sales);
    $('rp-sales-lbp').textContent = '≈ ' + Math.round(sales * rate).toLocaleString() + ' ' + L('LBP', 'ل.ل');
    $('rp-count').textContent = list.length;
    $('rp-count-sub').textContent = source === 'pos' ? L('shop sales', 'مبيعات المحل') : L(`${list.filter(o => o.order_status === 'completed').length} completed`, `${list.filter(o => o.order_status === 'completed').length} مكتمل`);
    $('rp-avg').textContent = money(list.length ? sales / list.length : 0);
    if (costKnown && costKnown === list.length) { $('rp-profit').textContent = money(sales - cost); $('rp-profit-sub').textContent = L('sales − cost of goods', 'المبيعات − كلفة البضاعة'); }
    else if (costKnown) { $('rp-profit').textContent = '≈ ' + money(sales - cost); $('rp-profit-sub').textContent = L(`cost known for ${costKnown}/${list.length} orders`, `الكلفة معروفة لـ ${costKnown}/${list.length} طلب`); }
    else { $('rp-profit').textContent = '—'; $('rp-profit-sub').textContent = L('no cost prices yet', 'لا توجد أسعار كلفة'); }

    const boxes = Array.isArray(S.banner.pos_cashboxes) ? S.banner.pos_cashboxes : [];
    $('rp-drawers-card').classList.toggle('hidden', !boxes.length);
    $('rp-drawers').innerHTML = boxes.map(b => `<div class="kpi" style="box-shadow:none"><div class="k-lbl">🏬 ${esc(b.branch_name || b.name || b.branch_id || '')} <span class="pill ${b.status === 'open' ? 'p-ok' : 'p-muted'}">${b.status === 'open' ? L('Open', 'مفتوح') : L('Closed', 'مغلق')}</span></div>
      <div class="k-val">${money(b.balance_usd ?? b.current_balance)}</div><div class="k-sub">${esc(b.cashier_name || '')}${b.last_updated ? ' · ' + fmtTime(b.last_updated) : ''}</div></div>`).join('');

    const agg = {};
    list.forEach(o => itemsOf(o).forEach(it => {
      const p = it.product_id != null ? productById(it.product_id) : null;
      const k = p ? 'id:' + p.id : (it.product_name || it.name || it.item_name || '—');
      agg[k] = agg[k] || { q: 0, r: 0, name: p ? nameOf(p) : k };
      const q = num(it.quantity || it.qty, 1);
      agg[k].q += q; agg[k].r += num(it.total_price) || num(it.unit_price || it.price) * q;
    }));
    const top = Object.values(agg).sort((a, b) => b.q - a.q).slice(0, 10);
    $('rp-top').innerHTML = top.length ? `<div class="table-wrap"><table><thead><tr><th>${L('Product', 'الصنف')}</th><th class="num">${L('Qty', 'الكمية')}</th><th class="num">${L('Sales', 'المبيعات')}</th></tr></thead><tbody>${top.map(v => `<tr><td>${esc(v.name)}</td><td class="num"><b>${v.q}</b></td><td class="num">${money(v.r)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${L('No sales in this period.', 'لا توجد مبيعات في هذه الفترة.')}</div>`;

    const low = S.products.filter(p => p.is_published !== false && num(p.stock_quantity ?? p.stock) <= 5).sort((a, b) => num(a.stock_quantity ?? a.stock) - num(b.stock_quantity ?? b.stock)).slice(0, 12);
    $('rp-low').innerHTML = low.length ? `<div class="table-wrap"><table><thead><tr><th>${L('Product', 'الصنف')}</th><th class="num">${L('Left', 'المتبقي')}</th></tr></thead><tbody>${low.map(p => { const s = num(p.stock_quantity ?? p.stock); return `<tr><td>${esc(nameOf(p))}</td><td class="num"><span class="pill ${s <= 0 ? 'p-bad' : 'p-warn'}">${s <= 0 ? L('Out', 'نفد') : s}</span></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">✅ ${L('All products have enough stock.', 'كل الأصناف متوفرة بكمية كافية.')}</div>`;
  }

  // ── SECURITY ──────────────────────────────────────────────────
  function renderSecurity() {
    $('sc-default-warn').innerHTML = (!S.local && !S.banner.admin_password) ? `<div class="notice n-warn">⚠️ <span>${L('You are using the default password (1234). Set your own now.', 'تستخدم كلمة المرور الافتراضية (1234). ضع كلمة مرور خاصة بك الآن.')}</span></div>` : '';
  }
  async function changePassword() {
    const a = val('sc-new'), b = val('sc-new2');
    if (a.length < 6) { toast(L('Use at least 6 characters.', 'استخدم 6 أحرف على الأقل.'), 'err'); return; }
    if (a !== b) { toast(L('The two passwords are different.', 'كلمتا المرور غير متطابقتين.'), 'err'); return; }
    if (a === '1234' || a === '123456') { toast(L('That password is too easy to guess.', 'كلمة المرور هذه سهلة التخمين.'), 'err'); return; }
    try {
      await writeTenant(null, { admin_password: a });
      S.banner.admin_password = a;
      setVal('sc-new', ''); setVal('sc-new2', '');
      renderSecurity();
      toast(L('✅ Password changed. Use it next time you sign in.', '✅ تم تغيير كلمة المرور. استخدمها عند الدخول المرة القادمة.'), 'ok');
    } catch (e) { toast(L('Not changed: ', 'لم يتم التغيير: ') + e.message, 'err'); }
  }

  // ── start ─────────────────────────────────────────────────────
  async function init() {
    applyTheme(localStorage.getItem('rs_admin_theme') || '');
    applyLang();
    const slug = getSlug();
    setVal('login-slug', slug);
    window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    const s = getSession();
    if (s && s.slug && (!slug || s.slug === slug)) {
      try { await enter(); return; } catch (e) { setSession(null); }
    }
    $('login').classList.remove('hidden');
    if (slug) previewLoginShop();
    setTimeout(() => { const p = $('login-pwd'); if (p) p.focus(); }, 50);
  }

  return {
    init, login, logout, togglePwd, previewLoginShop, toggleLang, toggleTheme, toggleMenu, go,
    dirty, discard, save, setColor, syncPreview, clearImage, pickImage,
    copyLink, shareWhatsApp, openManagerApp, closeModal,
    loadOrders, renderOrders, setFilter, toggleOrder, openOrder, setStatus, waCustomer, printOrder, saveSoundPref,
    addSlide, slideSet, slideImage, removeSlide, moveSlide, copySlide,
    openOfferModal, renderOfferPicker, pickOfferProduct, offerFromPct, offerFromPrice, saveOffer, toggleOffer, removeOffer,
    renderProducts, offerForProduct, openProductModal, saveProduct, deleteProduct,
    setProductsVisible, setSelectedVisible, setListedVisible, setCategoryVisible, toggleSelect, selectAllListed, clearSelection, manageCategoryProducts,
    openCategoryModal, saveCategory, deleteCategory,
    addZone, setZone, removeZone, renderHours, setDay,
    renderReports, changePassword
  };
})();

window.Admin = Admin;
document.addEventListener('DOMContentLoaded', () => Admin.init());
