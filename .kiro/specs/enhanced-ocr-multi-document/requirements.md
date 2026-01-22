# Requirements Document

## Introduction

本需求文件定義了 OCR 發票辨識系統的強化功能，目標是透過整合多個免費 JavaScript 庫來提升辨識準確率，並擴展系統支援混雜單據類型（發票、水電單、勞健保繳費單等）。系統將採用純靜態網頁架構，完全離線運行，並透過影像前處理、智能分類、同義詞橋接、強驗算與人工覆核機制，達到接近 100% 的資料正確率。

核心策略包括：
- 使用 Tesseract.js 作為 OCR 引擎（取代 PaddleOCR）
- 整合 OpenCV.js 進行影像前處理（傾斜校正、二值化、去噪）
- 實作文件分類系統（發票/水電/勞健保/其他）
- 建立同義詞字典與欄位映射機制
- 強化驗算邏輯與人工覆核流程
- 使用 localForage 沉澱學習資料

## Requirements

### Requirement 1: 整合 Tesseract.js OCR 引擎

**User Story:** 作為系統開發者，我希望整合 Tesseract.js 作為核心 OCR 引擎，以便提供穩定的繁體中文與英文辨識能力。

#### Acceptance Criteria

1. WHEN 系統初始化 THEN 系統 SHALL 載入 Tesseract.js 並初始化繁體中文（chi_tra）與英文（eng）語言包
2. WHEN 使用者上傳圖片或 PDF THEN 系統 SHALL 使用 Web Worker 執行 OCR 以避免 UI 卡死
3. WHEN OCR 執行中 THEN 系統 SHALL 顯示進度百分比
4. WHEN OCR 完成 THEN 系統 SHALL 返回文字內容、信心度分數與邊界框資訊
5. IF OCR 信心度低於 70% THEN 系統 SHALL 標註該欄位為「需確認」

### Requirement 2: 整合 OpenCV.js 影像前處理

**User Story:** 作為使用者，我希望系統能自動校正歪斜、模糊的單據影像，以便提升 OCR 辨識準確率。

#### Acceptance Criteria

1. WHEN 系統載入 THEN 系統 SHALL 初始化 OpenCV.js WASM 模組
2. WHEN 影像進入 OCR 流程前 THEN 系統 SHALL 提供「速度模式」與「精度模式」兩種前處理選項
3. WHEN 選擇速度模式 THEN 系統 SHALL 執行灰階轉換與自適應二值化
4. WHEN 選擇精度模式 THEN 系統 SHALL 執行去噪、對比拉升、二值化、傾斜校正與透視校正
5. WHEN 前處理完成 THEN 系統 SHALL 將處理後的影像傳遞給 OCR 引擎
6. WHEN 使用者查看結果 THEN 系統 SHALL 提供前後對比預覽功能

### Requirement 3: 實作文件分類系統

**User Story:** 作為使用者，我希望系統能自動識別不同類型的單據（發票、水電單、勞健保繳費單等），以便套用對應的欄位抽取策略。

#### Acceptance Criteria

1. WHEN OCR 完成初步文字識別 THEN 系統 SHALL 執行文件分類邏輯
2. WHEN 文字包含「統一發票、發票號碼、稅額、營業稅、買受人、賣方」等關鍵字 THEN 系統 SHALL 分類為「發票類」
3. WHEN 文字包含「電號、用電度數、水號、本期、繳費期限、電費、水費、台電、自來水」等關鍵字 THEN 系統 SHALL 分類為「水電類」
4. WHEN 文字包含「勞保、健保、投保薪資、保險費、被保險人、保險證號、繳款書」等關鍵字 THEN 系統 SHALL 分類為「勞健保類」
5. IF 無法命中任何分類 THEN 系統 SHALL 分類為「其他」並使用通用抽取策略
6. WHEN 分類完成 THEN 系統 SHALL 顯示文件類型標籤與信心度

### Requirement 4: 建立 ROI 欄位抽取策略

**User Story:** 作為系統開發者，我希望針對不同文件類型實作 ROI（Region of Interest）抽取策略，以便提升關鍵欄位的辨識準確率。

#### Acceptance Criteria

1. WHEN 文件分類為「發票類」THEN 系統 SHALL 定義發票 ROI 模板（字軌區、買受人統編區、金額區）
2. WHEN 文件分類為「水電類」THEN 系統 SHALL 定義水電 ROI 模板（繳費期限、電號/水號、應繳金額）
3. WHEN 文件分類為「勞健保類」THEN 系統 SHALL 定義勞健保 ROI 模板（保險費合計、投保薪資、繳款書號）
4. WHEN 執行 ROI OCR THEN 系統 SHALL 針對數字欄位使用白名單（0-9）
5. WHEN 執行 ROI OCR THEN 系統 SHALL 針對字軌欄位使用白名單（A-Z0-9）
6. WHEN ROI 抽取完成 THEN 系統 SHALL 在視覺化介面標註 ROI 區域

### Requirement 5: 實作同義詞橋接機制

**User Story:** 作為使用者，我希望系統能自動將不同單據的欄位名稱統一映射到標準欄位，以便產生一致的輸出格式。

#### Acceptance Criteria

1. WHEN 系統初始化 THEN 系統 SHALL 從 localForage 載入三層同義詞字典（欄位同義詞、文件分類關鍵字、版型別名）
2. WHEN 抽取到欄位名稱 THEN 系統 SHALL 查詢 Layer 1 欄位同義詞字典進行映射
3. WHEN 映射成功 THEN 系統 SHALL 將欄位值存入標準 schema（docType, buyerId, docNo, period, amountSubtotal, tax, total）
4. WHEN 使用者在後台設定新增同義詞 THEN 系統 SHALL 即時更新字典並存入 localForage
5. WHEN 遇到未知欄位名稱 THEN 系統 SHALL 提示使用者建立新的同義詞映射

### Requirement 6: 強化驗算邏輯

**User Story:** 作為使用者，我希望系統能自動驗算金額關係（如：銷售額 + 稅額 = 總計），以便及早發現 OCR 錯誤。

#### Acceptance Criteria

1. WHEN 系統載入 THEN 系統 SHALL 初始化 Decimal.js 進行精準金額計算
2. WHEN 發票類文件抽取完成 THEN 系統 SHALL 驗算「銷售額 + 稅額 ≈ 總計」（容許四捨五入差 1 元）
3. WHEN 水電類文件抽取完成 THEN 系統 SHALL 驗算「本期應繳 = 總額」
4. WHEN 勞健保類文件抽取完成 THEN 系統 SHALL 驗算「合計 = 分項加總」（若有分項）
5. IF 驗算失敗 THEN 系統 SHALL 標註該筆資料為「NeedsReview」並高亮顯示錯誤欄位
6. WHEN 使用者修正欄位值 THEN 系統 SHALL 即時重新驗算

### Requirement 7: 實作人工覆核介面

**User Story:** 作為使用者，我希望能快速檢視與修正 OCR 錯誤，並讓系統記住我的修正以提升未來準確率。

#### Acceptance Criteria

1. WHEN 驗算失敗或信心度低 THEN 系統 SHALL 在驗算核對頁顯示「需確認」標籤
2. WHEN 使用者點擊欄位 THEN 系統 SHALL 顯示該欄位的來源 ROI 截圖並支援放大
3. WHEN 使用者修改欄位值 THEN 系統 SHALL 即時更新並重新驗算
4. WHEN 使用者確認修正 THEN 系統 SHALL 將修正記錄存入 localForage（包含原值、修正值、店家/版型資訊）
5. WHEN 下次遇到相同店家/版型 THEN 系統 SHALL 自動套用歷史修正參數

### Requirement 8: 實作字符修正表

**User Story:** 作為系統開發者，我希望建立常見 OCR 錯字修正表，以便自動修正常見的字符混淆問題。

#### Acceptance Criteria

1. WHEN 系統初始化 THEN 系統 SHALL 載入預設字符修正表（O→0, I→1, l→1, S→5, B→8）
2. WHEN OCR 完成 THEN 系統 SHALL 對數字欄位套用字符修正表
3. WHEN 套用修正表 THEN 系統 SHALL 統一處理全形半形、逗號、空格、貨幣符號
4. WHEN 使用者在後台新增修正規則 THEN 系統 SHALL 更新修正表並存入 localForage
5. WHEN 修正表更新 THEN 系統 SHALL 對所有待處理文件重新套用修正邏輯

### Requirement 9: 整合 localForage 本地儲存

**User Story:** 作為使用者，我希望系統能記住我的設定、字典與修正記錄，以便下次使用時自動套用。

#### Acceptance Criteria

1. WHEN 系統初始化 THEN 系統 SHALL 初始化 localForage 並設定 IndexedDB 為優先儲存方式
2. WHEN 使用者登入 THEN 系統 SHALL 從 localForage 載入該使用者的設定與字典
3. WHEN 使用者新增同義詞或修正規則 THEN 系統 SHALL 即時存入 localForage
4. WHEN 使用者修正 OCR 結果 THEN 系統 SHALL 將修正記錄（patches）存入 localForage
5. WHEN 使用者切換帳號 THEN 系統 SHALL 載入對應帳號的資料

### Requirement 10: 整合批量上傳與預覽功能

**User Story:** 作為使用者，我希望能批量上傳多個檔案並預覽放大，以便快速處理大量單據。

#### Acceptance Criteria

1. WHEN 系統載入 THEN 系統 SHALL 初始化 Dropzone 支援拖拉上傳
2. WHEN 使用者拖拉檔案到上傳區 THEN 系統 SHALL 顯示上傳佇列與進度
3. WHEN 使用者點擊預覽圖 THEN 系統 SHALL 使用 Viewer.js 顯示全螢幕預覽
4. WHEN 預覽 PDF THEN 系統 SHALL 使用 Panzoom 支援縮放與平移
5. WHEN 批量上傳完成 THEN 系統 SHALL 自動進入 OCR 流程

### Requirement 11: 強化 PDF 處理能力

**User Story:** 作為使用者，我希望系統能以高 DPI 渲染 PDF 頁面，以便提升 OCR 辨識清晰度。

#### Acceptance Criteria

1. WHEN 使用者上傳 PDF THEN 系統 SHALL 使用 PDF.js 渲染每一頁
2. WHEN 渲染 PDF 頁面 THEN 系統 SHALL 使用 2x~4x DPI 提升清晰度
3. WHEN 渲染完成 THEN 系統 SHALL 將 canvas 傳遞給影像前處理模組
4. WHEN PDF 包含多頁 THEN 系統 SHALL 依序處理每一頁並顯示進度
5. WHEN 所有頁面處理完成 THEN 系統 SHALL 合併結果並顯示統計資訊

### Requirement 12: 實作標準輸出 Schema

**User Story:** 作為系統開發者，我希望定義統一的輸出 schema，以便不同類型的單據都能產生一致的資料結構。

#### Acceptance Criteria

1. WHEN 系統設計 THEN 系統 SHALL 定義標準輸出 schema 包含以下欄位：
   - docType（文件類型：invoice | utility | labor_health | other）
   - buyerId（統編/身分證/用戶統編）
   - docNo（發票字軌/繳費單號/電號水號）
   - period（期間，例如 2025-12 或起訖日）
   - amountItems（明細，可選）
   - amountSubtotal（小計/銷售額）
   - tax（稅額）
   - total（總計）
   - checks（驗算結果與警示）
   - rawText（原始文字，可選）
   - patches（人工修改紀錄）
2. WHEN 欄位抽取完成 THEN 系統 SHALL 將結果映射到標準 schema
3. WHEN 匯出資料 THEN 系統 SHALL 使用標準 schema 格式

### Requirement 13: 整合 Ajv 規則驗證

**User Story:** 作為系統開發者，我希望使用 JSON Schema 驗證資料格式，以便確保資料完整性與可擴展性。

#### Acceptance Criteria

1. WHEN 系統初始化 THEN 系統 SHALL 載入 Ajv 並定義標準 schema 驗證規則
2. WHEN 欄位抽取完成 THEN 系統 SHALL 使用 Ajv 驗證資料格式
3. WHEN 驗證失敗 THEN 系統 SHALL 標註錯誤欄位並顯示錯誤訊息
4. WHEN 使用者在後台新增驗證規則 THEN 系統 SHALL 更新 schema 並即時生效
5. WHEN 統編欄位驗證 THEN 系統 SHALL 確認格式為 8 位數字且等於登入統編

### Requirement 14: 整合 validator.js 格式驗證

**User Story:** 作為系統開發者，我希望使用 validator.js 驗證特定格式（如統編、日期、金額），以便提升資料品質。

#### Acceptance Criteria

1. WHEN 系統初始化 THEN 系統 SHALL 載入 validator.js
2. WHEN 驗證統編 THEN 系統 SHALL 確認格式符合 ^[0-9]{8}$
3. WHEN 驗證字軌 THEN 系統 SHALL 確認格式符合 ^[A-Z]{2}\d{8}$
4. WHEN 驗證日期 THEN 系統 SHALL 確認格式為有效日期
5. WHEN 驗證金額 THEN 系統 SHALL 確認為有效數字且大於等於 0

### Requirement 15: 優化匯出功能

**User Story:** 作為使用者，我希望匯出的 PDF 能正確顯示邊界且不被裁切，以便產生高品質的報表。

#### Acceptance Criteria

1. WHEN 使用者點擊匯出 PDF THEN 系統 SHALL 使用 html2canvas 截圖並確保邊界完整
2. WHEN 截圖完成 THEN 系統 SHALL 使用 jsPDF 生成 PDF 並自動調整頁面大小
3. WHEN 匯出模式為「全批次合併」THEN 系統 SHALL 將所有資料合併成一份 PDF
4. WHEN 匯出模式為「依檔案分檔」THEN 系統 SHALL 為每個檔案生成獨立 PDF
5. WHEN 匯出完成 THEN 系統 SHALL 自動下載 PDF 檔案
