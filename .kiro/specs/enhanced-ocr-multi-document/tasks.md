# Implementation Plan

## Phase 1: 基礎設施整合

- [x] 1. 整合 Tesseract.js OCR 引擎


  - 建立 `js/enhanced-ocr-engine.js` 檔案
  - 實作 `EnhancedOCREngine` 類別，支援 Web Worker 執行 OCR
  - 實作 `recognizeROI()` 方法支援 ROI 辨識與字符白名單
  - 實作進度回調與信心度閾值設定
  - 更新 `index.html` 載入 Tesseract.js CDN（含本地備援）
  - 撰寫單元測試驗證 OCR 功能
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_




- [ ] 2. 整合 OpenCV.js 影像前處理模組
  - 建立 `js/image-preprocessor.js` 檔案
  - 實作 `ImagePreprocessor` 類別初始化 OpenCV.js WASM
  - 實作速度模式（灰階 + 自適應二值化）
  - 實作精度模式（去噪 + 對比 + 二值化 + 去斜 + 透視校正）
  - 實作前後對比預覽功能


  - 更新 `index.html` 載入 OpenCV.js CDN（含本地備援）
  - 在 UI 新增前處理模式選擇器
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 3. 整合 localForage 本地儲存
  - 建立 `js/storage-manager.js` 檔案
  - 實作 `StorageManager` 類別初始化 localForage（IndexedDB 優先）
  - 實作使用者資料儲存與讀取方法


  - 實作字典資料儲存與讀取方法
  - 實作 Patch 記錄儲存與查詢方法
  - 更新 `index.html` 載入 localForage CDN（含本地備援）
  - 更新 `js/auth.js` 使用 StorageManager 取代 localStorage
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_




- [ ] 4. 整合 Decimal.js 精準金額計算
  - 更新 `index.html` 載入 Decimal.js CDN（含本地備援）
  - 更新 `js/utils.js` 的 `parseAmount()` 使用 Decimal.js
  - 更新 `js/validator.js` 的驗算邏輯使用 Decimal.js
  - 撰寫單元測試驗證金額計算精度
  - _Requirements: 6.2_




- [ ] 5. 整合批量上傳與預覽庫
  - 更新 `index.html` 載入 Dropzone、Viewer.js、Panzoom CDN（含本地備援）
  - 更新 `js/app.js` 使用 Dropzone 取代原生拖拉上傳
  - 整合 Viewer.js 實作全螢幕預覽功能
  - 整合 Panzoom 實作 PDF canvas 縮放與平移
  - 更新 UI 樣式配合新的上傳與預覽元件
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_



## Phase 2: 文件分類與 ROI 抽取

- [ ] 6. 實作文件分類系統
  - 建立 `js/document-classifier.js` 檔案
  - 實作 `DocumentClassifier` 類別
  - 定義三層分類關鍵字字典（發票/水電/勞健保/其他）
  - 實作 `classify()` 方法執行關鍵字匹配與計分
  - 實作 `getClassificationConfidence()` 方法計算信心度
  - 實作 `addCustomKeywords()` 方法支援自訂關鍵字
  - 整合 lodash 進行關鍵字匹配與計分
  - 更新 `index.html` 載入 lodash CDN（含本地備援）


  - 撰寫單元測試驗證分類準確率
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 7. 實作 ROI 欄位抽取器
  - 建立 `js/roi-extractor.js` 檔案
  - 實作 `ROIExtractor` 類別
  - 定義發票類 ROI 模板（字軌區、買受人統編區、金額區）
  - 定義水電類 ROI 模板（繳費期限、電號/水號、應繳金額）
  - 定義勞健保類 ROI 模板（保險費合計、投保薪資、繳款書號）
  - 實作 `extractFields()` 方法根據文件類型執行 ROI 抽取
  - 實作 `extractROI()` 方法呼叫 EnhancedOCREngine 進行 ROI OCR
  - 實作 `visualizeROI()` 方法在視覺化介面標註 ROI 區域
  - 整合 DocumentChunker 協助定位 ROI 區域
  - 撰寫單元測試驗證 ROI 抽取準確率
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 8. 強化 PDF 處理能力
  - 建立 `js/enhanced-pdf-processor.js` 檔案
  - 實作 `EnhancedPDFProcessor` 類別
  - 實作 `renderPage()` 方法支援 2x~4x DPI 渲染
  - 實作 `renderAllPages()` 方法逐頁渲染並顯示進度
  - 實作 `extractMetadata()` 方法擷取 PDF 元資料
  - 更新 `js/app.js` 使用 EnhancedPDFProcessor 取代原生 PDF.js 處理
  - 在 UI 新增 DPI 設定選項
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

## Phase 3: 同義詞映射與字符修正

- [ ] 9. 實作同義詞映射機制
  - 建立 `js/synonym-mapper.js` 檔案
  - 實作 `SynonymMapper` 類別
  - 定義 Layer 1 欄位同義詞字典（total, tax, subtotal, docNo, buyerId, period）
  - 定義 Layer 2 文件分類關鍵字字典
  - 定義 Layer 3 版型別名字典（台電、自來水、健保局等）
  - 實作 `loadDictionaries()` 方法從 localForage 載入字典
  - 實作 `mapFieldName()` 方法執行欄位名稱映射
  - 實作 `mapFieldValue()` 方法執行欄位值正規化
  - 實作 `addSynonym()` 方法支援新增同義詞
  - 實作 `saveDictionaries()` 方法儲存字典至 localForage
  - 撰寫單元測試驗證映射邏輯
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. 實作字符修正表
  - 建立 `js/character-corrector.js` 檔案
  - 實作 `CharacterCorrector` 類別
  - 定義預設字符修正表（O→0, I→1, l→1, S→5, B→8）
  - 定義標點符號修正表（全形半形轉換）
  - 定義貨幣符號修正表（NT$、$、元）
  - 實作 `loadCorrectionTable()` 方法從 localForage 載入修正表
  - 實作 `correctText()` 方法根據欄位類型套用修正規則
  - 實作 `addCorrectionRule()` 方法支援新增修正規則
  - 實作 `saveCorrectionTable()` 方法儲存修正表至 localForage
  - 撰寫單元測試驗證修正邏輯
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 11. 實作標準輸出 Schema 轉換
  - 更新 `js/extractor.js` 實作標準 Schema 轉換邏輯
  - 定義標準輸出 Schema 結構（docType, buyerId, docNo, period, amounts, checks, patches, metadata）
  - 實作 `convertToStandardSchema()` 方法將抽取結果轉換為標準格式
  - 整合 SynonymMapper 進行欄位映射
  - 整合 CharacterCorrector 進行字符修正
  - 撰寫單元測試驗證 Schema 轉換
  - _Requirements: 12.1, 12.2, 12.3_

## Phase 4: 驗算與驗證

- [ ] 12. 整合 Ajv 與 validator.js
  - 更新 `index.html` 載入 Ajv 與 validator.js CDN（含本地備援）
  - 在 `js/enhanced-validator.js` 定義標準 Schema 驗證規則
  - 實作統編格式驗證（^[0-9]{8}$）
  - 實作字軌格式驗證（^[A-Z]{2}\d{8}$）
  - 實作日期格式驗證
  - 實作金額格式驗證（>= 0）
  - 撰寫單元測試驗證格式驗證邏輯
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 13. 實作強化驗算引擎
  - 建立 `js/enhanced-validator.js` 檔案（或更新現有 `js/validator.js`）
  - 實作 `EnhancedValidator` 類別
  - 實作發票類驗算規則（銷售額 + 稅額 ≈ 總計，容許 1 元誤差）
  - 實作水電類驗算規則（本期應繳 = 總額）
  - 實作勞健保類驗算規則（合計 = 分項加總）
  - 實作 `loadValidationRules()` 方法從 localForage 載入自訂規則
  - 實作 `validate()` 方法根據文件類型執行驗算
  - 實作 `addCustomRule()` 方法支援新增自訂規則
  - 實作 `saveValidationRules()` 方法儲存規則至 localForage
  - 使用 Decimal.js 進行精準金額計算
  - 撰寫單元測試驗證驗算邏輯
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 14. 實作統編核對邏輯
  - 更新 `js/enhanced-validator.js` 新增統編核對規則
  - 實作統編與登入統編比對邏輯
  - 實作跨帳號統編比對邏輯（檢查是否為其他已儲存帳號）
  - 實作統編不符時的警示訊息與建議
  - 撰寫單元測試驗證統編核對邏輯
  - _Requirements: 13.5_

## Phase 5: 人工覆核與學習機制

- [ ] 15. 實作人工覆核介面
  - 建立 `js/review-manager.js` 檔案
  - 實作 `ReviewManager` 類別
  - 實作 `displayReviewItems()` 方法顯示需確認項目清單
  - 實作 `showFieldROI()` 方法顯示欄位來源 ROI 截圖並支援放大
  - 實作 `handleFieldCorrection()` 方法處理欄位修正
  - 實作即時重新驗算功能
  - 更新 `css/components.css` 新增覆核介面樣式
  - 在驗算核對頁整合 ReviewManager
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 16. 實作 Patch 記錄與學習機制
  - 在 `js/review-manager.js` 實作 `savePatch()` 方法
  - 定義 Patch 資料結構（id, timestamp, userId, vendor, docType, fieldName, oldValue, newValue, reason, roiOffset）
  - 實作 `applyHistoricalPatches()` 方法自動套用歷史修正參數
  - 整合 StorageManager 儲存 Patch 至 localForage
  - 實作 Patch 查詢與過濾功能（依店家、文件類型、欄位名稱）
  - 在 OCR 流程中自動套用歷史 Patch
  - 撰寫單元測試驗證 Patch 記錄與套用邏輯
  - _Requirements: 7.4, 7.5_

- [ ] 17. 實作後台設定介面
  - 更新 `index.html` 後台設定頁新增同義詞管理區塊
  - 新增字符修正表管理區塊
  - 新增驗證規則管理區塊
  - 新增文件分類關鍵字管理區塊
  - 實作即時儲存與載入功能
  - 實作匯入/匯出字典功能（JSON 格式）
  - 更新 `js/app.js` 整合後台設定功能
  - _Requirements: 5.4, 8.4, 13.4_

## Phase 6: 整合與優化

- [ ] 18. 整合完整處理流程
  - 更新 `js/app.js` 整合所有新模組
  - 實作完整處理流程：上傳 → 前處理 → OCR → 分類 → ROI 抽取 → 同義詞映射 → 字符修正 → 驗算 → 覆核
  - 實作進度顯示與錯誤處理
  - 實作降級策略（前處理失敗時使用原始影像、分類失敗時使用 'other' 類型）
  - 更新 UI 顯示處理進度與結果
  - _Requirements: 1.1-15.5（整合所有需求）_

- [ ] 19. 更新智能分塊視覺化
  - 更新 `js/chunk-visualizer.js` 整合 ROI 視覺化
  - 在 canvas 上標註 ROI 區域與欄位類型
  - 實作 ROI 點擊事件顯示欄位詳細資訊
  - 新增文件類型標籤顯示
  - 更新圖例顯示 ROI 顏色對應
  - _Requirements: 4.6_

- [ ] 20. 優化匯出功能
  - 更新 `js/export.js` 使用標準 Schema 格式匯出
  - 實作 PDF 邊界完整性檢查
  - 實作自動調整頁面大小邏輯
  - 實作依文件類型分檔匯出
  - 實作匯出設定儲存與載入
  - 撰寫單元測試驗證匯出功能
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 21. 效能優化
  - 實作 Web Worker 執行 OCR 與影像處理
  - 實作 Progressive Loading 分批載入 JavaScript 庫
  - 實作影像快取避免重複處理
  - 實作 Lazy Initialization 延遲初始化非必要模組
  - 為 localForage 建立索引加速查詢
  - 使用 Chrome DevTools 進行效能分析與優化
  - 確保 OCR 處理時間 < 5 秒/頁
  - _Requirements: 1.2（Web Worker）_

## Phase 7: 測試與文件

- [ ] 22. 撰寫單元測試
  - 為 CharacterCorrector 撰寫單元測試
  - 為 SynonymMapper 撰寫單元測試
  - 為 DocumentClassifier 撰寫單元測試
  - 為 EnhancedValidator 撰寫單元測試
  - 為 ROIExtractor 撰寫單元測試
  - 使用 Jest 執行測試並確保覆蓋率 > 80%
  - _Requirements: 所有需求（測試驗證）_

- [ ] 23. 撰寫整合測試
  - 撰寫完整流程整合測試（上傳 → OCR → 分類 → 抽取 → 驗算 → 匯出）
  - 撰寫多文件類型測試（發票、水電單、勞健保繳費單）
  - 撰寫錯誤處理測試（模擬各種錯誤情境）
  - 撰寫效能測試（確保處理時間符合目標）
  - _Requirements: 所有需求（整合驗證）_

- [ ] 24. 更新專案文件
  - 更新 `README.md` 新增功能說明與使用指南
  - 新增依賴庫下載指引（Tesseract.js、OpenCV.js、localForage 等）
  - 新增設定指南（同義詞、字符修正表、驗證規則）
  - 新增故障排除指南
  - 新增效能優化建議
  - 新增瀏覽器相容性說明
  - _Requirements: 所有需求（文件化）_

- [ ] 25. 手動測試與驗收
  - 測試不同品質的影像（模糊、歪斜、陰影）
  - 測試不同店家/機構的單據版型
  - 測試覆核介面的易用性
  - 測試學習機制的有效性（重複處理相同店家單據）
  - 測試瀏覽器相容性（Chrome、Edge、Firefox、Safari）
  - 收集使用者回饋並進行優化
  - _Requirements: 所有需求（驗收）_
