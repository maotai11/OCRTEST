/**
 * PaddleOCR Engine with Handwriting Support
 * 使用 @paddle-js-models/ocr
 */

import * as ocr from 'https://cdn.jsdelivr.net/npm/@paddle-js-models/ocr@4.1.1/+esm';

class PaddleOCREngine {
    constructor() {
        this.initialized = false;
        this.model = null;
    }

    async initialize(options = {}) {
        if (this.initialized) return;

        console.log('🚀 初始化 PaddleOCR...');

        try {
            // 初始化模型
            this.model = await ocr.init({
                // 模型配置
                detPath: 'https://paddleocr.bj.bcebos.com/PP-OCRv3/chinese/ch_PP-OCRv3_det_infer.tar',
                recPath: 'https://paddleocr.bj.bcebos.com/PP-OCRv3/chinese/ch_PP-OCRv3_rec_infer.tar',
                // 支援手寫
                useHandwriting: options.handwriting || false
            });

            this.initialized = true;
            console.log('✅ PaddleOCR 初始化完成');
        } catch (error) {
            console.error('❌ PaddleOCR 初始化失敗:', error);
            throw error;
        }
    }

    async recognize(imageData, options = {}) {
        if (!this.initialized) {
            await this.initialize(options);
        }

        console.log('🔍 開始 OCR 辨識...');

        try {
            const result = await ocr.recognize(imageData, {
                lang: options.lang || 'ch',
                // 手寫模式
                useHandwriting: options.handwriting || false
            });

            // 格式化結果
            const formattedResult = {
                text: result.text,
                lines: result.lines.map(line => ({
                    text: line.text,
                    confidence: line.confidence,
                    bbox: line.bbox
                })),
                confidence: result.confidence
            };

            console.log('✅ 辨識完成');
            return formattedResult;

        } catch (error) {
            console.error('❌ OCR 辨識失敗:', error);
            throw error;
        }
    }
}

export default PaddleOCREngine;
