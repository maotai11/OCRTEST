// ========================================
// ROI Extractor
// 針對不同文件類型執行 ROI (Region of Interest) 欄位抽取
// ========================================

class ROIExtractor {
    constructor() {
        this.isInitialized = false;
        this.templates = null;
    }

    /**
     * 初始化 ROI 抽取器（載入模板）
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('ROIExtractor 已初始化');
            return;
        }

        try {
            // 嘗試從 StorageManager 載入自訂模板
            const customTemplates = await storageManager.loadDictionary('roiTemplates');
            
            if (customTemplates) {
                this.templates = customTemplates;
            } else {
                // 使用預設模板
                this.templates = this.getDefaultTemplates();
                // 儲存預設模板
                await storageManager.saveDictionary('roiTemplates', this.templates);
            }

            this.isInitialized = true;
            console.log('ROIExtractor 初始化完成');
        } catch (error) {
            console.error('ROIExtractor 初始化失敗:', error);
            // 降級：使用預設模板
            this.templates = this.getDefaultTemplates();
            this.isInitialized = true;
        }
    }

    /**
     * 取得預設 ROI 模板
     * @returns {Object} ROI 模板
     */
    getDefaultTemplates() {
        return {
            invoice: {
                invoiceNumber: {
                    region: 'top-right',
                    whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    keywords: ['發票號碼', '字軌', '發票字軌'],
                    pattern: /[A-Z]{2}\d{8}/
                },
                buyerTaxId: {
                    region: 'middle-left',
                    whitelist: '0123456789',
                    keywords: ['買受人', '買方統編', '統一編號'],
                    pattern: /\d{8}/
                },
                sellerTaxId: {
                    region: 'top-left',
                    whitelist: '0123456789',
                    keywords: ['賣方統編', '賣方', '統一編號'],
                    pattern: /\d{8}/
                },
                salesAmount: {
                    region: 'bottom-left',
                    whitelist: '0123456789.,',
                    keywords: ['銷售額', '應稅銷售額', '小計'],
                    pattern: /[\d,]+(?:\.\d{1,2})?/
                },
                taxAmount: {
                    region: 'bottom-left',
                    whitelist: '0123456789.,',
                    keywords: ['稅額', '營業稅'],
                    pattern: /[\d,]+(?:\.\d{1,2})?/
                },
                totalAmount: {
                    region: 'bottom-right',
                    whitelist: '0123456789.,',
                    keywords: ['總計', '合計', '總金額'],
                    pattern: /[\d,]+(?:\.\d{1,2})?/
                }
            },
            utility: {
                accountNumber: {
                    region: 'top-left',
                    whitelist: '0123456789-',
                    keywords: ['電號', '水號', '戶號', '用戶號碼'],
                    pattern: /[\d-]+/
                },
                dueDate: {
                    region: 'top-right',
                    whitelist: '0123456789/-年月日',
                    keywords: ['繳費期限', '到期日', '截止日'],
                    pattern: /\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}[日]?/
                },
                amountDue: {
                    region: 'bottom-right',
                    whitelist: '0123456789.,',
                    keywords: ['本期應繳', '應繳金額', '總計', '合計'],
                    pattern: /[\d,]+(?:\.\d{1,2})?/
                },
                usage: {
                    region: 'middle',
                    whitelist: '0123456789.',
                    keywords: ['本期用量', '度數', '用電度數', '用水度數'],
                    pattern: /[\d.]+/
                }
            },
            labor_health: {
                insuranceFee: {
                    region: 'middle-right',
                    whitelist: '0123456789.,',
                    keywords: ['保險費合計', '應繳金額', '合計', '總計'],
                    pattern: /[\d,]+(?:\.\d{1,2})?/
                },
                paymentNumber: {
                    region: 'top-right',
                    whitelist: '0123456789',
                    keywords: ['繳款書號', '繳款單號', '單號'],
                    pattern: /\d+/
                },
                insuredSalary: {
                    region: 'middle',
                    whitelist: '0123456789.,',
                    keywords: ['投保薪資', '月投保薪資'],
                    pattern: /[\d,]+/
                }
            }
        };
    }

    /**
     * 抽取欄位
     * @param {Object} ocrResult - OCR 結果
     * @param {string} docType - 文件類型
     * @param {HTMLCanvasElement} canvas - 原始圖片 canvas（用於 ROI OCR）
     * @returns {Promise<Object>} 抽取結果
     */
    async extractFields(ocrResult, docType, canvas = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // 如果沒有該文件類型的模板，返回空結果
        if (!this.templates[docType]) {
            console.warn(`沒有 ${docType} 的 ROI 模板`);
            return {
                docType,
                fields: {},
                rois: []
            };
        }

        const template = this.templates[docType];
        const fields = {};
        const rois = [];

        // 遍歷模板中的每個欄位
        for (const [fieldName, fieldConfig] of Object.entries(template)) {
            try {
                // 1. 使用關鍵字定位 ROI
                const roi = this.locateROI(ocrResult, fieldConfig);

                if (roi) {
                    rois.push({
                        fieldName,
                        ...roi
                    });

                    // 2. 如果有 canvas，執行 ROI OCR
                    if (canvas && enhancedOCREngine.isInitialized) {
                        const roiResult = await this.extractROI(canvas, roi, fieldConfig.whitelist);
                        fields[fieldName] = {
                            value: this.parseFieldValue(roiResult.text, fieldConfig),
                            rawValue: roiResult.text,
                            confidence: roiResult.confidence,
                            roi: roi,
                            method: 'roi-ocr'
                        };
                    } else {
                        // 3. 降級：從 OCR 文字中提取
                        const value = this.extractFromText(ocrResult.text, fieldConfig);
                        fields[fieldName] = {
                            value: value,
                            rawValue: value,
                            confidence: 0.6,
                            roi: roi,
                            method: 'text-extraction'
                        };
                    }
                } else {
                    // 無法定位 ROI，嘗試從全文提取
                    const value = this.extractFromText(ocrResult.text, fieldConfig);
                    if (value) {
                        fields[fieldName] = {
                            value: value,
                            rawValue: value,
                            confidence: 0.5,
                            roi: null,
                            method: 'fallback'
                        };
                    }
                }
            } catch (error) {
                console.error(`抽取欄位 ${fieldName} 失敗:`, error);
            }
        }

        return {
            docType,
            fields,
            rois
        };
    }

    /**
     * 定位 ROI 區域
     * @param {Object} ocrResult - OCR 結果
     * @param {Object} fieldConfig - 欄位配置
     * @returns {Object|null} ROI 邊界框
     */
    locateROI(ocrResult, fieldConfig) {
        const lines = ocrResult.lines || [];
        
        // 尋找包含關鍵字的行
        for (const line of lines) {
            for (const keyword of fieldConfig.keywords) {
                if (line.text.includes(keyword)) {
                    // 找到關鍵字，定義 ROI
                    const bbox = line.bbox;
                    
                    // 根據區域類型調整 ROI
                    return this.adjustROI(bbox, fieldConfig.region, ocrResult);
                }
            }
        }

        return null;
    }

    /**
     * 調整 ROI 區域
     * @param {Object} bbox - 原始邊界框
     * @param {string} region - 區域類型
     * @param {Object} ocrResult - OCR 結果
     * @returns {Object} 調整後的 ROI
     */
    adjustROI(bbox, region, ocrResult) {
        // 取得圖片尺寸（從 OCR 結果推測）
        const imageWidth = ocrResult.words && ocrResult.words.length > 0 ?
            Math.max(...ocrResult.words.map(w => w.bbox.x1 || w.bbox.x0 + 100)) : 800;
        const imageHeight = ocrResult.words && ocrResult.words.length > 0 ?
            Math.max(...ocrResult.words.map(w => w.bbox.y1 || w.bbox.y0 + 20)) : 600;

        // 基礎 ROI（關鍵字所在行的右側）
        let roi = {
            x: bbox.x1 || bbox.x0 + 100,
            y: bbox.y0,
            width: Math.min(200, imageWidth - (bbox.x1 || bbox.x0 + 100)),
            height: bbox.y1 - bbox.y0 || 30
        };

        // 根據區域類型調整
        switch (region) {
            case 'top-right':
                roi.x = imageWidth * 0.6;
                roi.y = 0;
                roi.width = imageWidth * 0.4;
                roi.height = imageHeight * 0.2;
                break;
            
            case 'top-left':
                roi.x = 0;
                roi.y = 0;
                roi.width = imageWidth * 0.4;
                roi.height = imageHeight * 0.2;
                break;
            
            case 'middle-left':
                roi.x = 0;
                roi.y = imageHeight * 0.3;
                roi.width = imageWidth * 0.4;
                roi.height = imageHeight * 0.4;
                break;
            
            case 'middle-right':
                roi.x = imageWidth * 0.6;
                roi.y = imageHeight * 0.3;
                roi.width = imageWidth * 0.4;
                roi.height = imageHeight * 0.4;
                break;
            
            case 'bottom-left':
                roi.x = 0;
                roi.y = imageHeight * 0.7;
                roi.width = imageWidth * 0.5;
                roi.height = imageHeight * 0.3;
                break;
            
            case 'bottom-right':
                roi.x = imageWidth * 0.5;
                roi.y = imageHeight * 0.7;
                roi.width = imageWidth * 0.5;
                roi.height = imageHeight * 0.3;
                break;
            
            case 'middle':
                roi.x = imageWidth * 0.2;
                roi.y = imageHeight * 0.3;
                roi.width = imageWidth * 0.6;
                roi.height = imageHeight * 0.4;
                break;
        }

        return roi;
    }

    /**
     * 執行 ROI OCR
     * @param {HTMLCanvasElement} canvas - 完整圖片 canvas
     * @param {Object} roi - ROI 邊界框
     * @param {string} whitelist - 字符白名單
     * @returns {Promise<Object>} OCR 結果
     */
    async extractROI(canvas, roi, whitelist) {
        try {
            return await enhancedOCREngine.recognizeROI(canvas, roi, whitelist);
        } catch (error) {
            console.error('ROI OCR 失敗:', error);
            return {
                text: '',
                confidence: 0,
                lines: []
            };
        }
    }

    /**
     * 從文字中提取欄位值（降級策略）
     * @param {string} text - 完整文字
     * @param {Object} fieldConfig - 欄位配置
     * @returns {string|null} 提取的值
     */
    extractFromText(text, fieldConfig) {
        // 尋找關鍵字附近的值
        for (const keyword of fieldConfig.keywords) {
            const keywordIndex = text.indexOf(keyword);
            if (keywordIndex !== -1) {
                // 取關鍵字後的文字
                const afterKeyword = text.substring(keywordIndex + keyword.length);
                
                // 使用 pattern 匹配
                const match = afterKeyword.match(fieldConfig.pattern);
                if (match) {
                    return match[0];
                }
            }
        }

        // 如果沒有找到關鍵字，嘗試在全文中匹配 pattern
        const match = text.match(fieldConfig.pattern);
        return match ? match[0] : null;
    }

    /**
     * 解析欄位值
     * @param {string} rawValue - 原始值
     * @param {Object} fieldConfig - 欄位配置
     * @returns {any} 解析後的值
     */
    parseFieldValue(rawValue, fieldConfig) {
        if (!rawValue) return null;

        // 移除空白
        let value = rawValue.trim();

        // 根據欄位類型解析
        if (fieldConfig.whitelist.includes('0123456789')) {
            // 數字欄位
            if (fieldConfig.whitelist.includes('.,')) {
                // 金額欄位
                value = value.replace(/[^\d.,]/g, '');
                return parseFloat(value.replace(/,/g, '')) || 0;
            } else {
                // 純數字欄位
                value = value.replace(/\D/g, '');
                return value;
            }
        }

        return value;
    }

    /**
     * 視覺化 ROI
     * @param {HTMLCanvasElement} canvas - 原始圖片 canvas
     * @param {Array} rois - ROI 陣列
     * @returns {HTMLCanvasElement} 標註後的 canvas
     */
    visualizeROI(canvas, rois) {
        // 建立新的 canvas
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const ctx = outputCanvas.getContext('2d');

        // 繪製原始圖片
        ctx.drawImage(canvas, 0, 0);

        // 繪製 ROI 框
        rois.forEach((roi, index) => {
            ctx.strokeStyle = this.getROIColor(index);
            ctx.lineWidth = 3;
            ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);

            // 繪製標籤
            ctx.fillStyle = this.getROIColor(index);
            ctx.font = '16px Arial';
            ctx.fillText(roi.fieldName, roi.x + 5, roi.y + 20);
        });

        return outputCanvas;
    }

    /**
     * 取得 ROI 顏色
     * @param {number} index - 索引
     * @returns {string} 顏色代碼
     */
    getROIColor(index) {
        const colors = [
            '#00d9ff', // 青色
            '#ff9500', // 橙色
            '#9d4edd', // 紫色
            '#00ff88', // 綠色
            '#ff006e', // 粉紅色
            '#ffbe0b'  // 黃色
        ];

        return colors[index % colors.length];
    }

    /**
     * 定義自訂 ROI
     * @param {string} docType - 文件類型
     * @param {string} fieldName - 欄位名稱
     * @param {Object} config - 欄位配置
     * @returns {Promise<void>}
     */
    async defineROI(docType, fieldName, config) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.templates[docType]) {
            this.templates[docType] = {};
        }

        this.templates[docType][fieldName] = config;

        // 儲存更新後的模板
        try {
            await storageManager.saveDictionary('roiTemplates', this.templates);
            console.log(`已定義 ${docType}.${fieldName} ROI`);
        } catch (error) {
            console.error('儲存 ROI 模板失敗:', error);
        }
    }

    /**
     * 取得所有模板
     * @returns {Object} ROI 模板
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * 重設為預設模板
     * @returns {Promise<void>}
     */
    async resetToDefault() {
        this.templates = this.getDefaultTemplates();
        
        try {
            await storageManager.saveDictionary('roiTemplates', this.templates);
            console.log('已重設為預設 ROI 模板');
        } catch (error) {
            console.error('重設 ROI 模板失敗:', error);
        }
    }
}

// 全域 ROIExtractor 實例
const roiExtractor = new ROIExtractor();
