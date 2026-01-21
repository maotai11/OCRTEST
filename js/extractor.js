// ========================================
// 關鍵字擷取引擎
// ========================================

class Extractor {
    constructor() {
        this.keywords = ['金額', '小計', '合計', '總計', '銷售額', '稅額'];
    }

    /**
     * 設定關鍵字
     * @param {Array<string>} keywords - 關鍵字陣列
     */
    setKeywords(keywords) {
        this.keywords = keywords;
    }

    /**
     * 從 OCR 結果中擷取所有資訊
     * @param {Object} ocrResult - OCR 結果
     * @returns {Object} 擷取結果
     */
    extract(ocrResult) {
        const lines = ocrResult.lines || [];

        return {
            amounts: this.extractAmounts(lines),
            items: this.extractItems(lines),
            taxId: this.extractTaxId(lines),
            invoiceNo: this.extractInvoiceNo(lines),
            rawLines: lines
        };
    }

    /**
     * 擷取金額（根據關鍵字）
     * @param {Array} lines - OCR 行陣列
     * @returns {Array} 金額陣列
     */
    extractAmounts(lines) {
        const amounts = [];

        lines.forEach((line, index) => {
            const text = line.text;

            // 檢查是否包含關鍵字
            for (const keyword of this.keywords) {
                if (text.includes(keyword)) {
                    // 嘗試從同一行擷取金額
                    const amount = extractAmount(text);

                    if (amount !== null) {
                        amounts.push({
                            keyword,
                            amount,
                            rawText: text,
                            confidence: line.confidence,
                            needsReview: line.needsReview || amount === 0,
                            lineIndex: index
                        });
                    } else {
                        // 嘗試從下一行擷取
                        if (index + 1 < lines.length) {
                            const nextAmount = extractAmount(lines[index + 1].text);
                            if (nextAmount !== null) {
                                amounts.push({
                                    keyword,
                                    amount: nextAmount,
                                    rawText: `${text} ${lines[index + 1].text}`,
                                    confidence: Math.min(line.confidence, lines[index + 1].confidence),
                                    needsReview: line.needsReview || lines[index + 1].needsReview,
                                    lineIndex: index
                                });
                            }
                        }
                    }
                }
            }
        });

        return amounts;
    }

    /**
     * 擷取品項與金額行
     * @param {Array} lines - OCR 行陣列
     * @returns {Array} 品項陣列
     */
    extractItems(lines) {
        const items = [];

        lines.forEach((line, index) => {
            const text = line.text;
            const amount = extractAmount(text);

            // 如果該行包含金額，且不是關鍵字行
            if (amount !== null && !this.keywords.some(k => text.includes(k))) {
                // 移除金額後的文字作為品項名稱
                const itemName = text.replace(/NT\$?\s*[\d,]+(?:\.\d{1,2})?/gi, '')
                    .replace(/\$\s*[\d,]+(?:\.\d{1,2})?/g, '')
                    .replace(/[\d,]+(?:\.\d{1,2})?\s*元/g, '')
                    .trim();

                if (itemName) {
                    items.push({
                        name: itemName,
                        amount,
                        rawText: text,
                        confidence: line.confidence,
                        needsReview: line.needsReview,
                        lineIndex: index
                    });
                }
            }
        });

        return items;
    }

    /**
     * 擷取統一編號
     * @param {Array} lines - OCR 行陣列
     * @returns {Object|null} 統編資訊
     */
    extractTaxId(lines) {
        for (let i = 0; i < lines.length; i++) {
            const taxId = extractTaxId(lines[i].text);
            if (taxId && isValidTaxId(taxId)) {
                return {
                    taxId,
                    rawText: lines[i].text,
                    confidence: lines[i].confidence,
                    needsReview: lines[i].needsReview,
                    lineIndex: i
                };
            }
        }
        return null;
    }

    /**
     * 擷取發票字軌號碼
     * @param {Array} lines - OCR 行陣列
     * @returns {Object|null} 發票號碼資訊
     */
    extractInvoiceNo(lines) {
        for (let i = 0; i < lines.length; i++) {
            const invoiceNo = extractInvoiceNo(lines[i].text);
            if (invoiceNo && isValidInvoiceNo(invoiceNo)) {
                return {
                    invoiceNo,
                    rawText: lines[i].text,
                    confidence: lines[i].confidence,
                    needsReview: lines[i].needsReview,
                    lineIndex: i
                };
            }
        }
        return null;
    }

    /**
     * 批量擷取多個 OCR 結果
     * @param {Array} ocrResults - OCR 結果陣列
     * @returns {Array} 擷取結果陣列
     */
    extractBatch(ocrResults) {
        return ocrResults.map(result => this.extract(result));
    }
}

// 全域 Extractor 實例
const extractor = new Extractor();
