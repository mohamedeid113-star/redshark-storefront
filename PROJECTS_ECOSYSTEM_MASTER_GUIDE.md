# Red Shark Ecosystem — Master Reference Guide & Project Registry
> **Last Updated:** October 2026 | **Version:** 1.0.0
> **Purpose:** Central architectural registry and quick reference for the 4 Red Shark ecosystem projects. Whenever you want to work on a specific project, simply mention its **Project Tag / Name** from the table below.

---

## 🧭 Project Index & Quick Reference Keywords

| # | Project Name | Recommended Chat Tag / Keyword | Primary Workspace Path | Live URL / Target |
|---|--------------|--------------------------------|------------------------|-------------------|
| **1** | **Red Shark POS Software** | `[POS]` or `POS Software` | `D:\GravityProject\POSSoftware` | `http://localhost:3000` (Local Desktop) |
| **2** | **Trial Demo System** | `[Trial]` or `Trial Demo` | `D:\GravityProject\POSSoftware\dist\RedSharkPOS_Client_Release` | `https://demo.redsharkpos.com` / Standalone Client Package |
| **3** | **Corporate Website** | `[Website]` or `redshark-ai.com` | `D:\GravityProject\POSSoftware\website_index.html` | `https://redshark-ai.com/` |
| **4** | **Online Storefront & App** | `[Storefront]` or `Online Shop` / `Store App` | `D:\GravityProject\RedSharkStorefront` | `https://shop.redshark-ai.com/?shop=shop101` (Cloudflare Pages) |

---

## 1. Project: Red Shark POS Software `[POS]`

### 📌 Overview
The core offline-first desktop Point of Sale (POS) application designed for supermarkets, grocery stores, pharmacies, restaurants, and retail stores.

- **Workspace Path:** `D:\GravityProject\POSSoftware`
- **Port / Server:** Node.js backend on `http://127.0.0.1:3000` (served via `server.js`).
- **Runtime:** Browser / Desktop Webview / Chrome App mode (`Setup_Desktop_And_Autostart.bat`).

### 🛠️ Technology Stack
- **Frontend:** Vanilla HTML5, CSS3, ES6+ Modular JavaScript.
- **Local Database:** IndexedDB with Dexie.js (Stores: `items`, `sales`, `customers`, `settings`, `categories`, `shifts`, `invoices`, `repairs`).
- **Backend:** Node.js `server.js` with Express/HTTP static serving, SQLite backup, and Cloudflare Tunnel integration (`Start_Cloudflare_Tunnel.bat`).

### 📂 Key Files & Modules
- `index.html` — Main single-page POS cashier interface and dashboard.
- `server.js` — Local backend server handling static files, multi-terminal sync, and tunnel proxies.
- `js/app.js` — POS lifecycle, routing, state management, and modal orchestration.
- `js/modules/online_orders.js` — **Cloud Sync Engine**:
  - Syncs local inventory, categories, barcodes, stock levels, and images to Supabase Cloud.
  - Automatically polls and receives online customer orders into the POS cashier screen.
- `js/modules/items.js` — Product catalog management, barcodes, pricing, stock tracking.
- `js/modules/sales.js` — Fast cashier checkout, multi-currency (USD / LBP at 89,500), barcode scanner handler.
- `js/modules/inventory.js` — Stock alerts, purchase orders, quantity adjustments.
- `js/modules/promotions.js` — Discounts, bundle deals, seasonal offers.
- `js/modules/reports.js` — Financial reports, sales summaries, cashier end-of-shift Z-reports.
- `assets/categories/` — Authentic 3D category illustration cards (Dairy, Fruits, Bakery, Beverages, Meats, Snacks).

### 🚀 Common Run & Build Commands
```powershell
# Start local POS Server
node D:\GravityProject\POSSoftware\server.js

# Launch Cloudflare Tunnel for multi-branch sync
D:\GravityProject\POSSoftware\Start_Cloudflare_Tunnel.bat
```

---

## 2. Project: Trial Demo System `[Trial]`

### 📌 Overview
The licensing and trial generation engine used to package secure, time-limited offline demos for prospective clients with WhatsApp OTP verification and code obfuscation.

- **Workspace Path:** `D:\GravityProject\POSSoftware` (Trial generators) & `D:\GravityProject\POSSoftware\dist\RedSharkPOS_Client_Release` (Client release bundle).

### 🛠️ Technology Stack
- **Packaging:** Node.js build scripts (`Build_Client_Release.js`).
- **Obfuscation / Protection:** JavaScript-obfuscator, encrypted license keys, trial expiration timers.
- **Verification:** WhatsApp OTP generator & trial pool (`100_WhatsApp_Trial_OTPs.txt`).

### 📂 Key Files
- `Create_Trial.bat` — Interactive staff batch script to generate a new customer trial license.
- `admin_create_trial.html` — Visual GUI to issue trial keys, set duration (7, 14, 30 days), and configure permissions.
- `developer_decryptor.html` — Developer tool to inspect and decrypt client licenses.
- `100_WhatsApp_Trial_OTPs.txt` — Pool of pre-generated trial verification codes.
- `dist/RedSharkPOS_Client_Release/` — The standalone distributable folder delivered to clients.

---

## 3. Project: Corporate Website `[Website]`

### 📌 Overview
The public marketing website and product landing page for Red Shark POS and AI ecosystem (`https://redshark-ai.com/`).

- **Workspace Path:** `D:\GravityProject\POSSoftware\website_index.html` & `D:\GravityProject\POSSoftware\website_assets\`
- **Live Domain:** `https://redshark-ai.com/`

### 🛠️ Technology Stack
- **Structure:** High-converting single-page responsive HTML5/CSS3 landing page.
- **Design:** Modern dark glassmorphism, responsive mobile layouts, dynamic FAQ, feature showcases, customer testimonials, interactive pricing calculator.

### 📂 Key Files
- `website_index.html` — Complete standalone production landing page.
- `website_assets/` — Hero photography (`hero-supermarket.jpg`, `hero-restaurant.jpg`, `hero-cafe-counter.jpg`), logos, and icons.

---

## 4. Project: Online Storefront & Order Management & App `[Storefront]`

### 📌 Overview
The multi-tenant cloud e-commerce storefront deployed to Cloudflare Pages. Allows end customers to browse a merchant's inventory, place orders, download the Android PWA/APK, and track live order progress in real-time.

- **Workspace Path:** `D:\GravityProject\RedSharkStorefront`
- **Git Repository:** `https://github.com/mohamedeid113-star/redshark-storefront.git` (`origin/main`)
- **Hosting / CDN:** Cloudflare Pages (Continuous deployment on push to `main`).
- **Live URL:** `https://shop.redshark-ai.com/?shop=shop101`
- **Merchant Admin Portal:** `https://shop.redshark-ai.com/admin?shop=shop101`

### 🛠️ Technology Stack
- **Frontend:** Vanilla HTML5, CSS3 with luxury Red Shark Crimson design tokens (`#dc2626` / `#b91c1c`), responsive 2-column mobile grid.
- **PWA & Offline:** Service Worker (`sw.js`) with cache busting, native Android install prompt, APK direct download.
- **Cloud Backend:** Supabase PostgreSQL & REST API (`https://mcebwpiswvwqcdwjpagy.supabase.co`).
  - Tables: `tenants`, `categories`, `products`, `orders`, `order_items`.

### 📂 Key Files
- `index.html` — Customer-facing storefront with POS-matched navigation tabs (`التصنيفات`, `كل الأصناف`), promotional carousel banners, 2-column product package cards, shopping cart, and live order tracking modal.
- `css/storefront.css` — Responsive design system with mobile row fit, touch-friendly UI, and Crimson theme.
- `js/storefront.js` — Main client application:
  - Multi-tenant slug resolution (`?shop=<slug>`).
  - Fast pagination loading (all 5,700+ catalog items supported).
  - 3D category illustration rendering and Arabic labels.
  - Live order tracking system (`trackOrderQuery`).
  - Banner carousel touch swipe support.
- `js/supabase-client.js` — Zero-dependency Supabase client for tenant lookup, category fetch, paginated products fetch, and order submission.
- `admin.html` — Merchant Admin Portal for store profile, custom logo upload, delivery fees, LBP exchange rate, banner slider configuration, category manager, sales & profit reports, and mobile admin app launcher.
- `app.html` — Standalone Mobile Admin Web App / PWA for shop owners (live stock updater, camera barcode scanner, live sales reports, incoming audio order notifications).
- `js/storefront-admin.js` — Admin portal & mobile app logic, Supabase analytics calculation, and order processing.
- `assets/categories/` — 3D category illustration assets synced with the desktop POS.

### 🚀 Common Run & Deploy Commands
```powershell
# Deploy storefront update to Cloudflare Pages
git -C "D:\GravityProject\RedSharkStorefront" add .
git -C "D:\GravityProject\RedSharkStorefront" commit -m "feat: your update message"
git -C "D:\GravityProject\RedSharkStorefront" push origin main
```

---

## 🖨️ Hardware Printing Architecture & Universal Rules (Crucial Reference)
> **Permanent Configuration Standard for Red Shark POS:**  
> **Detailed Reference Document:** See [`PRINTING_SYSTEM_MASTER_REFERENCE.md`](file:///d:/GravityProject/POSSoftware/PRINTING_SYSTEM_MASTER_REFERENCE.md) for full driver specifications, resolution calculations, and troubleshooting history.

1. **Silent Background Printing (Zero Popups / Zero `window.open`):**
   - **Mechanism:** Receipts and documents MUST ALWAYS use the hidden DOM `<iframe>` element (`#pos-print-frame`).
   - **Never Use:** `window.open('', '_blank')` or popup windows because they block cashier flow, show preview dialogs, and require manual close.
   - **Implementation:** In `js/utils.js` (`printElement`), the document HTML is injected into `#pos-print-frame`, fonts/styles are allowed to settle (~80ms), the target Windows printer is selected via `/api/printer/switch-default`, and `frame.contentWindow.print()` is executed. In Chrome Kiosk mode (`--kiosk --kiosk-printing`), the printer fires instantly with 0 dialogs.

2. **Tri-Printer Routing Architecture:**
   - **Receipt Printer (`receipt_printer`):** e.g. `XP-80C` / `POS-80`. Handles 80mm / 58mm thermal receipts, kitchen order chits, and cash shift reports.
   - **Document Printer (`document_printer`):** e.g. `Brother / HP / Canon A4/A5`. Handles fiscal invoices, statements, stocktake sheets, and reports.
   - **Barcode Label Printer (`label_printer`):** Dedicated thermal label printer (e.g. `Xprinter XP-365B`). Handles standard label sizes:
     - `40x24mm (2 x 4 stock)` — Native resolution: **320 × 192 dots** at 203 DPI (8 dots/mm).
     - `40x30mm`, `50x30mm`, `58x40mm`, and custom dimensions.

3. **Thermal Barcode Label Engine (`bin/print_label.ps1`):**
   - **Native 203 DPI Raster Pipeline:** Renders Product Name (Arial 8.5pt Bold), Code 128 barcode, Digits (Arial 8.0pt Bold), and Price (Arial 11.0pt Bold) onto an in-memory `System.Drawing.Bitmap` before sending via `DrawImage`. Bypasses thermal printer driver TrueType font dropping bugs completely.
   - **Code 128 Subset C (Numeric Compression):** Compresses numeric barcodes into pairs, shrinking 12-digit barcodes from 167 down to 101 modules.
   - **Guaranteed Quiet Zones:** Leaves $\ge 7\text{ mm}$ of clear white margin on each side so optical/laser scanners decode instantly.
   - **Pure Integer Dots:** Modules use exact integer dot widths (2 dots = 0.25 mm) with `SmoothingMode::None` to prevent scanner read failures.

---

## 🔗 How the Projects Interact (Cross-Project Workflows)

```
[POS Software] (Desktop)
      │
      │ 1. Synchronize Inventory & 3D Categories
      ▼
[Supabase Cloud Database] (PostgreSQL)
      │
      │ 2. Serve Catalog & Receive Orders
      ▼
[Online Storefront & Mobile App] (shop.redshark-ai.com)
      │
      │ 3. Push Customer Orders Back to Cashier
      ▼
[POS Cashier Screen] (Notification & Receipt Print)
```

1. **POS Inventory Sync to Storefront:**
   - In `[POS]` (`online_orders.js`), the merchant clicks **"مزامنة الأصناف"**.
   - Items, active categories, 3D image assets, prices, and stock are upserted to Supabase Cloud (`products`, `categories`).
2. **Customer Places Order:**
   - On `[Storefront]`, the customer adds items to cart and submits their order (or orders via WhatsApp).
   - Order is stored in Supabase `orders` with `order_status = 'pending'`.
3. **Cashier Processes Order:**
   - `[POS]` polls Supabase every 30 seconds for new orders.
   - Cashier accepts and prepares the order, updating `order_status` to `'preparing'` -> `'out_for_delivery'` -> `'completed'`.
4. **Customer Live Order Tracking:**
   - Customer taps **`📦 تتبع طلبك`** on `[Storefront]` and enters their phone or order number.
   - The 4-step progress bar reflects the real-time stage set by the POS cashier.

---

## 💬 How to Command Updates in Future Conversations
Whenever you start a request, you can prefix it with:
- **"In [POS]: ..."** → For local cashier, inventory, reports, or sync module changes.
- **"In [Trial]: ..."** → For trial generator, OTPs, or demo build scripts.
- **"In [Website]: ..."** → For the main landing page `redshark-ai.com`.
- **"In [Storefront]: ..."** → For the online shopping website, mobile app, admin portal, or tracking system.

