# 離線 OCR 掃描統計工具

## 專案簡介

這是一個完全離線運行的 OCR 掃描統計工具，採用 Cyberpunk/Neon-on-dark 視覺風格，支援繁體中文優先的 OCR 識別、逐行可編輯、驗算核對與 PDF 匯出功能。

## 使用方式

1. 下載所有依賴函式庫（見下方說明）
2. 使用 Chrome 瀏覽器開啟 `index.html`
3. 在網址列輸入：`file:///C:/Users/LIN/Downloads/新增資料夾/ocr-reconciliation-tool/index.html`

## 依賴函式庫下載指引

### 1. PaddleOCR.js（OCR 引擎）

**選項 A：使用 @paddle-js-models/ocr（推薦）**

```bash
# 在專案根目錄執行
npm install @paddle-js-models/ocr
```

下載後，將以下檔案複製到 `lib/paddleocr/`：
- `node_modules/@paddle-js-models/ocr/dist/index.js` → `lib/paddleocr/paddle-ocr.min.js`
- `node_modules/@paddle-js-models/ocr/dist/*.wasm` → `lib/paddleocr/`
- 模型檔案（如有）→ `lib/paddleocr/models/`

**選項 B：手動下載（若無 npm）**

1. 前往：https://cdn.jsdelivr.net/npm/@paddle-js-models/ocr/dist/
2. 下載 `index.js` 並重命名為 `paddle-ocr.min.js`
3. 下載所有 `.wasm` 檔案
4. 放置到 `lib/paddleocr/`

---

### 2. PDF.js（PDF 解析）

**下載連結：**
- https://github.com/mozilla/pdf.js/releases/latest

**步驟：**
1. 下載 `pdfjs-*-dist.zip`
2. 解壓縮後，將以下檔案複製到 `lib/pdfjs/`：
   - `build/pdf.min.js`
   - `build/pdf.worker.min.js`

---

### 3. html2canvas（截圖）

**下載連結：**
- https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js

**步驟：**
1. 下載 `html2canvas.min.js`
2. 放置到 `lib/html2canvas/`

---

### 4. jsPDF（PDF 生成）

**下載連結：**
- https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js

**步驟：**
1. 下載 `jspdf.umd.min.js`
2. 放置到 `lib/jspdf/`

---

## 專案結構

```
ocr-reconciliation-tool/
├── index.html              # 主入口
├── css/
│   ├── design-system.css   # Cyberpunk 設計系統
│   ├── layout.css          # 版型
│   ├── components.css      # 元件樣式
│   └── export.css          # 匯出專用樣式
├── js/
│   ├── app.js              # 主應用邏輯
│   ├── auth.js             # 登入分帳
│   ├── ocr-engine.js       # OCR 引擎封裝
│   ├── extractor.js        # 關鍵字擷取
│   ├── validator.js        # 驗算引擎
│   ├── export.js           # 匯出邏輯
│   └── utils.js            # 工具函式
├── lib/                    # 第三方函式庫
│   ├── paddleocr/
│   ├── pdfjs/
│   ├── html2canvas/
│   └── jspdf/
├── assets/
│   ├── icons/              # SVG icons
│   └── fonts/              # 等寬數字字體
└── README.md
```

## 技術特點

- ✅ 完全離線運行（Chrome + file://）
- ✅ 繁體中文 OCR 優先
- ✅ Cyberpunk/Neon-on-dark 視覺風格
- ✅ 逐行可編輯與即時驗算
- ✅ 高畫質預覽與 hover 全螢幕
- ✅ 多模式 PDF 匯出
- ✅ 無 emoji，純 icon/色彩/框線提示

## 注意事項

1. **Chrome 瀏覽器限制**：部分功能可能需要在 Chrome 設定中允許本地檔案存取
2. **首次載入**：PaddleOCR 模型首次載入需要時間，請耐心等待
3. **記憶體使用**：大量圖片/PDF 可能消耗較多記憶體，建議分批處理

## 授權

MIT License
