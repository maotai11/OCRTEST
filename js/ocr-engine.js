// ========================================
// OCR 引擎（Tesseract.js）
// ========================================

class OCREngine {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.lowConfidenceThreshold = 0.7; // 低於此值標註為需確認
    }

    /**
     * 初始化 OCR 引擎
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            showLoading('初始化 OCR 引擎...');

            // 建立 Tesseract Worker
            this.worker = await Tesseract.createWorker('chi_tra+eng', 1, {
                workerPath: 'lib/paddleocr/tesseract.min.js',
                langPath: 'lib/paddleocr/lang-data',
                corePath: 'lib/paddleocr/tesseract-core.wasm.js',
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        showLoading(`OCR 識別中... ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            this.isInitialized = true;
            hideLoading();
            showNotification('OCR 引擎初始化完成', 'success');
        } catch (error) {
            hideLoading();
            console.error('OCR 初始化失敗:', error);
            showNotification('OCR 引擎初始化失敗', 'error');
            throw error;
        }
    }

    /**
     * 識別圖片
     * @param {string|HTMLImageElement|HTMLCanvasElement} image - 圖片來源
     * @returns {Promise<Object>} OCR 結果
     */
    async recognize(image) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const result = await this.worker.recognize(image);
            return this.processResult(result);
        } catch (error) {
            console.error('OCR 識別失敗:', error);
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
                const needsReview = confidence < this.lowConfidenceThreshold;

                lines.push({
                    text,
                    confidence,
                    needsReview,
                    bbox: line.bbox,
                    words: line.words.map(w => ({
                        text: w.text,
                        confidence: w.confidence / 100
                    }))
                });
            });
        }

        return {
            text: result.data.text,
            lines,
            confidence: result.data.confidence / 100
        };
    }

    /**
     * 批量識別多張圖片
     * @param {Array} images - 圖片陣列
     * @param {Function} onProgress - 進度回調
     * @returns {Promise<Array>} OCR 結果陣列
     */
    async recognizeBatch(images, onProgress) {
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
                    lines: []
                });
            }
        }

        hideLoading();
        return results;
    }

    /**
     * 終止 OCR 引擎
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }

    /**
     * 設定低信心閾值
     * @param {number} threshold - 閾值 (0-1)
     */
    setLowConfidenceThreshold(threshold) {
        this.lowConfidenceThreshold = threshold;
    }
}

// 全域 OCR 引擎實例
const ocrEngine = new OCREngine();
