// ========================================
// 發票欄位識別器 (Invoice Field Detector)
// 專門用於識別發票的各種欄位區域
// ========================================

/**
 * 發票欄位類型常數
 */
const InvoiceFieldType = {
    INVOICE_NUMBER: 'INVOICE_NUMBER',    // 發票號碼
    TAX_ID_BUYER: 'TAX_ID_BUYER',        // 買方統編
    TAX_ID_SELLER: 'TAX_ID_SELLER',      // 賣方統編
    ITEMS_TABLE: 'ITEMS_TABLE',          // 商品列表
    SALES_AMOUNT: 'SALES_AMOUNT',        // 銷售額
    TAX_AMOUNT: 'TAX_AMOUNT',            // 稅額
    TOTAL_AMOUNT: 'TOTAL_AMOUNT',        // 總計
    DATE: 'DATE',                        // 日期
    SELLER_NAME: 'SELLER_NAME',          // 賣方名稱
    BUYER_NAME: 'BUYER_NAME',            // 買方名稱
    OTHER: 'OTHER'                       // 其他
};

/**
 * 發票欄位識別器類別
 */
class InvoiceDetector {
    constructor() {
        // 發票號碼模式
        this.invoiceNumberPatterns = [
            /[A-Z]{2}[-\s]?\d{8}/,           // AB-12345678 或 AB 12345678
            /[A-Z]{2}\d{8}/,                 // AB12345678
            /發票[號号]\s*[:：]?\s*([A-Z]{2}[-\s]?\d{8})/
        ];

        // 統編模式
        this.taxIdPatterns = [
            /\d{8}/,                         // 8位數字
            /統[一编編]\s*[號号编編碼码]\s*[:：]?\s*(\d{8})/,
            /稅[籍號号]\s*[:：]?\s*(\d{8})/
        ];

        // 金額關鍵字
        this.amountKeywords = {
            sales: ['銷售額', '小計', '未稅金額', '税前金额'],
            tax: ['稅額', '營業稅', '增值稅', '税额'],
            total: ['總計', '合計', '總額', '应付金额', '總金額']
        };

        // 日期模式
        this.datePatterns = [
            /(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})[日]?/,  // 2026-01-18 或 2026年01月18日
            /(\d{3})[-\/年](\d{1,2})[-\/月](\d{1,2})[日]?/   // 民國年 115-01-18
        ];

        // 買方/賣方關鍵字
        this.buyerKeywords = ['買方', '買受人', '购方', '客户'];
        this.sellerKeywords = ['賣方', '賣方', '销方', '供应商', '開立人'];
    }

    /**
     * 偵測所有發票欄位
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object} 發票欄位資訊
     */
    detectAllFields(chunks, lines) {
        const fields = {
            invoiceNumber: this.detectInvoiceNumber(chunks, lines),
            taxIds: this.detectTaxIds(chunks, lines),
            itemsTable: this.detectItemsTable(chunks, lines),
            amounts: this.detectAmounts(chunks, lines),
            date: this.detectDate(chunks, lines),
            names: this.detectNames(chunks, lines)
        };

        // 計算整體信心度
        fields.overallConfidence = this.calculateOverallConfidence(fields);

        return fields;
    }

    /**
     * 偵測發票號碼
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object|null} 發票號碼資訊
     */
    detectInvoiceNumber(chunks, lines) {
        let bestMatch = null;
        let bestScore = 0;

        // 遍歷所有區塊
        chunks.forEach((chunk, chunkIndex) => {
            const text = documentChunker.getChunkText(chunk);

            // 嘗試每個模式
            this.invoiceNumberPatterns.forEach(pattern => {
                const match = text.match(pattern);
                if (match) {
                    const invoiceNo = match[1] || match[0];

                    // 計算信心度分數
                    let score = 0.5; // 基礎分數

                    // 位置加分（發票號碼通常在頂部）
                    if (chunkIndex < chunks.length * 0.3) {
                        score += 0.3;
                    }

                    // 關鍵字加分
                    if (/發票[號号]/.test(text)) {
                        score += 0.2;
                    }

                    // OCR 信心度加分
                    const ocrConfidence = documentChunker.getChunkConfidence(chunk);
                    score += ocrConfidence * 0.1;

                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = {
                            value: invoiceNo.replace(/[-\s]/g, ''),
                            rawValue: invoiceNo,
                            chunk: chunk,
                            confidence: Math.min(score, 1.0),
                            type: InvoiceFieldType.INVOICE_NUMBER
                        };
                    }
                }
            });
        });

        return bestMatch;
    }

    /**
     * 偵測統編（買方/賣方）
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object} 統編資訊
     */
    detectTaxIds(chunks, lines) {
        const taxIds = [];

        chunks.forEach((chunk, chunkIndex) => {
            const text = documentChunker.getChunkText(chunk);

            // 尋找統編
            this.taxIdPatterns.forEach(pattern => {
                const matches = text.matchAll(new RegExp(pattern, 'g'));
                for (const match of matches) {
                    const taxId = match[1] || match[0];

                    // 驗證統編格式
                    if (/^\d{8}$/.test(taxId)) {
                        let score = 0.5;
                        let fieldType = InvoiceFieldType.OTHER;

                        // 判斷是買方還是賣方
                        const isBuyer = this.buyerKeywords.some(kw => text.includes(kw));
                        const isSeller = this.sellerKeywords.some(kw => text.includes(kw));

                        if (isBuyer) {
                            score += 0.3;
                            fieldType = InvoiceFieldType.TAX_ID_BUYER;
                        } else if (isSeller) {
                            score += 0.3;
                            fieldType = InvoiceFieldType.TAX_ID_SELLER;
                        } else {
                            // 根據位置推測（賣方通常在上方）
                            if (chunkIndex < chunks.length * 0.4) {
                                fieldType = InvoiceFieldType.TAX_ID_SELLER;
                                score += 0.1;
                            } else {
                                fieldType = InvoiceFieldType.TAX_ID_BUYER;
                                score += 0.1;
                            }
                        }

                        // 關鍵字加分
                        if (/統[一编編]|稅籍/.test(text)) {
                            score += 0.2;
                        }

                        taxIds.push({
                            value: taxId,
                            chunk: chunk,
                            confidence: Math.min(score, 1.0),
                            type: fieldType,
                            isValid: isValidTaxId(taxId)
                        });
                    }
                }
            });
        });

        // 區分買方和賣方
        const buyer = taxIds.find(t => t.type === InvoiceFieldType.TAX_ID_BUYER);
        const seller = taxIds.find(t => t.type === InvoiceFieldType.TAX_ID_SELLER);

        return { buyer, seller, all: taxIds };
    }

    /**
     * 偵測商品列表表格
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object|null} 商品表格資訊
     */
    detectItemsTable(chunks, lines) {
        let bestMatch = null;
        let bestScore = 0;

        chunks.forEach((chunk, chunkIndex) => {
            // 表格特徵：多行、包含數字、對齊一致
            if (chunk.lines.length < 2) return;

            const text = documentChunker.getChunkText(chunk);
            let score = 0;

            // 特徵 1: 包含多個數字
            const numberCount = (text.match(/\d+/g) || []).length;
            if (numberCount >= chunk.lines.length) {
                score += 0.3;
            }

            // 特徵 2: 對齊一致
            if (chunk.alignment && chunk.alignment.confidence > 0.7) {
                score += 0.2;
            }

            // 特徵 3: 包含表格關鍵字
            const tableKeywords = ['品名', '數量', '單價', '金額', '小計', '项目', '数量'];
            const hasTableKeywords = tableKeywords.some(kw => text.includes(kw));
            if (hasTableKeywords) {
                score += 0.3;
            }

            // 特徵 4: 位置（通常在中間）
            if (chunkIndex > chunks.length * 0.2 && chunkIndex < chunks.length * 0.8) {
                score += 0.2;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    chunk: chunk,
                    confidence: Math.min(score, 1.0),
                    type: InvoiceFieldType.ITEMS_TABLE,
                    items: this.parseTableItems(chunk)
                };
            }
        });

        return bestMatch;
    }

    /**
     * 解析表格項目
     * @param {Object} chunk - 表格區塊
     * @returns {Array} 項目陣列
     */
    parseTableItems(chunk) {
        const items = [];

        chunk.lines.forEach(line => {
            const text = line.text;

            // 嘗試擷取金額
            const amount = extractAmount(text);

            if (amount !== null) {
                // 移除金額後的文字作為品名
                const name = text.replace(/NT\$?\s*[\d,]+(?:\.\d{1,2})?/gi, '')
                    .replace(/\$\s*[\d,]+(?:\.\d{1,2})?/g, '')
                    .replace(/[\d,]+(?:\.\d{1,2})?\s*元/g, '')
                    .trim();

                items.push({
                    name: name || '未知商品',
                    amount: amount,
                    rawText: text,
                    confidence: line.confidence || 0.5
                });
            }
        });

        return items;
    }

    /**
     * 偵測金額欄位（銷售額、稅額、總計）
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object} 金額資訊
     */
    detectAmounts(chunks, lines) {
        const amounts = {
            sales: null,
            tax: null,
            total: null
        };

        chunks.forEach((chunk, chunkIndex) => {
            const text = documentChunker.getChunkText(chunk);

            // 偵測銷售額
            this.amountKeywords.sales.forEach(keyword => {
                if (text.includes(keyword)) {
                    const amount = extractAmount(text);
                    if (amount !== null && (!amounts.sales || amount > 0)) {
                        amounts.sales = {
                            value: amount,
                            keyword: keyword,
                            chunk: chunk,
                            confidence: 0.8,
                            type: InvoiceFieldType.SALES_AMOUNT
                        };
                    }
                }
            });

            // 偵測稅額
            this.amountKeywords.tax.forEach(keyword => {
                if (text.includes(keyword)) {
                    const amount = extractAmount(text);
                    if (amount !== null && (!amounts.tax || amount > 0)) {
                        amounts.tax = {
                            value: amount,
                            keyword: keyword,
                            chunk: chunk,
                            confidence: 0.8,
                            type: InvoiceFieldType.TAX_AMOUNT
                        };
                    }
                }
            });

            // 偵測總計
            this.amountKeywords.total.forEach(keyword => {
                if (text.includes(keyword)) {
                    const amount = extractAmount(text);
                    if (amount !== null && (!amounts.total || amount > 0)) {
                        amounts.total = {
                            value: amount,
                            keyword: keyword,
                            chunk: chunk,
                            confidence: 0.9,
                            type: InvoiceFieldType.TOTAL_AMOUNT
                        };
                    }
                }
            });
        });

        // 驗證金額關係（總計 = 銷售額 + 稅額）
        if (amounts.sales && amounts.tax && amounts.total) {
            const calculatedTotal = amounts.sales.value + amounts.tax.value;
            const diff = Math.abs(calculatedTotal - amounts.total.value);

            if (diff < 1) { // 容許 1 元誤差
                amounts.sales.confidence = 0.95;
                amounts.tax.confidence = 0.95;
                amounts.total.confidence = 0.95;
            }
        }

        return amounts;
    }

    /**
     * 偵測日期
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object|null} 日期資訊
     */
    detectDate(chunks, lines) {
        let bestMatch = null;
        let bestScore = 0;

        chunks.forEach((chunk, chunkIndex) => {
            const text = documentChunker.getChunkText(chunk);

            this.datePatterns.forEach(pattern => {
                const match = text.match(pattern);
                if (match) {
                    let year = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const day = parseInt(match[3]);

                    // 如果是民國年，轉換為西元年
                    if (year < 1000) {
                        year += 1911;
                    }

                    let score = 0.5;

                    // 位置加分（日期通常在頂部）
                    if (chunkIndex < chunks.length * 0.3) {
                        score += 0.3;
                    }

                    // 關鍵字加分
                    if (/日期|開立|开立/.test(text)) {
                        score += 0.2;
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = {
                            value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                            year: year,
                            month: month,
                            day: day,
                            chunk: chunk,
                            confidence: Math.min(score, 1.0),
                            type: InvoiceFieldType.DATE
                        };
                    }
                }
            });
        });

        return bestMatch;
    }

    /**
     * 偵測買方/賣方名稱
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Array} lines - 原始文字行
     * @returns {Object} 名稱資訊
     */
    detectNames(chunks, lines) {
        const names = {
            buyer: null,
            seller: null
        };

        chunks.forEach(chunk => {
            const text = documentChunker.getChunkText(chunk);

            // 偵測買方名稱
            this.buyerKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    const name = text.replace(keyword, '').replace(/[:：]/g, '').trim();
                    if (name && name.length > 0) {
                        names.buyer = {
                            value: name,
                            chunk: chunk,
                            confidence: 0.7,
                            type: InvoiceFieldType.BUYER_NAME
                        };
                    }
                }
            });

            // 偵測賣方名稱
            this.sellerKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    const name = text.replace(keyword, '').replace(/[:：]/g, '').trim();
                    if (name && name.length > 0) {
                        names.seller = {
                            value: name,
                            chunk: chunk,
                            confidence: 0.7,
                            type: InvoiceFieldType.SELLER_NAME
                        };
                    }
                }
            });
        });

        return names;
    }

    /**
     * 計算整體信心度
     * @param {Object} fields - 欄位資訊
     * @returns {number} 整體信心度
     */
    calculateOverallConfidence(fields) {
        const confidences = [];

        if (fields.invoiceNumber) confidences.push(fields.invoiceNumber.confidence);
        if (fields.taxIds.buyer) confidences.push(fields.taxIds.buyer.confidence);
        if (fields.taxIds.seller) confidences.push(fields.taxIds.seller.confidence);
        if (fields.amounts.total) confidences.push(fields.amounts.total.confidence);

        if (confidences.length === 0) return 0;

        return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    }

    /**
     * 為區塊標註欄位類型
     * @param {Array<Object>} chunks - 區塊陣列
     * @param {Object} fields - 偵測到的欄位
     * @returns {Array<Object>} 標註後的區塊
     */
    annotateChunks(chunks, fields) {
        const annotated = chunks.map(chunk => ({
            ...chunk,
            fieldType: InvoiceFieldType.OTHER,
            fieldInfo: null
        }));

        // 標註發票號碼
        if (fields.invoiceNumber) {
            const chunk = annotated.find(c => c.id === fields.invoiceNumber.chunk.id);
            if (chunk) {
                chunk.fieldType = InvoiceFieldType.INVOICE_NUMBER;
                chunk.fieldInfo = fields.invoiceNumber;
            }
        }

        // 標註統編
        if (fields.taxIds.buyer) {
            const chunk = annotated.find(c => c.id === fields.taxIds.buyer.chunk.id);
            if (chunk) {
                chunk.fieldType = InvoiceFieldType.TAX_ID_BUYER;
                chunk.fieldInfo = fields.taxIds.buyer;
            }
        }

        if (fields.taxIds.seller) {
            const chunk = annotated.find(c => c.id === fields.taxIds.seller.chunk.id);
            if (chunk) {
                chunk.fieldType = InvoiceFieldType.TAX_ID_SELLER;
                chunk.fieldInfo = fields.taxIds.seller;
            }
        }

        // 標註商品表格
        if (fields.itemsTable) {
            const chunk = annotated.find(c => c.id === fields.itemsTable.chunk.id);
            if (chunk) {
                chunk.fieldType = InvoiceFieldType.ITEMS_TABLE;
                chunk.fieldInfo = fields.itemsTable;
            }
        }

        // 標註金額
        ['sales', 'tax', 'total'].forEach(key => {
            if (fields.amounts[key]) {
                const chunk = annotated.find(c => c.id === fields.amounts[key].chunk.id);
                if (chunk) {
                    chunk.fieldType = fields.amounts[key].type;
                    chunk.fieldInfo = fields.amounts[key];
                }
            }
        });

        // 標註日期
        if (fields.date) {
            const chunk = annotated.find(c => c.id === fields.date.chunk.id);
            if (chunk) {
                chunk.fieldType = InvoiceFieldType.DATE;
                chunk.fieldInfo = fields.date;
            }
        }

        return annotated;
    }
}

// 全域 InvoiceDetector 實例
const invoiceDetector = new InvoiceDetector();
