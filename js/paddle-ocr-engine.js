/**
 * PaddleOCR Engine v5 with Handwriting Support
 * PP-OCRv5 原生支援手寫辨識
 */

import * as ocr from 'https://cdn.jsdelivr.net/npm/@paddle-js-models/ocr@4.1.1/+esm';

class PaddleOCREngine {
    constructor() {
        this.initialized = false;
        this.model = null;
        this.useHandwriting = false;
    }

    async initialize(options = {}) {
        if (this.initialized) return;

        console.log('🚀 初始化 PaddleOCR v5...');
        this.useHandwriting = options.handwriting || false;

        try {
            // PP-OCRv5 配置
            this.model = await ocr.init({
                // 使用 v5 模型（支援手寫）
                modelVersion: 'v5',
                // 語言：繁體中文 + 手寫
                lang: 'chinese_cht',
                // 手寫模式
                enableHandwriting: this.useHandwriting
            });

            this.initialized = true;
            const mode = this.useHandwriting ? '手寫模式' : '印刷模式';
            console.log(`✅ PaddleOCR v5 初始化完成 (${mode})`);
        } catch (error) {
            console.error('❌ PaddleOCR 初始化失敗:', error);
            throw error;
        }
    }

    async recognize(imageData, options = {}) {
        const handwriting = options.handwriting !== undefined ? options.handwriting : this.useHandwriting;

        // 如果模式改變，重新初始化
        if (this.initialized && handwriting !== this.useHandwriting) {
            console.log('🔄 切換辨識模式...');
            this.initialized = false;
            await this.initialize({ handwriting });
        } else if (!this.initialized) {
            await this.initialize({ handwriting });
        }

        const mode = handwriting ? '手寫' : '印刷';
        console.log(`🔍 開始 ${mode} OCR 辨識...`);

        try {
            const result = await ocr.recognize(imageData, {
                lang: 'ch',  // 繁體中文
                enableHandwriting: handwriting
            });

            // 格式化結果
            const formattedResult = {
                text: result.text,
                lines: result.lines.map(line => ({
                    text: line.text,
                    confidence: line.confidence,
                    bbox: line.bbox
                })),
                confidence: result.confidence,
                mode: mode
            };

            console.log(`✅ ${mode}辨識完成，信心度: ${(result.confidence * 100).toFixed(2)}%`);
            return formattedResult;

        } catch (error) {
            console.error(`❌ ${mode} OCR 辨識失敗:`, error);
            throw error;
        }
    }

    // 切換手寫模式
    setHandwritingMode(enabled) {
        if (enabled !== this.useHandwriting) {
            this.useHandwriting = enabled;
            this.initialized = false; // 強制重新初始化
            console.log(`🔄 已切換到${enabled ? '手寫' : '印刷'}模式`);
        }
    }
}

export default PaddleOCREngine;
