// ========================================
// 文件分塊引擎 (Document Chunker)
// 整合 Chunkr 的分塊邏輯，用於智能識別文件區域
// ========================================

/**
 * 區塊類型常數
 */
const ChunkType = {
    TITLE: 'TITLE',              // 標題
    HEADER: 'HEADER',            // 表頭
    TABLE: 'TABLE',              // 表格
    PARAGRAPH: 'PARAGRAPH',      // 段落
    LIST: 'LIST',                // 列表
    FOOTER: 'FOOTER',            // 頁尾
    UNKNOWN: 'UNKNOWN'           // 未知
};

/**
 * 文件分塊引擎類別
 * 負責將 OCR 結果分割成有意義的區塊
 */
class DocumentChunker {
    constructor() {
        // 垂直間距閾值（相對於平均行高）
        this.verticalSpacingThreshold = 1.5;

        // 水平對齊容差（像素）
        this.horizontalAlignmentTolerance = 10;

        // 最小區塊行數
        this.minChunkLines = 1;
    }

    /**
     * 分析文件佈局並建立區塊
     * @param {Object} ocrResult - OCR 結果
     * @returns {Array<Object>} 區塊陣列
     */
    analyzeLayout(ocrResult) {
        const lines = ocrResult.lines || [];

        if (lines.length === 0) {
            return [];
        }

        // 步驟 1: 計算邊界框（如果沒有的話）
        const linesWithBBox = this.ensureBoundingBoxes(lines);

        // 步驟 2: 計算垂直間距
        const spacings = this.calculateVerticalSpacing(linesWithBBox);

        // 步驟 3: 偵測顯著空白區域
        const whitespaceIndices = this.detectWhitespace(spacings);

        // 步驟 4: 根據空白區域建立區塊
        const chunks = this.createChunks(linesWithBBox, whitespaceIndices);

        // 步驟 5: 分析水平對齊
        chunks.forEach(chunk => {
            chunk.alignment = this.analyzeHorizontalAlignment(chunk.lines);
        });

        // 步驟 6: 分類區塊類型
        this.classifyChunks(chunks);

        // 步驟 7: 合併相關區塊
        const mergedChunks = this.mergeRelatedChunks(chunks);

        return mergedChunks;
    }

    /**
     * 確保每行都有邊界框
     * @param {Array} lines - 文字行陣列
     * @returns {Array} 包含邊界框的文字行陣列
     */
    ensureBoundingBoxes(lines) {
        return lines.map((line, index) => {
            if (line.bbox) {
                return line;
            }

            // 如果沒有邊界框，估算一個
            const estimatedHeight = 20; // 預設行高
            const estimatedWidth = line.text.length * 10; // 粗略估算寬度

            return {
                ...line,
                bbox: {
                    x0: 0,
                    y0: index * estimatedHeight,
                    x1: estimatedWidth,
                    y1: (index + 1) * estimatedHeight
                }
            };
        });
    }

    /**
     * 計算垂直間距
     * @param {Array} lines - 文字行陣列
     * @returns {Array<number>} 間距陣列
     */
    calculateVerticalSpacing(lines) {
        const spacings = [];

        for (let i = 0; i < lines.length - 1; i++) {
            const currentLine = lines[i];
            const nextLine = lines[i + 1];

            // 計算兩行之間的垂直距離
            const currentBottom = currentLine.bbox.y1 || currentLine.bbox.y0 + 20;
            const nextTop = nextLine.bbox.y0;
            const spacing = nextTop - currentBottom;

            spacings.push(spacing);
        }

        return spacings;
    }

    /**
     * 偵測顯著空白區域
     * @param {Array<number>} spacings - 間距陣列
     * @returns {Array<number>} 空白區域的索引
     */
    detectWhitespace(spacings) {
        if (spacings.length === 0) return [];

        // 計算平均間距
        const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;

        // 計算閾值
        const threshold = avgSpacing * this.verticalSpacingThreshold;

        // 找出超過閾值的間距
        const whitespaceIndices = [];
        spacings.forEach((spacing, index) => {
            if (spacing > threshold) {
                whitespaceIndices.push(index);
            }
        });

        return whitespaceIndices;
    }

    /**
     * 根據空白區域建立區塊
     * @param {Array} lines - 文字行陣列
     * @param {Array<number>} whitespaceIndices - 空白區域索引
     * @returns {Array<Object>} 區塊陣列
     */
    createChunks(lines, whitespaceIndices) {
        const chunks = [];
        let currentChunkLines = [];
        let chunkStartIndex = 0;

        lines.forEach((line, index) => {
            currentChunkLines.push(line);

            // 如果這是空白區域的分界點，或是最後一行
            if (whitespaceIndices.includes(index) || index === lines.length - 1) {
                if (currentChunkLines.length >= this.minChunkLines) {
                    const chunk = {
                        id: `chunk_${chunks.length}`,
                        lines: currentChunkLines,
                        bbox: this.calculateChunkBBox(currentChunkLines),
                        startLineIndex: chunkStartIndex,
                        endLineIndex: index,
                        type: ChunkType.UNKNOWN
                    };
                    chunks.push(chunk);
                }

                currentChunkLines = [];
                chunkStartIndex = index + 1;
            }
        });

        return chunks;
    }

    /**
     * 計算區塊的邊界框
     * @param {Array} lines - 文字行陣列
     * @returns {Object} 邊界框 {x, y, width, height}
     */
    calculateChunkBBox(lines) {
        if (lines.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        lines.forEach(line => {
            const bbox = line.bbox;
            minX = Math.min(minX, bbox.x0);
            minY = Math.min(minY, bbox.y0);
            maxX = Math.max(maxX, bbox.x1);
            maxY = Math.max(maxY, bbox.y1);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * 分析水平對齊方式
     * @param {Array} lines - 文字行陣列
     * @returns {Object} 對齊資訊
     */
    analyzeHorizontalAlignment(lines) {
        if (lines.length === 0) {
            return { type: 'unknown', confidence: 0 };
        }

        // 收集所有行的左邊界
        const leftEdges = lines.map(line => line.bbox.x0);
        const rightEdges = lines.map(line => line.bbox.x1);

        // 計算左對齊的一致性
        const leftAlignmentVariance = this.calculateVariance(leftEdges);
        const rightAlignmentVariance = this.calculateVariance(rightEdges);

        // 判斷對齊類型
        if (leftAlignmentVariance < this.horizontalAlignmentTolerance) {
            return { type: 'left', confidence: 0.9 };
        } else if (rightAlignmentVariance < this.horizontalAlignmentTolerance) {
            return { type: 'right', confidence: 0.9 };
        } else if (leftAlignmentVariance < this.horizontalAlignmentTolerance * 2) {
            return { type: 'left', confidence: 0.6 };
        } else {
            return { type: 'mixed', confidence: 0.5 };
        }
    }

    /**
     * 計算變異數
     * @param {Array<number>} values - 數值陣列
     * @returns {number} 變異數
     */
    calculateVariance(values) {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length);
    }

    /**
     * 分類區塊類型
     * @param {Array<Object>} chunks - 區塊陣列
     */
    classifyChunks(chunks) {
        chunks.forEach((chunk, index) => {
            // 收集區塊的所有文字
            const text = chunk.lines.map(line => line.text).join(' ');

            // 規則 1: 標題通常在頂部且文字較短
            if (index === 0 && chunk.lines.length <= 2) {
                chunk.type = ChunkType.TITLE;
                return;
            }

            // 規則 2: 表格通常有多行且對齊一致
            if (chunk.lines.length >= 3 && chunk.alignment.type === 'left' && chunk.alignment.confidence > 0.8) {
                // 檢查是否包含數字（表格特徵）
                const hasNumbers = /\d+/.test(text);
                if (hasNumbers) {
                    chunk.type = ChunkType.TABLE;
                    return;
                }
            }

            // 規則 3: 列表通常有項目符號或編號
            if (/^[\d\-\*\•]/.test(text)) {
                chunk.type = ChunkType.LIST;
                return;
            }

            // 規則 4: 頁尾通常在底部
            if (index === chunks.length - 1 && chunk.lines.length <= 2) {
                chunk.type = ChunkType.FOOTER;
                return;
            }

            // 預設為段落
            chunk.type = ChunkType.PARAGRAPH;
        });
    }

    /**
     * 合併相關區塊
     * @param {Array<Object>} chunks - 區塊陣列
     * @returns {Array<Object>} 合併後的區塊陣列
     */
    mergeRelatedChunks(chunks) {
        if (chunks.length <= 1) return chunks;

        const merged = [];
        let currentChunk = chunks[0];

        for (let i = 1; i < chunks.length; i++) {
            const nextChunk = chunks[i];

            // 如果兩個區塊相關，則合併
            if (this.areChunksRelated(currentChunk, nextChunk)) {
                currentChunk = this.mergeChunks(currentChunk, nextChunk);
            } else {
                merged.push(currentChunk);
                currentChunk = nextChunk;
            }
        }

        // 加入最後一個區塊
        merged.push(currentChunk);

        return merged;
    }

    /**
     * 判斷兩個區塊是否相關
     * @param {Object} chunk1 - 第一個區塊
     * @param {Object} chunk2 - 第二個區塊
     * @returns {boolean} 是否相關
     */
    areChunksRelated(chunk1, chunk2) {
        // 相同類型的表格區塊可以合併
        if (chunk1.type === ChunkType.TABLE && chunk2.type === ChunkType.TABLE) {
            return true;
        }

        // 相同類型的列表區塊可以合併
        if (chunk1.type === ChunkType.LIST && chunk2.type === ChunkType.LIST) {
            return true;
        }

        return false;
    }

    /**
     * 合併兩個區塊
     * @param {Object} chunk1 - 第一個區塊
     * @param {Object} chunk2 - 第二個區塊
     * @returns {Object} 合併後的區塊
     */
    mergeChunks(chunk1, chunk2) {
        return {
            id: chunk1.id,
            lines: [...chunk1.lines, ...chunk2.lines],
            bbox: this.mergeChunkBBox(chunk1.bbox, chunk2.bbox),
            startLineIndex: chunk1.startLineIndex,
            endLineIndex: chunk2.endLineIndex,
            type: chunk1.type,
            alignment: chunk1.alignment
        };
    }

    /**
     * 合併兩個邊界框
     * @param {Object} bbox1 - 第一個邊界框
     * @param {Object} bbox2 - 第二個邊界框
     * @returns {Object} 合併後的邊界框
     */
    mergeChunkBBox(bbox1, bbox2) {
        const minX = Math.min(bbox1.x, bbox2.x);
        const minY = Math.min(bbox1.y, bbox2.y);
        const maxX = Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
        const maxY = Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * 取得區塊的文字內容
     * @param {Object} chunk - 區塊
     * @returns {string} 文字內容
     */
    getChunkText(chunk) {
        return chunk.lines.map(line => line.text).join('\n');
    }

    /**
     * 取得區塊的平均信心度
     * @param {Object} chunk - 區塊
     * @returns {number} 平均信心度
     */
    getChunkConfidence(chunk) {
        if (chunk.lines.length === 0) return 0;

        const totalConfidence = chunk.lines.reduce((sum, line) => sum + (line.confidence || 0), 0);
        return totalConfidence / chunk.lines.length;
    }
}

// 全域 DocumentChunker 實例
const documentChunker = new DocumentChunker();
