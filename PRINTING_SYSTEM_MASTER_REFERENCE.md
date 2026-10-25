# Red Shark POS — Complete Hardware Printing Architecture & Reference Guide
> **Last Updated:** October 2026 | **Build Version:** v1.2.60 (Build 76)  
> **Status:** Production Verified | Windows 10/11 x64  
> **Authoritative Reference:** This document contains the complete technical architecture, data pipelines, driver handling, and troubleshooting procedures for all printing in Red Shark POS (Receipts, Invoices, and Barcode Thermal Labels).

---

## 1. Architectural Overview & Tri-Printer Model

Red Shark POS uses a dedicated **Tri-Printer Routing Architecture** allowing different hardware devices to handle their native tasks concurrently without interfering with one another:

```
                                  ┌────────────────────────┐
                                  │   User / POS Action    │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┼──────────────────────┐
                      ▼                       ▼                      ▼
             [Cashier Checkout]      [A4 / A5 Invoices]      [Barcode Labels]
             80mm / 58mm Thermal     Laser / Inkjet / PDF    Thermal Label (XP-365B)
                      │                       │                      │
                      ▼                       ▼                      ▼
              `receipt_printer`      `document_printer`       `label_printer`
                      │                       │                      │
                      ▼                       ▼                      ▼
            Silent Webview Frame    Silent Webview Frame    Node.js Spooler API
            (`--kiosk-printing`)    (`--kiosk-printing`)    (`POST /api/print-label`)
                      │                       │                      │
                      ▼                       ▼                      ▼
            Windows Print Spooler   Windows Print Spooler   `bin/print_label.ps1`
                                                             (203 DPI Native Raster)
```

### Printer Hardware Profiles in IndexedDB (`settings` store)

| Setting Key | Default Name | Target Hardware | Standard Media Sizes | Pipeline |
|---|---|---|---|---|
| `receipt_printer` | `XP-80C` / `POS-80` | Thermal receipt printer | `80mm auto`, `58mm auto` | Hidden DOM `<iframe>` + Chrome Kiosk |
| `document_printer` | `Brother/HP/Canon` | Standard office printer | `A4`, `A5`, `Letter` | Hidden DOM `<iframe>` + Chrome Kiosk |
| `label_printer` | `Xprinter XP-365B` | Thermal barcode label printer | `40x24mm (2x4 stock)`, `40x30mm`, `50x30mm`, `58x40mm`, `Custom` | Native 203 DPI Bitmap Raster via `bin/print_label.ps1` |

---

## 2. Receipt & Invoice Printing Pipeline (Silent Kiosk)

### How It Works
1. In `js/utils.js` (`printElement`), HTML content is injected into the hidden `#pos-print-frame` DOM element.
2. The active Windows default printer is verified or switched via `/api/printer/switch-default`.
3. In Chrome/Edge running with `--kiosk --kiosk-printing`, `frame.contentWindow.print()` triggers the physical printer instantly with zero dialogue boxes, popups, or previews.
4. **Permanent Rule:** Never use `window.open('', '_blank')` for cashier prints; always use `#pos-print-frame`.

---

## 3. Dedicated Thermal Barcode Label Pipeline (Xprinter XP-365B)

### Why Direct GDI+ Printing Fails on Thermal Label Printers
Thermal printer drivers (especially TSPL / ESC/POS label drivers like Xprinter XP-365B):
- Intercept vector TrueType text calls (`Graphics.DrawString`) made directly to the printer DC and frequently suppress them or attempt to substitute internal printer bitmap fonts.
- If a bounding box has tight height bounds or fractional padding, GDI+ silently drops the text string entirely.
- Direct vector barcode rendering can suffer from sub-pixel anti-aliasing blur, resulting in unreadable bars.

### The Solution: Native 203 DPI Pre-Rendered Raster Engine
To guarantee 100% fidelity, Red Shark POS uses an in-memory **203 DPI (8 dots/mm)** bitmap pre-rendering engine in [`bin/print_label.ps1`](file:///d:/GravityProject/POSSoftware/bin/print_label.ps1):

1. **Resolution Calculation:**
   - 203 DPI = 8 dots per millimeter.
   - For standard **40 × 24 mm** (2 × 4) labels:  
     $$\text{Width} = 40 \times 8 = 320\text{ dots}$$  
     $$\text{Height} = 24 \times 8 = 192\text{ dots}$$
2. **In-Memory Rendering (`System.Drawing.Bitmap`):**
   - Renders **Product Name** centered at top (e.g. Arial 8.5pt Bold).
   - Generates **Code 128 Subset C** (for numeric codes) or **Subset B** (for alphanumeric codes).
   - Draws bars using **strict integer dot multiples** ($2\text{ dots} = 0.25\text{ mm}$ module width).
   - Centers barcode with **guaranteed quiet zones** ($\ge 7\text{ mm}$ on each side for 40mm labels).
   - Renders **Barcode Digits** (Arial 8.0pt Bold) centered below bars.
   - Renders **Price** (Arial 11.0pt Bold) centered at bottom.
3. **Hardware Blitting:**
   - In `add_PrintPage`, the complete pre-rendered bitmap is blitted via `$e.Graphics.DrawImage($bmp, 0, 0, $e.PageBounds.Width, $e.PageBounds.Height)`.
   - The thermal printer driver receives pure raster dots; zero driver font rendering is involved. Everything on the bitmap prints on paper.

---

## 4. Crucial Troubleshooting History & Lessons Learned

### Issue 1: "Only Barcode Prints, Product Name and Price Are Missing"
* **Symptom:** On the physical label, the barcode bars appeared, but the product name, digits, and price were completely blank.
* **Root Cause 1 (PowerShell Argument Evaluation):**
  In [`bin/print_label.ps1`](file:///d:/GravityProject/POSSoftware/bin/print_label.ps1), font instantiation was written as:
  ```powershell
  # ❌ BROKEN: PowerShell evaluates 'if' as a command name in argument parenthesis
  $fName = New-Object System.Drawing.Font("Arial", (if ($isSmallH) { 8.5 } else { 9.5 }), [System.Drawing.FontStyle]::Bold)
  ```
  PowerShell threw `CommandNotFoundException: if is not recognized`, setting `$fName` and `$fPrice` to `$null`. Calling `DrawString` then threw `ArgumentNullException: font cannot be null`. Since `$bg.FillRectangle` for barcode lines does not use fonts, only barcode lines printed.
  ```powershell
  # ✅ FIXED: Pre-assign scalar variables before instantiation
  if ($isSmallH) {
      $nameSize = 8.5
      $nameStep = 30
      $digitsSize = 8.0
      $digitsStep = 24
      $priceSize = 11.0
      $bcAvailH = if ($ShowDigits -and $ShowPrice) { 46 } elseif ($ShowDigits -or $ShowPrice) { 60 } else { 80 }
  } else {
      $nameSize = 9.5
      $nameStep = 36
      $digitsSize = 9.0
      $digitsStep = 30
      $priceSize = 13.0
      $bcAvailH = if ($ShowDigits -and $ShowPrice) { 62 } elseif ($ShowDigits -or $ShowPrice) { 80 } else { 105 }
  }
  $fName = New-Object System.Drawing.Font("Arial", $nameSize, [System.Drawing.FontStyle]::Bold)
  ```

* **Root Cause 2 (Parameter Variable Reference in `js/utils.js`):**
  In `Utils.printElement(html, title, pageSize, structuredData)`, line 719 checked `typeof testData` instead of `structuredData`. This wiped the label payload and caused the script to fall back to regex scraping of the HTML.
  ```javascript
  // ✅ FIXED in js/utils.js:
  let labelPayload = (typeof structuredData === 'object' && structuredData) ? { ...structuredData } : ((typeof testData === 'object' && testData) ? { ...testData } : {});
  ```

### Issue 2: "Barcode Scanner Cannot Read the Printed Barcode"
* **Symptom:** The barcode printed on paper, but handheld optical or laser readers failed to scan it.
* **Root Cause:**
  1. Standard Code 128 Subset B for a 12-digit number generates 167 modules. On a 40mm (320 dots) label, each module had to be scaled to fractional float pixels ($\sim 1.832\text{ dots}$), causing anti-aliasing jitter and eliminating the required white margins (quiet zones).
  2. Optical scanners require a minimum quiet zone of at least 10× module width ($\approx 2.5\text{ mm}$ to $5\text{ mm}$) of pure white space on both the left and right sides.
* **Solution:**
  - Implemented **Code 128 Subset C** in `Get-Code128Modules`: pairs of digits are encoded into single symbols, reducing a 12-digit barcode from 167 modules down to **101 modules**.
  - At $2\text{ dots/module}$, the barcode occupies $202\text{ dots}$ ($25.25\text{ mm}$), leaving $(320 - 202) / 2 = 59\text{ dots}$ ($7.37\text{ mm}$) of clean white quiet zone on both sides.
  - Used strict integer coordinates: `($startX + ($k * $moduleDots))` with `SmoothingMode::None`.
  - Scanners now read the code instantly in under 100 milliseconds.

### Issue 3: "Git Ignoring the Label Print Script"
* **Symptom:** Client updates were missing `bin/print_label.ps1` because `.gitignore` originally ignored `bin/`.
* **Solution:**
  - Updated `.gitignore` to:
    ```gitignore
    bin/*.exe
    !bin/print_label.ps1
    !bin/print_receipt.ps1
    ```
  - `Build_Client_Release.js` packages `bin/*.ps1` into the update ZIP while excluding `bin/*.exe` to keep update files under 9 MB.

---

## 5. Label Dimensions Reference Table

| Label Type | Width (mm) | Height (mm) | Native Resolution (203 DPI Dots) | Suitable Products |
|---|---|---|---|---|
| **40 × 24 mm (2 × 4 stock)** | 40 mm | 24 mm | 320 × 192 dots | Small cosmetics, supermarket items, toys, jewelry tags |
| **40 × 30 mm** | 40 mm | 30 mm | 320 × 240 dots | Standard grocery, pharmacy boxes |
| **50 × 30 mm** | 50 mm | 30 mm | 400 × 240 dots | Clothing tags, hardware parts |
| **58 × 40 mm** | 58 mm | 40 mm | 464 × 320 dots | Shipping boxes, carton labeling |

---

## 6. How to Build & Deploy an Emergency Fix

If any changes are made to printing scripts or modules:

```powershell
# 1. Run the Client Release Builder (increments build & obfuscates code)
node D:\GravityProject\POSSoftware\Build_Client_Release.js

# 2. Push Update ZIP to Cloudflare Pages (RedSharkStorefront)
cd D:\GravityProject\RedSharkStorefront
git add dist/update.zip dist/version.json version.json
git commit -m "fix(print): emergency fix description (Build XX)"
git push origin main

# 3. Commit POSSoftware codebase
cd D:\GravityProject\POSSoftware
git add -A
git commit -m "fix(print): emergency fix description (Build XX)"
git push origin main
```

**Client PC Application:**
1. Open RedShark POS ➔ **Settings ➔ System** (الإعدادات ➔ النظام).
2. Click **Check for Updates** (التحقق من وجود تحديثات).
3. Restart RedShark POS via `Start_RedSharkPOS.bat`.
