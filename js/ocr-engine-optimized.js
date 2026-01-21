// ========================================
// OCR 引擎（Tesseract.js）- 優化版
// ========================================

class OCREngine {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.lowConfidenceThreshold = 0.7; // 低於此值標註為需確認
    }

    /**
     * 初始化 OCR 引擎（優化版）
     */
    async initialize() {
        // 如果已經初始化，直接返回
        if (this.isInitialized) {
            console.log('OCR 引擎已初始化，跳過');
            return;
        }

        // 如果正在初始化，等待完成
        if (this.isInitializing) {
            console.log('OCR 引擎正在初始化，等待中...');
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isInitializing = true;

        try {
            showLoading('初始化 OCR 引擎...');

            // 建立 Tesseract Worker
            // 使用本地語言資料（更快！）
            this.worker = await Tesseract.createWorker('chi_tra+eng', 1, {
                langPath: 'lib/paddleocr/lang-data',  // 使用本地語言資料
                logger: (m) => {
                    // 顯示詳細的初始化進度
                    if (m.status === 'loading tesseract core') {
                        showLoading('📦 載入 OCR 核心引擎...');
                    } else if (m.status === 'initializing tesseract') {
                        showLoading('⚙️ 初始化 OCR 引擎...');
                    } else if (m.status === 'loading language traineddata') {
                        const progress = Math.round(m.progress * 100);
                        showLoading(`📥 載入語言資料... ${progress}%`);
                        console.log(`語言資料載入進度: ${progress}%`);
                    } else if (m.status === 'initializing api') {
                        showLoading('🔧 準備 OCR API...');
                    } else if (m.status === 'recognizing text') {
                        showLoading(`🔍 OCR 識別中... ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            this.isInitialized = true;
            this.isInitializing = false;
            hideLoading();
            showNotification('✅ OCR 引擎初始化完成！', 'success');
            console.log('OCR 引擎初始化成功');
        } catch (error) {
            this.isInitializing = false;
            hideLoading();
            console.error('OCR 初始化失敗:', error);
            showNotification('❌ OCR 引擎初始化失敗，請檢查網路連線', 'error');
            throw error;
        }
    }

    /**
     * 預載 OCR 引擎（在應用啟動時呼叫）
     */
    async preload() {
        console.log('開始預載 OCR 引擎...');
        try {
            await this.initialize();
        } catch (error) {
            console.error('預載失敗，將在首次使用時重試');
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
            console.log('OCR 引擎已終止');
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

// 🚀 應用啟動時預載 OCR 引擎（可選）
// 取消註解下面這行可以在頁面載入時就開始初始化 OCR
// document.addEventListener('DOMContentLoaded', () => ocrEngine.preload());
