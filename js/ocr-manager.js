/**
 * OCR Engine Integration
 * 整合 Tesseract.js 和 PaddleOCR.js
 * 自動選擇最佳引擎
 */

import PaddleOCREngine from './paddle-ocr-engine.js';

class OCRManager {
    constructor() {
        this.paddleEngine = new PaddleOCREngine();
        this.currentEngine = 'paddle'; // 預設用 PaddleOCR
    }

    async recognize(imageData, options = {}) {
        const engine = options.engine || this.currentEngine;

        console.log(`使用引擎: ${engine}`);

        try {
            if (engine === 'paddle') {
                return await this.paddleEngine.recognize(imageData, options);
            }
            // 未來可以加入其他引擎
        } catch (error) {
            console.error(`${engine} 引擎失敗:`, error);
            throw error;
        }
    }

    // 檢測是否為手寫文字
    detectHandwriting(imageData) {
        // 簡單啟發式判斷
        // 實際可用 ML 模型判斷
        return false; // 預設先關閉
    }
}

export default OCRManager;
