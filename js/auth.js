// ========================================
// 登入與分帳系統（使用 StorageManager）
// ========================================

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = {};
        this.isInitialized = false;
    }

    /**
     * 初始化（從 StorageManager 載入使用者）
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await storageManager.initialize();
            const allUsers = await storageManager.getAllUsers();
            
            allUsers.forEach(user => {
                this.users[user.username] = user;
            });

            this.isInitialized = true;
            console.log('AuthManager 初始化完成');
        } catch (error) {
            console.error('AuthManager 初始化失敗:', error);
            // 降級到 localStorage
            this.loadUsersFromLocalStorage();
        }
    }

    /**
     * 從 localStorage 載入所有使用者（降級策略）
     */
    loadUsersFromLocalStorage() {
        const users = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ocr_user_')) {
                const username = key.replace('ocr_user_', '');
                users[username] = JSON.parse(localStorage.getItem(key));
            }
        }
        this.users = users;
        this.isInitialized = true;
    }

    /**
     * 登入
     * @param {string} username - 使用者名稱
     * @param {string} taxId - 買方統一編號
     * @returns {Promise<Object>} 使用者資料
     */
    async login(username, taxId) {
        if (!username || !taxId) {
            throw new Error('請輸入使用者名稱與統一編號');
        }

        if (!isValidTaxId(taxId)) {
            throw new Error('統一編號格式錯誤（需為 8 位數字）');
        }

        // 確保已初始化
        if (!this.isInitialized) {
            await this.initialize();
        }

        const userId = `user_${username}`;
        let userData = await storageManager.loadUserData(userId);

        if (userData) {
            // 現有使用者
            // 檢查統編是否一致
            if (userData.taxId !== taxId) {
                throw new Error('統一編號與此帳號不符');
            }
        } else {
            // 新使用者
            userData = {
                username,
                taxId,
                createdAt: new Date().toISOString(),
                settings: {
                    amountKeywords: ['金額', '小計', '合計', '總計', '銷售額', '稅額'],
                    taxIdPattern: '\\d{8}',
                    categories: ['辦公用品', '差旅費', '餐費', '交通費', '雜費'],
                    enableCategories: true,
                    preprocessMode: 'speed' // 預設前處理模式
                },
                files: []
            };

            await storageManager.saveUserData(userId, userData);
        }

        this.currentUser = userData;
        this.users[username] = userData;

        return userData;
    }

    /**
     * 登出
     */
    logout() {
        this.currentUser = null;
    }

    /**
     * 取得當前使用者
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 取得所有使用者列表
     */
    getAllUsers() {
        return Object.values(this.users);
    }

    /**
     * 切換使用者
     * @param {string} username - 使用者名稱
     */
    async switchUser(username) {
        const userData = this.users[username];
        if (!userData) {
            throw new Error('使用者不存在');
        }
        this.currentUser = userData;
        return userData;
    }

    /**
     * 儲存使用者資料
     */
    async saveCurrentUser() {
        if (!this.currentUser) {
            throw new Error('無當前使用者');
        }

        const userId = `user_${this.currentUser.username}`;
        await storageManager.saveUserData(userId, this.currentUser);
        this.users[this.currentUser.username] = this.currentUser;
    }

    /**
     * 更新設定
     * @param {Object} settings - 設定物件
     */
    async updateSettings(settings) {
        if (!this.currentUser) {
            throw new Error('無當前使用者');
        }

        this.currentUser.settings = {
            ...this.currentUser.settings,
            ...settings
        };

        await this.saveCurrentUser();
    }

    /**
     * 新增檔案記錄
     * @param {Object} fileData - 檔案資料
     */
    async addFile(fileData) {
        if (!this.currentUser) {
            throw new Error('無當前使用者');
        }

        this.currentUser.files.push({
            ...fileData,
            id: generateId(),
            uploadedAt: new Date().toISOString()
        });

        await this.saveCurrentUser();
    }

    /**
     * 更新檔案記錄
     * @param {string} fileId - 檔案 ID
     * @param {Object} updates - 更新資料
     */
    async updateFile(fileId, updates) {
        if (!this.currentUser) {
            throw new Error('無當前使用者');
        }

        const fileIndex = this.currentUser.files.findIndex(f => f.id === fileId);
        if (fileIndex === -1) {
            throw new Error('檔案不存在');
        }

        this.currentUser.files[fileIndex] = {
            ...this.currentUser.files[fileIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveCurrentUser();
    }

    /**
     * 取得所有檔案
     */
    getFiles() {
        return this.currentUser ? this.currentUser.files : [];
    }

    /**
     * 刪除檔案
     * @param {string} fileId - 檔案 ID
     */
    async deleteFile(fileId) {
        if (!this.currentUser) {
            throw new Error('無當前使用者');
        }

        this.currentUser.files = this.currentUser.files.filter(f => f.id !== fileId);
        await this.saveCurrentUser();
    }
}

// 全域 AuthManager 實例
const authManager = new AuthManager();
