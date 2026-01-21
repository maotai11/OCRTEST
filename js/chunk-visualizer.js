// ========================================
// 分塊視覺化工具 (Chunk Visualizer)
// 用於在圖片上繪製區塊邊界框和標籤
// ========================================

/**
 * 欄位類型顏色映射
 */
const FieldTypeColors = {
    INVOICE_NUMBER: '#3B82F6',    // 藍色 - 發票號碼
    TAX_ID_BUYER: '#10B981',      // 綠色 - 買方統編
    TAX_ID_SELLER: '#059669',     // 深綠色 - 賣方統編
    ITEMS_TABLE: '#F59E0B',       // 橙色 - 商品列表
    SALES_AMOUNT: '#8B5CF6',      // 紫色 - 銷售額
    TAX_AMOUNT: '#EC4899',        // 粉色 - 稅額
    TOTAL_AMOUNT: '#EF4444',      // 紅色 - 總計
    DATE: '#06B6D4',              // 青色 - 日期
    SELLER_NAME: '#6366F1',       // 靛色 - 賣方名稱
    BUYER_NAME: '#14B8A6',        // 青綠色 - 買方名稱
    OTHER: '#9CA3AF'              // 灰色 - 其他
};

/**
 * 欄位類型中文名稱
 */
const FieldTypeLabels = {
    INVOICE_NUMBER: '發票號碼',
    TAX_ID_BUYER: '買方統編',
    TAX_ID_SELLER: '賣方統編',
    ITEMS_TABLE: '商品列表',
    SALES_AMOUNT: '銷售額',
    TAX_AMOUNT: '稅額',
    TOTAL_AMOUNT: '總計',
    DATE: '日期',
    SELLER_NAME: '賣方名稱',
    BUYER_NAME: '買方名稱',
    OTHER: '其他'
};

/**
 * 分塊視覺化工具類別
 */
class ChunkVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.chunks = [];
        this.selectedChunkId = null;
        this.hoveredChunkId = null;

        // 顯示選項
        this.showBoundingBoxes = true;
        this.showLabels = true;
        this.showConfidence = true;

        // 縮放與平移
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /**
     * 初始化視覺化工具
     * @param {HTMLCanvasElement} canvas - 畫布元素
     */
    initialize(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 綁定事件
        this.bindEvents();
    }

    /**
     * 繪製所有區塊
     * @param {HTMLImageElement|string} image - 圖片元素或 base64
     * @param {Array<Object>} chunks - 區塊陣列
     */
    async drawChunks(image, chunks) {
        this.chunks = chunks;

        // 載入圖片
        if (typeof image === 'string') {
            this.image = await this.loadImage(image);
        } else {
            this.image = image;
        }

        // 設定畫布大小
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        // 清空畫布
        this.clear();

        // 繪製圖片
        this.ctx.drawImage(this.image, 0, 0);

        // 繪製所有區塊
        chunks.forEach(chunk => {
            this.drawChunk(chunk);
        });
    }

    /**
     * 繪製單一區塊
     * @param {Object} chunk - 區塊
     */
    drawChunk(chunk) {
        const bbox = chunk.bbox;
        const fieldType = chunk.fieldType || InvoiceFieldType.OTHER;
        const color = FieldTypeColors[fieldType] || FieldTypeColors.OTHER;

        // 判斷是否被選中或懸停
        const isSelected = chunk.id === this.selectedChunkId;
        const isHovered = chunk.id === this.hoveredChunkId;

        // 繪製邊界框
        if (this.showBoundingBoxes) {
            this.drawBoundingBox(bbox, color, isSelected, isHovered);
        }

        // 繪製標籤
        if (this.showLabels) {
            const label = FieldTypeLabels[fieldType] || '其他';
            const confidence = chunk.fieldInfo ? chunk.fieldInfo.confidence : 0;
            this.drawLabel(bbox, label, confidence, color);
        }
    }

    /**
     * 繪製邊界框
     * @param {Object} bbox - 邊界框 {x, y, width, height}
     * @param {string} color - 顏色
     * @param {boolean} isSelected - 是否被選中
     * @param {boolean} isHovered - 是否被懸停
     */
    drawBoundingBox(bbox, color, isSelected, isHovered) {
        const ctx = this.ctx;

        // 設定樣式
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 4 : (isHovered ? 3 : 2);
        ctx.setLineDash(isSelected ? [] : []);

        // 繪製矩形
        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

        // 如果被選中或懸停，繪製半透明填充
        if (isSelected || isHovered) {
            ctx.fillStyle = color + '20'; // 20 = 12.5% 透明度
            ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
        }

        // 重置線條樣式
        ctx.setLineDash([]);
    }

    /**
     * 繪製標籤
     * @param {Object} bbox - 邊界框
     * @param {string} label - 標籤文字
     * @param {number} confidence - 信心度
     * @param {string} color - 顏色
     */
    drawLabel(bbox, label, confidence, color) {
        const ctx = this.ctx;

        // 準備標籤文字
        let labelText = label;
        if (this.showConfidence && confidence > 0) {
            labelText += ` (${Math.round(confidence * 100)}%)`;
        }

        // 設定字體
        ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padding = 6;
        const labelHeight = 24;

        // 計算標籤位置（在邊界框上方）
        let labelX = bbox.x;
        let labelY = bbox.y - labelHeight - 4;

        // 如果標籤超出畫布頂部，放在邊界框內部
        if (labelY < 0) {
            labelY = bbox.y + 4;
        }

        // 繪製標籤背景
        ctx.fillStyle = color;
        ctx.fillRect(labelX, labelY, textWidth + padding * 2, labelHeight);

        // 繪製標籤文字
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + padding, labelY + labelHeight / 2);
    }

    /**
     * 高亮特定區塊
     * @param {string} chunkId - 區塊 ID
     */
    highlightChunk(chunkId) {
        this.selectedChunkId = chunkId;
        this.redraw();
    }

    /**
     * 取消高亮
     */
    clearHighlight() {
        this.selectedChunkId = null;
        this.redraw();
    }

    /**
     * 重新繪製
     */
    redraw() {
        if (!this.image || !this.chunks) return;

        this.clear();
        this.ctx.drawImage(this.image, 0, 0);
        this.chunks.forEach(chunk => this.drawChunk(chunk));
    }

    /**
     * 清空畫布
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 載入圖片
     * @param {string} src - 圖片來源（URL 或 base64）
     * @returns {Promise<HTMLImageElement>} 圖片元素
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * 綁定事件
     */
    bindEvents() {
        if (!this.canvas) return;

        // 滑鼠移動事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 檢查是否懸停在某個區塊上
            const hoveredChunk = this.findChunkAtPosition(x, y);

            if (hoveredChunk) {
                this.hoveredChunkId = hoveredChunk.id;
                this.canvas.style.cursor = 'pointer';
            } else {
                this.hoveredChunkId = null;
                this.canvas.style.cursor = 'default';
            }

            this.redraw();
        });

        // 點擊事件
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const clickedChunk = this.findChunkAtPosition(x, y);

            if (clickedChunk) {
                this.selectChunk(clickedChunk);
            } else {
                this.clearHighlight();
            }
        });

        // 滑鼠離開事件
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredChunkId = null;
            this.redraw();
        });
    }

    /**
     * 尋找指定位置的區塊
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     * @returns {Object|null} 區塊
     */
    findChunkAtPosition(x, y) {
        // 從後往前遍歷（後面的區塊在上層）
        for (let i = this.chunks.length - 1; i >= 0; i--) {
            const chunk = this.chunks[i];
            const bbox = chunk.bbox;

            if (x >= bbox.x && x <= bbox.x + bbox.width &&
                y >= bbox.y && y <= bbox.y + bbox.height) {
                return chunk;
            }
        }

        return null;
    }

    /**
     * 選擇區塊
     * @param {Object} chunk - 區塊
     */
    selectChunk(chunk) {
        this.selectedChunkId = chunk.id;
        this.redraw();

        // 觸發自訂事件
        const event = new CustomEvent('chunkSelected', {
            detail: { chunk }
        });
        this.canvas.dispatchEvent(event);
    }

    /**
     * 切換邊界框顯示
     */
    toggleBoundingBoxes() {
        this.showBoundingBoxes = !this.showBoundingBoxes;
        this.redraw();
    }

    /**
     * 切換標籤顯示
     */
    toggleLabels() {
        this.showLabels = !this.showLabels;
        this.redraw();
    }

    /**
     * 切換信心度顯示
     */
    toggleConfidence() {
        this.showConfidence = !this.showConfidence;
        this.redraw();
    }

    /**
     * 依類型篩選顯示
     * @param {Array<string>} types - 要顯示的類型陣列
     */
    filterByType(types) {
        // 暫存原始區塊
        if (!this.allChunks) {
            this.allChunks = [...this.chunks];
        }

        // 篩選區塊
        if (types.length === 0) {
            this.chunks = [...this.allChunks];
        } else {
            this.chunks = this.allChunks.filter(chunk =>
                types.includes(chunk.fieldType)
            );
        }

        this.redraw();
    }

    /**
     * 重置篩選
     */
    resetFilter() {
        if (this.allChunks) {
            this.chunks = [...this.allChunks];
            this.redraw();
        }
    }

    /**
     * 匯出標註後的圖片
     * @returns {string} base64 圖片
     */
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * 取得區塊統計資訊
     * @returns {Object} 統計資訊
     */
    getStatistics() {
        const stats = {
            total: this.chunks.length,
            byType: {}
        };

        this.chunks.forEach(chunk => {
            const type = chunk.fieldType || InvoiceFieldType.OTHER;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        return stats;
    }

    /**
     * 建立圖例
     * @returns {Array<Object>} 圖例項目
     */
    createLegend() {
        const legend = [];
        const typeSet = new Set();

        this.chunks.forEach(chunk => {
            const type = chunk.fieldType || InvoiceFieldType.OTHER;
            if (!typeSet.has(type)) {
                typeSet.add(type);
                legend.push({
                    type: type,
                    label: FieldTypeLabels[type] || '其他',
                    color: FieldTypeColors[type] || FieldTypeColors.OTHER,
                    count: this.chunks.filter(c => c.fieldType === type).length
                });
            }
        });

        return legend;
    }
}

// 全域 ChunkVisualizer 實例
const chunkVisualizer = new ChunkVisualizer();
