# Design Document

## Overview

本設計文件定義了 OCR 發票辨識系統的強化架構，目標是透過整合多個免費 JavaScript 庫來提升辨識準確率，並擴展系統支援混雜單據類型。系統採用純靜態網頁架構，完全離線運行，並透過多層次的資料處理流程達到接近 100% 的資料正確率。

### Design Goals

1. **高準確率**：透過影像前處理、ROI 抽取、強驗算與人工覆核達到接近 100% 正確率
2. **可擴展性**：支援新增文件類型、同義詞與驗證規則
3. **離線運行**：所有處理完全在瀏覽器端執行，無需後端服務
4. **學習能力**：透過 localForage 沉澱使用者修正記錄，越用越準
5. **使用者友善**：提供直觀的覆核介面與即時驗算回饋

### Technology Stack

- **OCR 引擎**：Tesseract.js 5.x（繁體中文 + 英文）
- **影像處理**：OpenCV.js WASM
- **PDF 處理**：PDF.js
- **本地儲存**：localForage（IndexedDB 優先）
- **金額計算**：Decimal.js
- **資料驗證**：Ajv + validator.js
- **批量上傳**：Dropzone
- **影像預覽**：Viewer.js + Panzoom
- **匯出功能**：html2canvas + jsPDF
- **工具函式**：lodash

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  (Upload → Preview → OCR → Chunking → Validation → Export)  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ File Manager │  │ OCR Manager  │  │ Data Manager │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Processing Pipeline                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Image Preprocessing (OpenCV.js)                   │   │
│  │    ├─ Grayscale Conversion                           │   │
│  │    ├─ Adaptive Thresholding                          │   │
│  │    ├─ Denoising & Sharpening                         │   │
│  │    └─ Deskew & Perspective Correction                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2. OCR Recognition (Tesseract.js)                    │   │
│  │    ├─ Text Extraction                                │   │
│  │    ├─ Confidence Scoring                             │   │
│  │    └─ Bounding Box Detection                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 3. Document Classification                          │   │
│  │    ├─ Keyword Matching                              │   │
│  │    ├─ Type Detection (Invoice/Utility/Labor/Other)  │   │
│  │    └─ Confidence Scoring                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 4. ROI Field Extraction                              │   │
│  │    ├─ Template Matching                              │   │
│  │    ├─ Region-based OCR                               │   │
│  │    └─ Character Whitelist Filtering                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 5. Synonym Mapping & Normalization                   │   │
│  │    ├─ Field Name Mapping                             │   │
│  │    ├─ Character Correction                           │   │
│  │    └─ Standard Schema Conversion                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 6. Validation & Verification                         │   │
│  │    ├─ Amount Calculation (Decimal.js)                │   │
│  │    ├─ Format Validation (validator.js)               │   │
│  │    ├─ Schema Validation (Ajv)                        │   │
│  │    └─ Business Rule Checking                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 7. Human Review & Learning                           │   │
│  │    ├─ Error Highlighting                             │   │
│  │    ├─ Manual Correction                              │   │
│  │    └─ Patch Recording (localForage)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Data Storage Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ User Data    │  │ Dictionaries │  │ Patches      │      │
│  │ (localForage)│  │ (localForage)│  │ (localForage)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
File Upload → PDF/Image Processing → Image Preprocessing → OCR
     ↓
Document Classification → ROI Extraction → Synonym Mapping
     ↓
Validation → Human Review → Data Storage → Export
```

## Components and Interfaces

### 1. Image Preprocessing Module (ImagePreprocessor)

**Purpose**: 使用 OpenCV.js 進行影像前處理以提升 OCR 準確率

**Interface**:
```javascript
class ImagePreprocessor {
    constructor()
    async initialize()
    async preprocessImage(imageData, mode = 'speed')
    async grayscaleConversion(mat)
    async adaptiveThreshold(mat)
    async denoise(mat)
    async sharpen(mat)
    async deskew(mat)
    async perspectiveCorrection(mat)
    getBeforeAfterPreview(originalMat, processedMat)
}
```

**Key Methods**:
- `preprocessImage(imageData, mode)`: 主要前處理入口
  - `mode = 'speed'`: 灰階 + 自適應二值化
  - `mode = 'precision'`: 完整處理（去噪 + 對比 + 二值化 + 去斜 + 透視校正）
- `deskew(mat)`: 傾斜校正（偵測角度並旋轉）
- `perspectiveCorrection(mat)`: 透視校正（找紙張四角並拉正）

**Dependencies**: OpenCV.js WASM

### 2. Enhanced OCR Engine (EnhancedOCREngine)

**Purpose**: 整合 Tesseract.js 並提供進階 OCR 功能

**Interface**:
```javascript
class EnhancedOCREngine {
    constructor()
    async initialize()
    async recognize(image, options = {})
    async recognizeROI(image, bbox, whitelist = null)
    async recognizeBatch(images, onProgress)
    setConfidenceThreshold(threshold)
    terminate()
}
```

**Key Features**:
- 支援 Web Worker 避免 UI 卡死
- 支援 ROI（Region of Interest）辨識
- 支援字符白名單（例如數字欄位只允許 0-9）
- 返回文字、信心度與邊界框資訊

**Dependencies**: Tesseract.js

### 3. Document Classifier (DocumentClassifier)

**Purpose**: 自動分類文件類型（發票/水電/勞健保/其他）

**Interface**:
```javascript
class DocumentClassifier {
    constructor()
    loadKeywords(dictionaries)
    classify(ocrText)
    getClassificationConfidence(ocrText, docType)
    addCustomKeywords(docType, keywords)
}
```

**Classification Logic**:
```javascript
// Layer 2: Document Classification Keywords
const classificationKeywords = {
    invoice: ['統一發票', '發票號碼', '稅額', '營業稅', '買受人', '賣方', '發票字軌'],
    utility: ['電號', '用電度數', '水號', '本期', '繳費期限', '電費', '水費', '台電', '自來水'],
    labor_health: ['勞保', '健保', '投保薪資', '保險費', '被保險人', '保險證號', '繳款書'],
    other: [] // 預設分類
};
```

**Dependencies**: lodash（用於關鍵字匹配與計分）

### 4. ROI Extractor (ROIExtractor)

**Purpose**: 針對不同文件類型執行 ROI 欄位抽取

**Interface**:
```javascript
class ROIExtractor {
    constructor()
    loadTemplates(templates)
    extractFields(ocrResult, docType)
    defineROI(fieldName, bbox, whitelist)
    extractROI(image, roi, ocrEngine)
    visualizeROI(image, rois)
}
```

**ROI Templates**:
```javascript
const roiTemplates = {
    invoice: {
        invoiceNumber: { region: 'top-right', whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' },
        buyerTaxId: { region: 'middle-left', whitelist: '0123456789' },
        salesAmount: { region: 'bottom-left', whitelist: '0123456789.,' },
        taxAmount: { region: 'bottom-left', whitelist: '0123456789.,' },
        totalAmount: { region: 'bottom-right', whitelist: '0123456789.,' }
    },
    utility: {
        accountNumber: { region: 'top-left', whitelist: '0123456789' },
        dueDate: { region: 'top-right', whitelist: '0123456789/-' },
        amountDue: { region: 'bottom-right', whitelist: '0123456789.,' }
    },
    labor_health: {
        insuranceFee: { region: 'middle-right', whitelist: '0123456789.,' },
        paymentNumber: { region: 'top-right', whitelist: '0123456789' }
    }
};
```

**Dependencies**: EnhancedOCREngine, DocumentChunker

### 5. Synonym Mapper (SynonymMapper)

**Purpose**: 將不同單據的欄位名稱統一映射到標準欄位

**Interface**:
```javascript
class SynonymMapper {
    constructor()
    async loadDictionaries()
    mapFieldName(rawFieldName)
    mapFieldValue(fieldName, rawValue)
    addSynonym(standardField, synonym)
    getSynonyms(standardField)
    saveDictionaries()
}
```

**Dictionary Structure**:
```javascript
// Layer 1: Field Synonyms
const fieldSynonyms = {
    total: ['總計', '合計', '應繳', '應繳金額', '本期應繳', '應付金額', '繳納金額'],
    tax: ['稅額', '營業稅', 'VAT', 'Tax'],
    subtotal: ['銷售額', '應稅銷售額', '金額', '小計'],
    docNo: ['發票號碼', '字軌', '繳費單號', '電號', '水號', '保險證號'],
    buyerId: ['統一編號', '統編', '買受人統編', '身分證字號'],
    period: ['期間', '本期', '繳費期限', '開立日期']
};

// Layer 3: Vendor-specific Aliases
const vendorAliases = {
    '台電': { amountDue: '本期電費' },
    '自來水': { amountDue: '本期水費' },
    '健保局': { insuranceFee: '保險費合計' }
};
```

**Dependencies**: localForage

### 6. Character Corrector (CharacterCorrector)

**Purpose**: 自動修正常見 OCR 錯字

**Interface**:
```javascript
class CharacterCorrector {
    constructor()
    async loadCorrectionTable()
    correctText(text, fieldType)
    addCorrectionRule(from, to, fieldType = 'all')
    saveCorrectionTable()
}
```

**Correction Table**:
```javascript
const characterCorrections = {
    digit: {
        'O': '0', 'o': '0',
        'I': '1', 'l': '1', '|': '1',
        'S': '5', 's': '5',
        'B': '8',
        'Z': '2'
    },
    punctuation: {
        '，': ',',
        '。': '.',
        '　': ' ' // 全形空格 → 半形空格
    },
    currency: {
        'NT＄': 'NT$',
        '＄': '$',
        '元': ''
    }
};
```

**Dependencies**: localForage

### 7. Validation Engine (EnhancedValidator)

**Purpose**: 強化驗算邏輯，支援多種文件類型

**Interface**:
```javascript
class EnhancedValidator {
    constructor()
    async loadValidationRules()
    validate(extractedData, docType)
    validateInvoice(data)
    validateUtility(data)
    validateLaborHealth(data)
    addCustomRule(ruleName, ruleFunction)
    saveValidationRules()
}
```

**Validation Rules**:
```javascript
const validationRules = {
    invoice: [
        { name: 'salesTaxTotal', fn: (data) => validateSalesTaxTotal(data) },
        { name: 'taxIdMatch', fn: (data) => validateTaxIdMatch(data) },
        { name: 'invoiceNumberFormat', fn: (data) => validateInvoiceNumberFormat(data) }
    ],
    utility: [
        { name: 'amountDuePositive', fn: (data) => data.total > 0 },
        { name: 'dueDateValid', fn: (data) => isValidDate(data.dueDate) }
    ],
    labor_health: [
        { name: 'insuranceFeePositive', fn: (data) => data.total > 0 }
    ]
};
```

**Dependencies**: Decimal.js, validator.js, Ajv

### 8. Human Review Interface (ReviewManager)

**Purpose**: 提供人工覆核介面與修正記錄

**Interface**:
```javascript
class ReviewManager {
    constructor()
    displayReviewItems(validationResults)
    showFieldROI(fieldName, originalImage, bbox)
    handleFieldCorrection(fieldName, oldValue, newValue)
    savePatch(patch)
    applyHistoricalPatches(vendor, docType)
}
```

**Patch Structure**:
```javascript
const patch = {
    id: 'patch_123',
    timestamp: '2026-01-22T10:30:00Z',
    userId: 'user_001',
    vendor: '台電',
    docType: 'utility',
    fieldName: 'amountDue',
    oldValue: '1,234',
    newValue: '1,284',
    reason: 'OCR誤認4為3',
    roiOffset: { x: 10, y: -5 } // ROI 位置微調
};
```

**Dependencies**: localForage, Viewer.js

### 9. Storage Manager (StorageManager)

**Purpose**: 管理 localForage 資料儲存與讀取

**Interface**:
```javascript
class StorageManager {
    constructor()
    async initialize()
    async saveUserData(userId, data)
    async loadUserData(userId)
    async saveDictionary(dictionaryName, data)
    async loadDictionary(dictionaryName)
    async savePatches(patches)
    async loadPatches(filters = {})
    async clearUserData(userId)
}
```

**Storage Schema**:
```javascript
// IndexedDB Structure
{
    users: {
        user_001: {
            username: 'John',
            taxId: '12345678',
            settings: { ... },
            lastLogin: '2026-01-22T10:30:00Z'
        }
    },
    dictionaries: {
        fieldSynonyms: { ... },
        classificationKeywords: { ... },
        vendorAliases: { ... },
        characterCorrections: { ... }
    },
    patches: [
        { id: 'patch_001', ... },
        { id: 'patch_002', ... }
    ],
    processedDocuments: [
        { id: 'doc_001', ... },
        { id: 'doc_002', ... }
    ]
}
```

**Dependencies**: localForage

### 10. PDF Processor (EnhancedPDFProcessor)

**Purpose**: 高 DPI PDF 渲染與頁面處理

**Interface**:
```javascript
class EnhancedPDFProcessor {
    constructor()
    async loadPDF(file)
    async renderPage(pageNum, dpiScale = 2.0)
    async renderAllPages(dpiScale = 2.0, onProgress)
    getPageCount()
    extractMetadata()
}
```

**Key Features**:
- 支援 2x~4x DPI 提升清晰度
- 逐頁渲染並顯示進度
- 返回高解析度 canvas 供 OCR 使用

**Dependencies**: PDF.js

## Data Models

### Standard Output Schema

所有文件類型最終都會轉換為統一的標準 schema：

```javascript
const standardSchema = {
    // 基本資訊
    id: 'doc_001',
    docType: 'invoice', // invoice | utility | labor_health | other
    fileName: 'invoice_001.pdf',
    processedAt: '2026-01-22T10:30:00Z',
    userId: 'user_001',
    
    // 文件識別
    buyerId: '12345678', // 統編/身分證/用戶統編
    docNo: 'AB12345678', // 發票字軌/繳費單號/電號水號
    period: '2026-01', // 期間（YYYY-MM 或起訖日）
    date: '2026-01-15', // 開立日期
    
    // 金額資訊
    amountSubtotal: 1000, // 小計/銷售額
    tax: 50, // 稅額
    total: 1050, // 總計
    
    // 明細（可選）
    amountItems: [
        { name: '商品A', amount: 500, quantity: 1 },
        { name: '商品B', amount: 500, quantity: 2 }
    ],
    
    // 驗算結果
    checks: {
        isValid: true,
        errors: [],
        warnings: [],
        details: {
            'salesTaxTotal': { isValid: true, message: '驗算通過' },
            'taxIdMatch': { isValid: true, message: '統編核對通過' }
        }
    },
    
    // 原始資料（可選）
    rawText: '統一發票\n...',
    ocrConfidence: 0.92,
    
    // 人工修正記錄
    patches: [
        {
            fieldName: 'total',
            oldValue: 1040,
            newValue: 1050,
            timestamp: '2026-01-22T10:35:00Z'
        }
    ],
    
    // 元資料
    metadata: {
        vendor: '台電',
        classification: {
            docType: 'utility',
            confidence: 0.95,
            matchedKeywords: ['電號', '用電度數', '台電']
        },
        preprocessing: {
            mode: 'precision',
            deskewAngle: 2.5
        }
    }
};
```

### ROI Definition Model

```javascript
const roiDefinition = {
    fieldName: 'totalAmount',
    bbox: { x: 100, y: 200, width: 150, height: 30 },
    whitelist: '0123456789.,',
    confidence: 0.85,
    extractedValue: '1,050',
    normalizedValue: 1050
};
```

### Validation Result Model

```javascript
const validationResult = {
    isValid: false,
    errors: [
        {
            rule: 'salesTaxTotal',
            message: '銷售額 + 稅額 ≠ 總計',
            expected: 1050,
            actual: 1040,
            diff: -10
        }
    ],
    warnings: [
        '統編信心度較低，建議人工確認'
    ],
    details: {
        'salesTaxTotal': {
            isValid: false,
            message: '銷售額 + 稅額 ≠ 總計',
            expected: 1050,
            actual: 1040,
            diff: -10
        }
    }
};
```

## Error Handling

### Error Types

1. **OCR Initialization Error**: Tesseract.js 或 OpenCV.js 載入失敗
2. **File Processing Error**: 檔案格式不支援或損壞
3. **Classification Error**: 無法判斷文件類型
4. **Validation Error**: 驗算失敗
5. **Storage Error**: localForage 讀寫失敗

### Error Handling Strategy

```javascript
try {
    // 1. 影像前處理
    const preprocessedImage = await imagePreprocessor.preprocessImage(image, 'precision');
} catch (error) {
    console.error('影像前處理失敗:', error);
    // 降級策略：使用原始影像
    preprocessedImage = image;
}

try {
    // 2. OCR 識別
    const ocrResult = await ocrEngine.recognize(preprocessedImage);
} catch (error) {
    console.error('OCR 識別失敗:', error);
    showNotification('OCR 識別失敗，請檢查影像品質', 'error');
    return null;
}

try {
    // 3. 文件分類
    const docType = documentClassifier.classify(ocrResult.text);
} catch (error) {
    console.error('文件分類失敗:', error);
    // 降級策略：使用 'other' 類型
    docType = 'other';
}
```

## Testing Strategy

### Unit Testing

使用 Jest 進行單元測試，涵蓋以下模組：

1. **CharacterCorrector**: 測試字符修正規則
2. **SynonymMapper**: 測試同義詞映射邏輯
3. **DocumentClassifier**: 測試文件分類準確率
4. **EnhancedValidator**: 測試驗算規則

### Integration Testing

1. **完整流程測試**: 上傳 → OCR → 分類 → 抽取 → 驗算 → 匯出
2. **多文件類型測試**: 發票、水電單、勞健保繳費單
3. **錯誤處理測試**: 模擬各種錯誤情境

### Manual Testing

1. **影像品質測試**: 測試不同品質的影像（模糊、歪斜、陰影）
2. **版型測試**: 測試不同店家/機構的單據版型
3. **使用者體驗測試**: 測試覆核介面的易用性

## Performance Considerations

### Optimization Strategies

1. **Web Worker**: OCR 與影像處理使用 Web Worker 避免 UI 卡死
2. **Progressive Loading**: 分批載入 JavaScript 庫，優先載入核心功能
3. **Image Caching**: 快取處理後的影像避免重複處理
4. **Lazy Initialization**: 延遲初始化非必要模組（例如 OpenCV.js）
5. **IndexedDB Indexing**: 為 localForage 建立索引加速查詢

### Performance Metrics

- OCR 處理時間：< 5 秒/頁（含前處理）
- 文件分類時間：< 100ms
- 驗算時間：< 50ms
- 資料儲存時間：< 200ms

## Security Considerations

### Data Privacy

1. **完全離線**: 所有資料處理在瀏覽器端執行，不傳送至伺服器
2. **本地儲存**: 使用 IndexedDB 儲存敏感資料，不使用 localStorage
3. **資料加密**: 考慮使用 Web Crypto API 加密敏感欄位（如統編）

### Input Validation

1. **檔案類型驗證**: 只接受圖片與 PDF 檔案
2. **檔案大小限制**: 單檔不超過 10MB
3. **XSS 防護**: 所有使用者輸入都經過 sanitization

## Deployment Strategy

### CDN Resources

所有第三方庫都從 CDN 載入，並提供本地備援：

```html
<!-- Tesseract.js -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
        onerror="this.src='lib/tesseract/tesseract.min.js'"></script>

<!-- OpenCV.js -->
<script src="https://cdn.jsdelivr.net/npm/@techstark/opencv-js/opencv.js"
        onerror="this.src='lib/opencv/opencv.js'"></script>

<!-- PDF.js -->
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.min.js"
        onerror="this.src='lib/pdfjs/pdf.min.js'"></script>

<!-- localForage -->
<script src="https://cdn.jsdelivr.net/npm/localforage@latest/dist/localforage.min.js"
        onerror="this.src='lib/localforage/localforage.min.js'"></script>

<!-- Decimal.js -->
<script src="https://cdn.jsdelivr.net/npm/decimal.js@latest/decimal.min.js"
        onerror="this.src='lib/decimal/decimal.min.js'"></script>

<!-- Ajv -->
<script src="https://cdn.jsdelivr.net/npm/ajv@latest/dist/ajv.min.js"
        onerror="this.src='lib/ajv/ajv.min.js'"></script>

<!-- validator.js -->
<script src="https://cdn.jsdelivr.net/npm/validator@latest/validator.min.js"
        onerror="this.src='lib/validator/validator.min.js'"></script>

<!-- lodash -->
<script src="https://cdn.jsdelivr.net/npm/lodash@latest/lodash.min.js"
        onerror="this.src='lib/lodash/lodash.min.js'"></script>

<!-- Dropzone -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dropzone/6.0.0-beta.2/dropzone.min.js"
        onerror="this.src='lib/dropzone/dropzone.min.js'"></script>

<!-- Viewer.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.6/viewer.min.js"
        onerror="this.src='lib/viewerjs/viewer.min.js'"></script>

<!-- Panzoom -->
<script src="https://cdn.jsdelivr.net/npm/panzoom@latest/dist/panzoom.min.js"
        onerror="this.src='lib/panzoom/panzoom.min.js'"></script>
```

### Browser Compatibility

- Chrome 90+（推薦）
- Edge 90+
- Firefox 88+
- Safari 14+（部分功能可能受限）

### File Structure

```
ocr-reconciliation-tool/
├── index.html
├── css/
│   ├── design-system.css
│   ├── layout.css
│   ├── components.css
│   └── export.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── utils.js
│   ├── enhanced-ocr-engine.js          # 新增
│   ├── image-preprocessor.js           # 新增
│   ├── document-classifier.js          # 新增
│   ├── roi-extractor.js                # 新增
│   ├── synonym-mapper.js               # 新增
│   ├── character-corrector.js          # 新增
│   ├── enhanced-validator.js           # 新增
│   ├── review-manager.js               # 新增
│   ├── storage-manager.js              # 新增
│   ├── enhanced-pdf-processor.js       # 新增
│   ├── chunker.js                      # 保留
│   ├── invoice-detector.js             # 保留
│   ├── chunk-visualizer.js             # 保留
│   └── export.js                       # 保留
├── lib/
│   ├── tesseract/
│   ├── opencv/
│   ├── pdfjs/
│   ├── localforage/
│   ├── decimal/
│   ├── ajv/
│   ├── validator/
│   ├── lodash/
│   ├── dropzone/
│   ├── viewerjs/
│   ├── panzoom/
│   ├── html2canvas/
│   └── jspdf/
└── README.md
```

## Migration Plan

### Phase 1: 基礎設施（Week 1-2）

1. 整合 Tesseract.js 取代 PaddleOCR
2. 整合 OpenCV.js 影像前處理
3. 整合 localForage 本地儲存
4. 整合 Decimal.js 金額計算

### Phase 2: 核心功能（Week 3-4）

1. 實作 DocumentClassifier
2. 實作 ROIExtractor
3. 實作 SynonymMapper
4. 實作 CharacterCorrector

### Phase 3: 驗算與覆核（Week 5-6）

1. 實作 EnhancedValidator
2. 實作 ReviewManager
3. 整合 Ajv 與 validator.js
4. 實作 Patch 記錄與學習機制

### Phase 4: 優化與測試（Week 7-8）

1. 效能優化（Web Worker、快取）
2. 完整測試（單元測試、整合測試）
3. 使用者體驗優化
4. 文件撰寫

## Future Enhancements

1. **機器學習模型**: 整合 ONNX Runtime 執行小型模型進行版面分析
2. **多語言支援**: 擴展至英文、日文單據
3. **雲端同步**: 可選的雲端備份功能
4. **行動版**: PWA 支援行動裝置拍照上傳
5. **API 整合**: 與會計軟體（如 QuickBooks）整合
