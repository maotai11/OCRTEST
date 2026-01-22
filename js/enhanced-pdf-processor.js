// ========================================
// Enhanced PDF Processor
// 高 DPI PDF 渲染與頁面處理
// ========================================

class EnhancedPDFProcessor {
    constructor() {
        this.pdf = null;
        this.defaultDpiScale = 2.0; // 預設 2x DPI
    }

    /**
     * 載入 PDF
     * @param {File|ArrayBuffer} file - PDF 檔案或 ArrayBuffer
     * @returns {Promise<void>}
     */
    async loadPDF(file) {
        try {
            let arrayBuffer;

            if (file instanceof File) {
                arrayBuffer = await file.arrayBuffer();
            } else if (file instanceof ArrayBuffer) {
                arrayBuffer = file;
            } else {
                throw new Error('不支援的檔案格式');
            }

            // 載入 PDF
            this.pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            console.log(`PDF 載入完成，共 ${this.pdf.numPages} 頁`);

            return this.pdf;
        } catch (error) {
            console.error('PDF 載入失敗:', error);
            throw error;
        }
    }

    /**
     * 渲染單一頁面
     * @param {number} pageNum - 頁碼（從 1 開始）
     * @param {number} dpiScale - DPI 縮放比例（1.0 = 72 DPI, 2.0 = 144 DPI）
     * @returns {Promise<HTMLCanvasElement>} 渲染後的 canvas
     */
    async renderPage(pageNum, dpiScale = null) {
        if (!this.pdf) {
            throw new Error('PDF 未載入');
        }

        if (pageNum < 1 || pageNum > this.pdf.numPages) {
            throw new Error(`頁碼超出範圍：${pageNum}`);
        }

        const scale = dpiScale || this.defaultDpiScale;

        try {
            // 取得頁面
            const page = await this.pdf.getPage(pageNum);

            // 計算 viewport
            const viewport = page.getViewport({ scale });

            // 建立 canvas
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const context = canvas.getContext('2d');

            // 渲染頁面
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            console.log(`頁面 ${pageNum} 渲染完成 (${viewport.width}x${viewport.height}, ${scale}x DPI)`);

            return canvas;
        } catch (error) {
            console.error(`渲染頁面 ${pageNum} 失敗:`, error);
            throw error;
        }
    }

    /**
     * 渲染所有頁面
     * @param {number} dpiScale - DPI 縮放比例
     * @param {Function} onProgress - 進度回調 (current, total, canvas)
     * @returns {Promise<Array<HTMLCanvasElement>>} 渲染後的 canvas 陣列
     */
    async renderAllPages(dpiScale = null, onProgress = null) {
        if (!this.pdf) {
            throw new Error('PDF 未載入');
        }

        const canvases = [];
        const totalPages = this.pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            showLoading(`渲染 PDF 頁面... ${i}/${totalPages}`);

            try {
                const canvas = await this.renderPage(i, dpiScale);
                canvases.push(canvas);

                if (onProgress) {
                    onProgress(i, totalPages, canvas);
                }
            } catch (error) {
                console.error(`渲染頁面 ${i} 失敗:`, error);
                // 繼續處理下一頁
            }
        }

        hideLoading();
        return canvases;
    }

    /**
     * 取得頁面數量
     * @returns {number} 頁面數量
     */
    getPageCount() {
        return this.pdf ? this.pdf.numPages : 0;
    }

    /**
     * 擷取 PDF 元資料
     * @returns {Promise<Object>} 元資料
     */
    async extractMetadata() {
        if (!this.pdf) {
            throw new Error('PDF 未載入');
        }

        try {
            const metadata = await this.pdf.getMetadata();
            
            return {
                info: metadata.info || {},
                metadata: metadata.metadata || null,
                numPages: this.pdf.numPages,
                fingerprints: this.pdf.fingerprints || []
            };
        } catch (error) {
            console.error('擷取 PDF 元資料失敗:', error);
            return {
                info: {},
                metadata: null,
                numPages: this.pdf.numPages,
                fingerprints: []
            };
        }
    }

    /**
     * 取得頁面文字內容（如果 PDF 包含文字層）
     * @param {number} pageNum - 頁碼
     * @returns {Promise<string>} 文字內容
     */
    async getPageText(pageNum) {
        if (!this.pdf) {
            throw new Error('PDF 未載入');
        }

        try {
            const page = await this.pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // 組合文字
            const text = textContent.items
                .map(item => item.str)
                .join(' ');

            return text;
        } catch (error) {
            console.error(`取得頁面 ${pageNum} 文字失敗:`, error);
            return '';
        }
    }

    /**
     * 取得所有頁面的文字內容
     * @returns {Promise<Array<string>>} 文字內容陣列
     */
    async getAllPagesText() {
        if (!this.pdf) {
            throw new Error('PDF 未載入');
        }

        const texts = [];
        const totalPages = this.pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            try {
                const text = await this.getPageText(i);
                texts.push(text);
            } catch (error) {
                console.error(`取得頁面 ${i} 文字失敗:`, error);
                texts.push('');
            }
        }

        return texts;
    }

    /**
     * 設定預設 DPI 縮放比例
     * @param {number} scale - 縮放比例
     */
    setDefaultDpiScale(scale) {
        if (scale > 0 && scale <= 4) {
            this.defaultDpiScale = scale;
            console.log(`預設 DPI 縮放比例已設定為: ${scale}x`);
        } else {
            console.warn('DPI 縮放比例必須在 0-4 之間');
        }
    }

    /**
     * 取得建議的 DPI 縮放比例
     * @param {number} pageNum - 頁碼
     * @returns {Promise<number>} 建議的縮放比例
     */
    async getSuggestedDpiScale(pageNum) {
        if (!this.pdf) {
            throw new Error('PDF 未載入');
        }

        try {
            const page = await this.pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            // 如果頁面尺寸較小，使用較高的 DPI
            if (viewport.width < 600 || viewport.height < 800) {
                return 3.0; // 小頁面使用 3x DPI
            } else if (viewport.width < 1000 || viewport.height < 1400) {
                return 2.0; // 中等頁面使用 2x DPI
            } else {
                return 1.5; // 大頁面使用 1.5x DPI
            }
        } catch (error) {
            console.error('取得建議 DPI 失敗:', error);
            return 2.0; // 預設 2x
        }
    }

    /**
     * 釋放資源
     */
    destroy() {
        if (this.pdf) {
            this.pdf.destroy();
            this.pdf = null;
            console.log('PDF 資源已釋放');
        }
    }
}

// 全域 EnhancedPDFProcessor 實例
const enhancedPDFProcessor = new EnhancedPDFProcessor();
