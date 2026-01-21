// ========================================
// 主應用邏輯
// ========================================

class App {
    constructor() {
        this.uploadedFiles = [];
        this.processedData = [];
        this.currentPage = 'dashboard';

        this.init();
    }

    /**
     * 初始化應用
     */
    init() {
        // 檢查是否已登入
        const lastUser = localStorage.getItem('ocr_last_user');
        if (lastUser) {
            try {
                const userData = JSON.parse(lastUser);
                authManager.login(userData.username, userData.taxId);
                this.showApp();
                this.updateUI();
            } catch (error) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        this.bindEvents();
    }

    /**
     * 綁定事件
     */
    bindEvents() {
        // 登入表單
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // 登出按鈕
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // 側邊欄導航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });

        // 檔案上傳
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');

        uploadZone?.addEventListener('click', () => fileInput?.click());

        uploadZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone?.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });

        fileInput?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // OCR 開始按鈕
        document.getElementById('start-ocr-btn')?.addEventListener('click', () => {
            this.startOCR();
        });

        // 匯出按鈕
        document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
            this.exportPDF();
        });

        // 設定儲存按鈕
        document.querySelectorAll('.save-settings').forEach(btn => {
            btn.addEventListener('click', () => {
                this.saveSettings(btn.dataset.setting);
            });
        });

        // 匯出模式選擇
        document.querySelectorAll('input[name="export-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                exportManager.setMode(e.target.value);
            });
        });

        // 分塊頁面事件
        document.getElementById('toggle-bbox-btn')?.addEventListener('click', () => {
            chunkVisualizer.toggleBoundingBoxes();
        });

        document.getElementById('toggle-labels-btn')?.addEventListener('click', () => {
            chunkVisualizer.toggleLabels();
        });

        document.getElementById('toggle-confidence-btn')?.addEventListener('click', () => {
            chunkVisualizer.toggleConfidence();
        });

        document.getElementById('export-annotated-btn')?.addEventListener('click', () => {
            this.exportAnnotatedImage();
        });

        // 分塊選擇事件
        const canvas = document.getElementById('chunk-canvas');
        canvas?.addEventListener('chunkSelected', (e) => {
            this.handleChunkSelected(e.detail.chunk);
        });
    }

    /**
     * 處理登入
     */
    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const taxId = document.getElementById('tax-id').value.trim();

        try {
            const userData = await authManager.login(username, taxId);

            // 儲存最後登入使用者
            localStorage.setItem('ocr_last_user', JSON.stringify({ username, taxId }));

            this.showApp();
            this.updateUI();
            showNotification(`歡迎，${username}！`, 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    /**
     * 處理登出
     */
    handleLogout() {
        authManager.logout();
        localStorage.removeItem('ocr_last_user');
        this.showLogin();
        this.uploadedFiles = [];
        this.processedData = [];
    }

    /**
     * 顯示登入畫面
     */
    showLogin() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
    }

    /**
     * 顯示應用畫面
     */
    showApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');

        // 🚀 登入後立即預載 OCR 引擎
        ocrEngine.preload().catch(err => {
            console.log('OCR 預載失敗，將在首次使用時重試');
        });
    }

    /**
     * 切換頁面
     */
    switchPage(page) {
        this.currentPage = page;

        // 更新導航狀態
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // 更新頁面顯示
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        // 載入頁面資料
        this.loadPageData(page);
    }

    /**
     * 載入頁面資料
     */
    loadPageData(page) {
        switch (page) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'validation':
                this.updateValidationPage();
                break;
            case 'chunking':
                this.updateChunkingPage();
                break;
            case 'export':
                this.updateExportPage();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    /**
     * 更新 UI
     */
    updateUI() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        // 更新使用者資訊
        const userBadge = document.getElementById('current-user');
        if (userBadge) {
            userBadge.textContent = `${user.username} (${user.taxId})`;
        }

        // 更新帳號列表
        this.updateAccountList();

        // 更新當前頁面
        this.loadPageData(this.currentPage);
    }

    /**
     * 更新帳號列表
     */
    updateAccountList() {
        const accountList = document.getElementById('account-list');
        if (!accountList) return;

        const users = authManager.getAllUsers();
        const currentUser = authManager.getCurrentUser();

        accountList.innerHTML = users.map(user => `
            <div class="account-item ${user.username === currentUser?.username ? 'active' : ''}"
                 data-username="${user.username}">
                ${user.username}
            </div>
        `).join('');

        // 綁定切換事件
        accountList.querySelectorAll('.account-item').forEach(item => {
            item.addEventListener('click', () => {
                const username = item.dataset.username;
                authManager.switchUser(username);
                this.updateUI();
                showNotification(`已切換至 ${username}`, 'success');
            });
        });
    }

    /**
     * 處理檔案上傳
     */
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        showLoading('處理檔案中...');

        for (const file of files) {
            try {
                if (file.type.startsWith('image/')) {
                    await this.handleImageFile(file);
                } else if (file.type === 'application/pdf') {
                    await this.handlePDFFile(file);
                } else {
                    showNotification(`不支援的檔案格式：${file.name}`, 'warning');
                }
            } catch (error) {
                console.error('檔案處理失敗:', error);
                showNotification(`檔案處理失敗：${file.name}`, 'error');
            }
        }

        hideLoading();
        this.updateFilePreview();
        showNotification(`已上傳 ${files.length} 個檔案`, 'success');
    }

    /**
     * 處理圖片檔案
     */
    async handleImageFile(file) {
        const base64 = await fileToBase64(file);

        this.uploadedFiles.push({
            id: generateId(),
            name: file.name,
            type: 'image',
            data: base64,
            file: file
        });
    }

    /**
     * 處理 PDF 檔案
     */
    async handlePDFFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // 拆解每一頁
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport }).promise;

            const base64 = canvas.toDataURL('image/png');

            this.uploadedFiles.push({
                id: generateId(),
                name: `${file.name} - 第 ${i} 頁`,
                type: 'pdf-page',
                data: base64,
                pageNum: i,
                totalPages: pdf.numPages
            });
        }
    }

    /**
     * 更新檔案預覽
     */
    updateFilePreview() {
        const grid = document.getElementById('file-preview-grid');
        if (!grid) return;

        grid.innerHTML = this.uploadedFiles.map(file => `
            <div class="file-preview-card" data-id="${file.id}">
                <img src="${file.data}" class="file-preview-image" alt="${file.name}">
                <div class="file-preview-name">${file.name}</div>
            </div>
        `).join('');

        // 綁定預覽事件
        grid.querySelectorAll('.file-preview-card').forEach(card => {
            card.addEventListener('click', () => {
                const fileId = card.dataset.id;
                const file = this.uploadedFiles.find(f => f.id === fileId);
                if (file) {
                    this.showFullscreenPreview(file.data);
                }
            });
        });
    }

    /**
     * 顯示全螢幕預覽
     */
    showFullscreenPreview(imageSrc) {
        const modal = document.getElementById('fullscreen-modal');
        const image = document.getElementById('fullscreen-image');

        if (modal && image) {
            image.src = imageSrc;
            modal.classList.add('active');
        }

        // 綁定關閉事件
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    /**
     * 開始 OCR 識別
     */
    async startOCR() {
        if (this.uploadedFiles.length === 0) {
            showNotification('請先上傳檔案', 'warning');
            return;
        }

        try {
            // 初始化 OCR 引擎
            await ocrEngine.initialize();

            // 批量識別
            const images = this.uploadedFiles.map(f => f.data);
            const ocrResults = await ocrEngine.recognizeBatch(images, (current, total, result) => {
                const progress = (current / total) * 100;
                document.getElementById('ocr-progress').style.width = `${progress}%`;
            });

            // 擷取資訊
            const user = authManager.getCurrentUser();
            if (user && user.settings.amountKeywords) {
                extractor.setKeywords(user.settings.amountKeywords);
            }

            this.processedData = ocrResults.map((ocrResult, index) => {
                // 執行分塊分析
                const chunks = documentChunker.analyzeLayout(ocrResult);
                const invoiceFields = invoiceDetector.detectAllFields(chunks, ocrResult.lines);
                const annotatedChunks = invoiceDetector.annotateChunks(chunks, invoiceFields);

                // 傳統擷取（作為備援）
                const extracted = extractor.extract(ocrResult);
                const validation = validator.validate(extracted);

                return {
                    fileId: this.uploadedFiles[index].id,
                    fileName: this.uploadedFiles[index].name,
                    fileData: this.uploadedFiles[index].data,
                    ocr: ocrResult,
                    chunks: annotatedChunks,
                    invoiceFields: invoiceFields,
                    ...extracted,
                    validation
                };
            });

            // 顯示結果
            this.displayOCRResults();
            showNotification('OCR 識別完成', 'success');

            // 自動切換到分塊頁面
            this.switchPage('chunking');
        } catch (error) {
            console.error('OCR 失敗:', error);
            showNotification('OCR 識別失敗', 'error');
        }
    }

    /**
     * 顯示 OCR 結果
     */
    displayOCRResults() {
        const container = document.getElementById('ocr-results');
        if (!container) return;

        container.innerHTML = this.processedData.map((data, index) => `
            <div class="ocr-result-card">
                <div class="ocr-result-header">
                    <div class="ocr-result-title">${data.fileName}</div>
                    <span class="status-chip ${data.validation.isValid ? 'normal' : 'error'}">
                        ${data.validation.isValid ? '驗算通過' : '需確認'}
                    </span>
                </div>
                <div class="ocr-result-lines">
                    ${data.ocr.lines.slice(0, 5).map(line => `
                        <div class="ocr-line ${line.needsReview ? 'low-confidence' : ''}">
                            <span class="ocr-line-text">${line.text}</span>
                            <span class="ocr-line-confidence">${Math.round(line.confidence * 100)}%</span>
                        </div>
                    `).join('')}
                    ${data.ocr.lines.length > 5 ? `<div style="color: var(--text-muted); font-size: 12px;">...還有 ${data.ocr.lines.length - 5} 行</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * 更新儀表板
     */
    updateDashboard() {
        const totalFiles = this.uploadedFiles.length;
        const totalAmount = this.processedData.reduce((sum, data) => {
            const total = data.amounts?.find(a => a.keyword === '合計' || a.keyword === '總計');
            return sum + (total ? total.amount : 0);
        }, 0);
        const reviewCount = this.processedData.reduce((count, data) => {
            return count + (data.validation.isValid ? 0 : 1);
        }, 0);

        document.getElementById('kpi-files').textContent = totalFiles;
        document.getElementById('kpi-amount').textContent = `NT$ ${formatAmount(totalAmount)}`;
        document.getElementById('kpi-review').textContent = reviewCount;
        document.getElementById('kpi-validation').textContent =
            reviewCount === 0 ? '全部通過' : `${reviewCount} 項需確認`;
    }

    /**
     * 更新驗算頁面
     */
    updateValidationPage() {
        // 實作驗算頁面的資料表格
        // 此處簡化，完整實作需要可編輯的表格
        const summary = document.getElementById('validation-summary');
        if (summary) {
            const errorCount = this.processedData.filter(d => !d.validation.isValid).length;
            summary.innerHTML = `
                <div class="validation-card ${errorCount > 0 ? 'error' : 'success'}">
                    <div class="validation-label">驗算狀態</div>
                    <div class="validation-value">${errorCount === 0 ? '✓ 全部通過' : `${errorCount} 項需確認`}</div>
                </div>
            `;
        }
    }

    /**
     * 更新匯出頁面
     */
    updateExportPage() {
        const preview = document.getElementById('export-preview');
        if (preview) {
            preview.innerHTML = `<p>已準備 ${this.processedData.length} 筆資料可供匯出</p>`;
        }
    }

    /**
     * 載入設定
     */
    loadSettings() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        const settings = user.settings;

        document.getElementById('amount-keywords').value = settings.amountKeywords.join('\n');
        document.getElementById('tax-id-pattern').value = settings.taxIdPattern;
        document.getElementById('enable-categories').checked = settings.enableCategories;
        document.getElementById('categories').value = settings.categories.join('\n');
    }

    /**
     * 儲存設定
     */
    saveSettings(settingType) {
        const user = authManager.getCurrentUser();
        if (!user) return;

        const updates = {};

        if (settingType === 'amountKeywords') {
            const keywords = document.getElementById('amount-keywords').value
                .split('\n')
                .map(k => k.trim())
                .filter(k => k);
            updates.amountKeywords = keywords;
        } else if (settingType === 'taxIdPattern') {
            updates.taxIdPattern = document.getElementById('tax-id-pattern').value;
        } else if (settingType === 'categories') {
            const categories = document.getElementById('categories').value
                .split('\n')
                .map(c => c.trim())
                .filter(c => c);
            updates.categories = categories;
            updates.enableCategories = document.getElementById('enable-categories').checked;
        }

        authManager.updateSettings(updates);
        showNotification('設定已儲存', 'success');
    }

    /**
     * 匯出 PDF
     */
    async exportPDF() {
        if (this.processedData.length === 0) {
            showNotification('無資料可匯出', 'warning');
            return;
        }

        try {
            await exportManager.exportPDF(this.processedData);
        } catch (error) {
            console.error('匯出失敗:', error);
        }
    }
}

// 初始化應用
let app;
document.addEventListener('DOMContentLoaded', () => {
    // 設定 PDF.js worker 路徑
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdfjs/pdf.worker.min.js';

    app = new App();
});
