// ========================================
// Storage Manager (localForage)
// 管理 IndexedDB 資料儲存與讀取
// ========================================

class StorageManager {
    constructor() {
        this.isInitialized = false;
        this.stores = {
            users: null,
            dictionaries: null,
            patches: null,
            documents: null
        };
    }

    /**
     * 初始化 localForage
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('StorageManager 已初始化');
            return;
        }

        try {
            // 檢查 localForage 是否可用
            if (typeof localforage === 'undefined') {
                throw new Error('localForage 未載入');
            }

            // 建立不同的 store 實例
            this.stores.users = localforage.createInstance({
                name: 'OCR_Tool',
                storeName: 'users',
                description: '使用者資料'
            });

            this.stores.dictionaries = localforage.createInstance({
                name: 'OCR_Tool',
                storeName: 'dictionaries',
                description: '字典資料（同義詞、關鍵字、修正表）'
            });

            this.stores.patches = localforage.createInstance({
                name: 'OCR_Tool',
                storeName: 'patches',
                description: '人工修正記錄'
            });

            this.stores.documents = localforage.createInstance({
                name: 'OCR_Tool',
                storeName: 'documents',
                description: '已處理文件'
            });

            this.isInitialized = true;
            console.log('StorageManager 初始化完成');
        } catch (error) {
            console.error('StorageManager 初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 儲存使用者資料
     * @param {string} userId - 使用者 ID
     * @param {Object} data - 使用者資料
     * @returns {Promise<void>}
     */
    async saveUserData(userId, data) {
        if (!this.isInitialized) await this.initialize();

        try {
            await this.stores.users.setItem(userId, {
                ...data,
                lastUpdated: new Date().toISOString()
            });
            console.log(`使用者資料已儲存: ${userId}`);
        } catch (error) {
            console.error('儲存使用者資料失敗:', error);
            throw error;
        }
    }

    /**
     * 載入使用者資料
     * @param {string} userId - 使用者 ID
     * @returns {Promise<Object|null>} 使用者資料
     */
    async loadUserData(userId) {
        if (!this.isInitialized) await this.initialize();

        try {
            const data = await this.stores.users.getItem(userId);
            return data;
        } catch (error) {
            console.error('載入使用者資料失敗:', error);
            return null;
        }
    }

    /**
     * 取得所有使用者
     * @returns {Promise<Array>} 使用者陣列
     */
    async getAllUsers() {
        if (!this.isInitialized) await this.initialize();

        try {
            const users = [];
            await this.stores.users.iterate((value, key) => {
                users.push({ userId: key, ...value });
            });
            return users;
        } catch (error) {
            console.error('取得所有使用者失敗:', error);
            return [];
        }
    }

    /**
     * 刪除使用者資料
     * @param {string} userId - 使用者 ID
     * @returns {Promise<void>}
     */
    async deleteUserData(userId) {
        if (!this.isInitialized) await this.initialize();

        try {
            await this.stores.users.removeItem(userId);
            console.log(`使用者資料已刪除: ${userId}`);
        } catch (error) {
            console.error('刪除使用者資料失敗:', error);
            throw error;
        }
    }

    /**
     * 儲存字典
     * @param {string} dictionaryName - 字典名稱
     * @param {Object} data - 字典資料
     * @returns {Promise<void>}
     */
    async saveDictionary(dictionaryName, data) {
        if (!this.isInitialized) await this.initialize();

        try {
            await this.stores.dictionaries.setItem(dictionaryName, {
                data,
                lastUpdated: new Date().toISOString()
            });
            console.log(`字典已儲存: ${dictionaryName}`);
        } catch (error) {
            console.error('儲存字典失敗:', error);
            throw error;
        }
    }

    /**
     * 載入字典
     * @param {string} dictionaryName - 字典名稱
     * @returns {Promise<Object|null>} 字典資料
     */
    async loadDictionary(dictionaryName) {
        if (!this.isInitialized) await this.initialize();

        try {
            const result = await this.stores.dictionaries.getItem(dictionaryName);
            return result ? result.data : null;
        } catch (error) {
            console.error('載入字典失敗:', error);
            return null;
        }
    }

    /**
     * 取得所有字典名稱
     * @returns {Promise<Array>} 字典名稱陣列
     */
    async getAllDictionaryNames() {
        if (!this.isInitialized) await this.initialize();

        try {
            const names = [];
            await this.stores.dictionaries.iterate((value, key) => {
                names.push(key);
            });
            return names;
        } catch (error) {
            console.error('取得字典名稱失敗:', error);
            return [];
        }
    }

    /**
     * 儲存 Patch 記錄
     * @param {Object} patch - Patch 資料
     * @returns {Promise<void>}
     */
    async savePatch(patch) {
        if (!this.isInitialized) await this.initialize();

        try {
            const patchId = patch.id || `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await this.stores.patches.setItem(patchId, {
                ...patch,
                id: patchId,
                timestamp: patch.timestamp || new Date().toISOString()
            });
            console.log(`Patch 已儲存: ${patchId}`);
            return patchId;
        } catch (error) {
            console.error('儲存 Patch 失敗:', error);
            throw error;
        }
    }

    /**
     * 載入 Patches（支援過濾）
     * @param {Object} filters - 過濾條件 {userId, vendor, docType, fieldName}
     * @returns {Promise<Array>} Patch 陣列
     */
    async loadPatches(filters = {}) {
        if (!this.isInitialized) await this.initialize();

        try {
            const patches = [];
            await this.stores.patches.iterate((value, key) => {
                // 套用過濾條件
                let match = true;
                if (filters.userId && value.userId !== filters.userId) match = false;
                if (filters.vendor && value.vendor !== filters.vendor) match = false;
                if (filters.docType && value.docType !== filters.docType) match = false;
                if (filters.fieldName && value.fieldName !== filters.fieldName) match = false;

                if (match) {
                    patches.push(value);
                }
            });

            // 按時間排序（最新的在前）
            patches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return patches;
        } catch (error) {
            console.error('載入 Patches 失敗:', error);
            return [];
        }
    }

    /**
     * 刪除 Patch
     * @param {string} patchId - Patch ID
     * @returns {Promise<void>}
     */
    async deletePatch(patchId) {
        if (!this.isInitialized) await this.initialize();

        try {
            await this.stores.patches.removeItem(patchId);
            console.log(`Patch 已刪除: ${patchId}`);
        } catch (error) {
            console.error('刪除 Patch 失敗:', error);
            throw error;
        }
    }

    /**
     * 儲存已處理文件
     * @param {Object} document - 文件資料
     * @returns {Promise<string>} 文件 ID
     */
    async saveDocument(document) {
        if (!this.isInitialized) await this.initialize();

        try {
            const docId = document.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await this.stores.documents.setItem(docId, {
                ...document,
                id: docId,
                savedAt: new Date().toISOString()
            });
            console.log(`文件已儲存: ${docId}`);
            return docId;
        } catch (error) {
            console.error('儲存文件失敗:', error);
            throw error;
        }
    }

    /**
     * 載入文件
     * @param {string} docId - 文件 ID
     * @returns {Promise<Object|null>} 文件資料
     */
    async loadDocument(docId) {
        if (!this.isInitialized) await this.initialize();

        try {
            const document = await this.stores.documents.getItem(docId);
            return document;
        } catch (error) {
            console.error('載入文件失敗:', error);
            return null;
        }
    }

    /**
     * 取得所有文件（支援過濾）
     * @param {Object} filters - 過濾條件 {userId, docType, startDate, endDate}
     * @returns {Promise<Array>} 文件陣列
     */
    async getAllDocuments(filters = {}) {
        if (!this.isInitialized) await this.initialize();

        try {
            const documents = [];
            await this.stores.documents.iterate((value, key) => {
                // 套用過濾條件
                let match = true;
                if (filters.userId && value.userId !== filters.userId) match = false;
                if (filters.docType && value.docType !== filters.docType) match = false;
                
                if (filters.startDate) {
                    const docDate = new Date(value.processedAt || value.savedAt);
                    if (docDate < new Date(filters.startDate)) match = false;
                }
                
                if (filters.endDate) {
                    const docDate = new Date(value.processedAt || value.savedAt);
                    if (docDate > new Date(filters.endDate)) match = false;
                }

                if (match) {
                    documents.push(value);
                }
            });

            // 按時間排序（最新的在前）
            documents.sort((a, b) => {
                const dateA = new Date(a.processedAt || a.savedAt);
                const dateB = new Date(b.processedAt || b.savedAt);
                return dateB - dateA;
            });

            return documents;
        } catch (error) {
            console.error('取得所有文件失敗:', error);
            return [];
        }
    }

    /**
     * 刪除文件
     * @param {string} docId - 文件 ID
     * @returns {Promise<void>}
     */
    async deleteDocument(docId) {
        if (!this.isInitialized) await this.initialize();

        try {
            await this.stores.documents.removeItem(docId);
            console.log(`文件已刪除: ${docId}`);
        } catch (error) {
            console.error('刪除文件失敗:', error);
            throw error;
        }
    }

    /**
     * 清空所有資料（危險操作）
     * @returns {Promise<void>}
     */
    async clearAll() {
        if (!this.isInitialized) await this.initialize();

        try {
            await Promise.all([
                this.stores.users.clear(),
                this.stores.dictionaries.clear(),
                this.stores.patches.clear(),
                this.stores.documents.clear()
            ]);
            console.log('所有資料已清空');
        } catch (error) {
            console.error('清空資料失敗:', error);
            throw error;
        }
    }

    /**
     * 取得儲存空間使用情況
     * @returns {Promise<Object>} 使用情況統計
     */
    async getStorageStats() {
        if (!this.isInitialized) await this.initialize();

        try {
            const stats = {
                users: 0,
                dictionaries: 0,
                patches: 0,
                documents: 0
            };

            await this.stores.users.iterate(() => stats.users++);
            await this.stores.dictionaries.iterate(() => stats.dictionaries++);
            await this.stores.patches.iterate(() => stats.patches++);
            await this.stores.documents.iterate(() => stats.documents++);

            return stats;
        } catch (error) {
            console.error('取得儲存統計失敗:', error);
            return { users: 0, dictionaries: 0, patches: 0, documents: 0 };
        }
    }

    /**
     * 匯出所有資料（用於備份）
     * @returns {Promise<Object>} 所有資料
     */
    async exportAllData() {
        if (!this.isInitialized) await this.initialize();

        try {
            const data = {
                users: {},
                dictionaries: {},
                patches: {},
                documents: {},
                exportedAt: new Date().toISOString()
            };

            await this.stores.users.iterate((value, key) => {
                data.users[key] = value;
            });

            await this.stores.dictionaries.iterate((value, key) => {
                data.dictionaries[key] = value;
            });

            await this.stores.patches.iterate((value, key) => {
                data.patches[key] = value;
            });

            await this.stores.documents.iterate((value, key) => {
                data.documents[key] = value;
            });

            return data;
        } catch (error) {
            console.error('匯出資料失敗:', error);
            throw error;
        }
    }

    /**
     * 匯入資料（用於還原備份）
     * @param {Object} data - 要匯入的資料
     * @returns {Promise<void>}
     */
    async importAllData(data) {
        if (!this.isInitialized) await this.initialize();

        try {
            // 匯入使用者
            if (data.users) {
                for (const [key, value] of Object.entries(data.users)) {
                    await this.stores.users.setItem(key, value);
                }
            }

            // 匯入字典
            if (data.dictionaries) {
                for (const [key, value] of Object.entries(data.dictionaries)) {
                    await this.stores.dictionaries.setItem(key, value);
                }
            }

            // 匯入 Patches
            if (data.patches) {
                for (const [key, value] of Object.entries(data.patches)) {
                    await this.stores.patches.setItem(key, value);
                }
            }

            // 匯入文件
            if (data.documents) {
                for (const [key, value] of Object.entries(data.documents)) {
                    await this.stores.documents.setItem(key, value);
                }
            }

            console.log('資料匯入完成');
        } catch (error) {
            console.error('匯入資料失敗:', error);
            throw error;
        }
    }
}

// 全域 StorageManager 實例
const storageManager = new StorageManager();
