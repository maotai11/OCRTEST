// ========================================
// Document Classifier
// 自動分類文件類型（發票/水電/勞健保/其他）
// ========================================

class DocumentClassifier {
    constructor() {
        this.isInitialized = false;
        this.keywords = null;
    }

    /**
     * 初始化分類器（載入關鍵字字典）
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('DocumentClassifier 已初始化');
            return;
        }

        try {
            // 嘗試從 StorageManager 載入自訂關鍵字
            const customKeywords = await storageManager.loadDictionary('classificationKeywords');
            
            if (customKeywords) {
                this.keywords = customKeywords;
            } else {
                // 使用預設關鍵字
                this.keywords = this.getDefaultKeywords();
                // 儲存預設關鍵字
                await storageManager.saveDictionary('classificationKeywords', this.keywords);
            }

            this.isInitialized = true;
            console.log('DocumentClassifier 初始化完成');
        } catch (error) {
            console.error('DocumentClassifier 初始化失敗:', error);
            // 降級：使用預設關鍵字
            this.keywords = this.getDefaultKeywords();
            this.isInitialized = true;
        }
    }

    /**
     * 取得預設關鍵字字典
     * @returns {Object} 關鍵字字典
     */
    getDefaultKeywords() {
        return {
            invoice: {
                keywords: [
                    '統一發票', '發票號碼', '發票字軌', '稅額', '營業稅',
                    '買受人', '賣方', '銷售額', '應稅銷售額', '免稅銷售額',
                    '課稅別', '發票', '統編', '買方統編', '賣方統編'
                ],
                weight: 1.0
            },
            utility: {
                keywords: [
                    '電號', '用電度數', '水號', '本期', '繳費期限',
                    '電費', '水費', '台電', '自來水', '用電', '用水',
                    '度數', '本期應繳', '電力公司', '水公司', '瓦斯費'
                ],
                weight: 1.0
            },
            labor_health: {
                keywords: [
                    '勞保', '健保', '投保薪資', '保險費', '被保險人',
                    '保險證號', '繳款書', '勞工保險', '全民健康保險',
                    '勞保局', '健保局', '保費', '投保單位', '保險費合計'
                ],
                weight: 1.0
            },
            other: {
                keywords: [],
                weight: 0.0
            }
        };
    }

    /**
     * 分類文件
     * @param {string} ocrText - OCR 識別的文字
     * @returns {Object} 分類結果 {docType, confidence, matchedKeywords}
     */
    classify(ocrText) {
        if (!this.isInitialized) {
            console.warn('DocumentClassifier 未初始化，使用預設關鍵字');
            this.keywords = this.getDefaultKeywords();
            this.isInitialized = true;
        }

        if (!ocrText || typeof ocrText !== 'string') {
            return {
                docType: 'other',
                confidence: 0,
                matchedKeywords: []
            };
        }

        // 正規化文字（移除空白、轉小寫）
        const normalizedText = ocrText.replace(/\s+/g, '').toLowerCase();

        // 計算每個類型的分數
        const scores = {};
        const matches = {};

        for (const [docType, config] of Object.entries(this.keywords)) {
            if (docType === 'other') continue;

            let score = 0;
            const matchedKeywords = [];

            config.keywords.forEach(keyword => {
                const normalizedKeyword = keyword.replace(/\s+/g, '').toLowerCase();
                
                // 計算關鍵字出現次數
                const regex = new RegExp(normalizedKeyword, 'g');
                const occurrences = (normalizedText.match(regex) || []).length;

                if (occurrences > 0) {
                    // 基礎分數 + 出現次數加成
                    score += (1 + Math.log(occurrences)) * config.weight;
                    matchedKeywords.push({
                        keyword,
                        occurrences
                    });
                }
            });

            scores[docType] = score;
            matches[docType] = matchedKeywords;
        }

        // 找出最高分的類型
        let bestType = 'other';
        let bestScore = 0;

        for (const [docType, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestType = docType;
            }
        }

        // 如果沒有任何匹配，返回 other
        if (bestScore === 0) {
            return {
                docType: 'other',
                confidence: 0,
                matchedKeywords: [],
                scores
            };
        }

        // 計算信心度（0-1）
        // 使用 sigmoid 函數將分數轉換為信心度
        const confidence = this.calculateConfidence(bestScore, scores);

        return {
            docType: bestType,
            confidence,
            matchedKeywords: matches[bestType],
            scores
        };
    }

    /**
     * 計算分類信心度
     * @param {number} bestScore - 最高分數
     * @param {Object} allScores - 所有分數
     * @returns {number} 信心度 (0-1)
     */
    calculateConfidence(bestScore, allScores) {
        // 計算總分
        const totalScore = Object.values(allScores).reduce((sum, score) => sum + score, 0);

        if (totalScore === 0) return 0;

        // 最高分佔總分的比例
        const ratio = bestScore / totalScore;

        // 使用 sigmoid 函數平滑化
        // confidence = 1 / (1 + e^(-k * (ratio - 0.5)))
        // k = 10 控制曲線陡峭度
        const k = 10;
        const confidence = 1 / (1 + Math.exp(-k * (ratio - 0.5)));

        // 額外考慮絕對分數（分數越高，信心度越高）
        const scoreBonus = Math.min(bestScore / 10, 0.2); // 最多加 0.2

        return Math.min(confidence + scoreBonus, 1.0);
    }

    /**
     * 取得特定文件類型的分類信心度
     * @param {string} ocrText - OCR 識別的文字
     * @param {string} docType - 文件類型
     * @returns {number} 信心度 (0-1)
     */
    getClassificationConfidence(ocrText, docType) {
        const result = this.classify(ocrText);
        
        if (result.docType === docType) {
            return result.confidence;
        }

        // 如果不是該類型，返回該類型的分數比例
        if (result.scores && result.scores[docType]) {
            const totalScore = Object.values(result.scores).reduce((sum, score) => sum + score, 0);
            return totalScore > 0 ? result.scores[docType] / totalScore : 0;
        }

        return 0;
    }

    /**
     * 新增自訂關鍵字
     * @param {string} docType - 文件類型
     * @param {Array<string>} keywords - 關鍵字陣列
     * @returns {Promise<void>}
     */
    async addCustomKeywords(docType, keywords) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.keywords[docType]) {
            console.warn(`未知的文件類型: ${docType}`);
            return;
        }

        // 合併關鍵字（去重）
        const existingKeywords = this.keywords[docType].keywords;
        const newKeywords = keywords.filter(kw => !existingKeywords.includes(kw));
        
        this.keywords[docType].keywords.push(...newKeywords);

        // 儲存更新後的關鍵字
        try {
            await storageManager.saveDictionary('classificationKeywords', this.keywords);
            console.log(`已新增 ${newKeywords.length} 個關鍵字到 ${docType}`);
        } catch (error) {
            console.error('儲存關鍵字失敗:', error);
        }
    }

    /**
     * 取得所有關鍵字
     * @returns {Object} 關鍵字字典
     */
    getAllKeywords() {
        return this.keywords;
    }

    /**
     * 重設為預設關鍵字
     * @returns {Promise<void>}
     */
    async resetToDefault() {
        this.keywords = this.getDefaultKeywords();
        
        try {
            await storageManager.saveDictionary('classificationKeywords', this.keywords);
            console.log('已重設為預設關鍵字');
        } catch (error) {
            console.error('重設關鍵字失敗:', error);
        }
    }

    /**
     * 取得文件類型的中文名稱
     * @param {string} docType - 文件類型
     * @returns {string} 中文名稱
     */
    getDocTypeLabel(docType) {
        const labels = {
            invoice: '發票',
            utility: '水電單',
            labor_health: '勞健保繳費單',
            other: '其他'
        };

        return labels[docType] || '未知';
    }

    /**
     * 批量分類
     * @param {Array<string>} ocrTexts - OCR 文字陣列
     * @returns {Array<Object>} 分類結果陣列
     */
    classifyBatch(ocrTexts) {
        return ocrTexts.map(text => this.classify(text));
    }
}

// 全域 DocumentClassifier 實例
const documentClassifier = new DocumentClassifier();
