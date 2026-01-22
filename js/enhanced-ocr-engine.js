// ========================================
// Enhanced OCR Engine (Tesseract.js)
// 支援 Web Worker、ROI 辨識與字符白名單
// ========================================

class EnhancedOCREngine {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.confidenceThreshold = 0.7; // 低於此值標註為需確認
        this.defaultLanguage = 'chi_tra+eng'; // 繁體中文 + 英文
    }

    /**
     * 初始化 OCR 引擎
     * @param {string} language - 語言包 (預設: chi_tra+eng)
     * @returns {Promise<void>}
     */
    async initialize(language = null) {
        if (this.isInitialized) {
            console.log('OCR 引擎已初始化');
            return;
        }

        const lang = language || this.defaultLanguage;

        try {
            showLoading('初始化 OCR 引擎...');

            // 建立 Tesseract Worker (使用 Web Worker)
            this.worker = await Tesseract.createWorker(lang, 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        showLoading(`OCR 識別中... ${progress}%`);
                    }
                }
            });

            this.isInitialized = true;
            hideLoading();
            console.log('OCR 引擎初始化完成');
            showNotification('OCR 引擎初始化完成', 'success');
        } catch (error) {
            hideLoading();
            console.error('OCR 初始化失敗:', error);
            showNotification('OCR 引擎初始化失敗: ' + error.message, 'error');
            throw error;
        }
    }

    /**
     * 預載 OCR 引擎（登入後立即執行）
     * @returns {Promise<void>}
     */
    async preload() {
        try {
            await this.initialize();
        } catch (error) {
            console.warn('OCR 預載失敗，將在首次使用時重試:', error);
        }
    }

    /**
     * 識別圖片
     * @param {string|HTMLImageElement|HTMLCanvasElement} image - 圖片來源
     * @param {Object} options - 選項
     * @param {string} options.whitelist - 字符白名單
     * @param {boolean} options.numeric - 是否只識別數字
     * @returns {Promise<Object>} OCR 結果
     */
    async recognize(image, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // 設定 Tesseract 參數
            const tesseractOptions = {};
            
            // 字符白名單
            if (options.whitelist) {
                tesseractOptions.tessedit_char_whitelist = options.whitelist;
            } else if (options.numeric) {
                tesseractOptions.tessedit_char_whitelist = '0123456789.,';
            }

            // 執行 OCR
            const result = await this.worker.recognize(image, tesseractOptions);
            
            // 處理結果
            return this.processResult(result);
        } catch (error) {
            console.error('OCR 識別失敗:', error);
            throw error;
        }
    }

    /**
     * 識別 ROI (Region of Interest)
     * @param {HTMLCanvasElement} canvas - 完整圖片 canvas
     * @param {Object} bbox - 邊界框 {x, y, width, height}
     * @param {string} whitelist - 字符白名單
     * @returns {Promise<Object>} OCR 結果
     */
    async recognizeROI(canvas, bbox, whitelist = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // 裁切 ROI 區域
            const roiCanvas = document.createElement('canvas');
            roiCanvas.width = bbox.width;
            roiCanvas.height = bbox.height;
            const ctx = roiCanvas.getContext('2d');
            
            ctx.drawImage(
                canvas,
                bbox.x, bbox.y, bbox.width, bbox.height,
                0, 0, bbox.width, bbox.height
            );

            // 執行 OCR
            const options = whitelist ? { whitelist } : {};
            const result = await this.recognize(roiCanvas, options);

            return {
                ...result,
                roi: bbox
            };
        } catch (error) {
            console.error('ROI OCR 識別失敗:', error);
            throw error;
        }
    }

    /**
     * 處理 OCR 結果
     * @param {Object} result - Tesseract 原始結果
     * @returns {Object} 處理後的結果
     */
    processResult(result) {
        const lines = [];

        // 處理每一行
        if (result.data && result.data.lines) {
            result.data.lines.forEach((line) => {
                const text = line.text.trim();
                if (!text) return;

                const confidence = line.confidence / 100; // 轉換為 0-1
                const needsReview = confidence < this.confidenceThreshold;

                lines.push({
                    text,
                    confidence,
                    needsReview,
                    bbox: line.bbox,
                    words: line.words.map(w => ({
                        text: w.text,
                        confidence: w.confidence / 100,
                        bbox: w.bbox
                    }))
                });
            });
        }

        return {
            text: result.data.text,
            lines,
            confidence: result.data.confidence / 100,
            words: result.data.words ? result.data.words.map(w => ({
                text: w.text,
                confidence: w.confidence / 100,
                bbox: w.bbox
            })) : []
        };
    }

    /**
     * 批量識別多張圖片
     * @param {Array} images - 圖片陣列
     * @param {Function} onProgress - 進度回調 (current, total, result)
     * @returns {Promise<Array>} OCR 結果陣列
     */
    async recognizeBatch(images, onProgress = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const results = [];

        for (let i = 0; i < images.length; i++) {
            showLoading(`OCR 識別中... ${i + 1}/${images.length}`);

            try {
                const result = await this.recognize(images[i]);
                results.push(result);

                if (onProgress) {
                    onProgress(i + 1, images.length, result);
                }
            } catch (error) {
                console.error(`圖片 ${i + 1} 識別失敗:`, error);
                results.push({
                    error: error.message,
                    lines: [],
                    text: '',
                    confidence: 0
                });
            }
        }

        hideLoading();
        return results;
    }

    /**
     * 設定信心度閾值
     * @param {number} threshold - 閾值 (0-1)
     */
    setConfidenceThreshold(threshold) {
        if (threshold >= 0 && threshold <= 1) {
            this.confidenceThreshold = threshold;
            console.log(`信心度閾值已設定為: ${threshold}`);
        } else {
            console.warn('信心度閾值必須在 0-1 之間');
        }
    }

    /**
     * 終止 OCR 引擎
     * @returns {Promise<void>}
     */
    async terminate() {
        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
                this.isInitialized = false;
                console.log('OCR 引擎已終止');
            } catch (error) {
                console.error('OCR 引擎終止失敗:', error);
            }
        }
    }

    /**
     * 取得引擎狀態
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            confidenceThreshold: this.confidenceThreshold,
            language: this.defaultLanguage
        };
    }
}

// 全域 Enhanced OCR 引擎實例
const enhancedOCREngine = new EnhancedOCREngine();

// 向後相容：保留舊的 ocrEngine 變數名稱
const ocrEngine = enhancedOCREngine;
