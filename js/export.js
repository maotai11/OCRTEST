// ========================================
// 匯出功能（html2canvas + jsPDF）
// ========================================

class ExportManager {
    constructor() {
        this.exportMode = 'all'; // all, by-file, by-page, selected
    }

    /**
     * 設定匯出模式
     * @param {string} mode - 匯出模式
     */
    setMode(mode) {
        this.exportMode = mode;
    }

    /**
     * 匯出 PDF
     * @param {Array} dataArray - 要匯出的資料陣列
     * @param {string} filename - 檔案名稱
     */
    async exportPDF(dataArray, filename = 'OCR掃描統計報表.pdf') {
        try {
            showLoading('正在生成 PDF...');

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            let isFirstPage = true;

            for (let i = 0; i < dataArray.length; i++) {
                const data = dataArray[i];

                // 建立匯出容器
                const container = this.createExportContainer(data, i + 1, dataArray.length);
                document.body.appendChild(container);

                // 使用 html2canvas 捕捉
                const canvas = await html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                // 移除容器
                document.body.removeChild(container);

                // 計算尺寸
                const imgWidth = 210; // A4 寬度 (mm)
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // 新增頁面
                if (!isFirstPage) {
                    pdf.addPage();
                }
                isFirstPage = false;

                // 加入圖片
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

                showLoading(`正在生成 PDF... ${i + 1}/${dataArray.length}`);
            }

            // 儲存 PDF
            pdf.save(filename);

            hideLoading();
            showNotification('PDF 匯出成功', 'success');
        } catch (error) {
            hideLoading();
            console.error('PDF 匯出失敗:', error);
            showNotification('PDF 匯出失敗', 'error');
            throw error;
        }
    }

    /**
     * 建立匯出容器
     * @param {Object} data - 資料
     * @param {number} pageNum - 頁碼
     * @param {number} totalPages - 總頁數
     * @returns {HTMLElement} 匯出容器
     */
    createExportContainer(data, pageNum, totalPages) {
        const container = document.createElement('div');
        container.className = 'export-container';
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 210mm;
            background: #ffffff;
            padding: 40px;
        `;

        const currentUser = authManager.getCurrentUser();
        const userName = currentUser ? currentUser.username : '未知使用者';
        const userTaxId = currentUser ? currentUser.taxId : '--------';

        container.innerHTML = `
            <div class="export-title">OCR 掃描統計報表</div>
            
            <div class="export-info-grid">
                <div class="export-info-item">
                    <div class="export-info-label">使用者</div>
                    <div class="export-info-value">${userName}</div>
                </div>
                <div class="export-info-item">
                    <div class="export-info-label">買方統編</div>
                    <div class="export-info-value export-number">${userTaxId}</div>
                </div>
                <div class="export-info-item">
                    <div class="export-info-label">匯出時間</div>
                    <div class="export-info-value">${new Date().toLocaleString('zh-TW')}</div>
                </div>
                <div class="export-info-item">
                    <div class="export-info-label">發票號碼</div>
                    <div class="export-info-value export-number">${data.invoiceNo || '未偵測'}</div>
                </div>
            </div>

            ${this.createValidationSummaryHTML(data)}
            ${this.createAmountsTableHTML(data)}
            ${this.createItemsTableHTML(data)}

            <div class="export-page-number">第 ${pageNum} 頁，共 ${totalPages} 頁</div>
            
            <div class="export-footer">
                本報表由離線 OCR 掃描統計工具自動生成 | Cyberpunk Edition
            </div>
        `;

        return container;
    }

    /**
     * 建立驗算摘要 HTML
     * @param {Object} data - 資料
     * @returns {string} HTML 字串
     */
    createValidationSummaryHTML(data) {
        if (!data.validation) return '';

        const validation = data.validation;
        const statusClass = validation.isValid ? 'normal' : 'error';

        let html = `
            <div class="export-validation-summary">
                <h3>驗算摘要</h3>
        `;

        if (validation.errors.length > 0) {
            validation.errors.forEach(error => {
                html += `
                    <div class="export-validation-item">
                        <span class="export-validation-label export-validation-error">${error.rule}</span>
                        <span class="export-validation-value export-validation-error">${error.message}</span>
                    </div>
                `;
                if (error.diff) {
                    html += `
                        <div class="export-validation-item">
                            <span class="export-validation-label">預期值</span>
                            <span class="export-validation-value export-number">${error.expected}</span>
                        </div>
                        <div class="export-validation-item">
                            <span class="export-validation-label">實際值</span>
                            <span class="export-validation-value export-number">${error.actual}</span>
                        </div>
                        <div class="export-validation-item">
                            <span class="export-validation-label">差額</span>
                            <span class="export-diff">${error.diff}</span>
                        </div>
                    `;
                }
            });
        } else {
            html += `
                <div class="export-validation-item">
                    <span class="export-validation-label">驗算狀態</span>
                    <span class="export-validation-value" style="color: #00ff88;">✓ 全部通過</span>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    /**
     * 建立金額表格 HTML
     * @param {Object} data - 資料
     * @returns {string} HTML 字串
     */
    createAmountsTableHTML(data) {
        if (!data.amounts || data.amounts.length === 0) return '';

        let html = `
            <table class="export-table">
                <thead>
                    <tr>
                        <th>項目</th>
                        <th>金額</th>
                        <th>信心值</th>
                        <th>狀態</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.amounts.forEach(amount => {
            const statusClass = amount.needsReview ? 'review' : 'normal';
            const statusText = amount.needsReview ? '需確認' : '正常';
            const confidencePercent = Math.round(amount.confidence * 100);

            html += `
                <tr>
                    <td>${amount.keyword}</td>
                    <td class="export-number">NT$ ${formatAmount(amount.amount)}</td>
                    <td>${confidencePercent}%</td>
                    <td><span class="export-status ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    /**
     * 建立品項表格 HTML
     * @param {Object} data - 資料
     * @returns {string} HTML 字串
     */
    createItemsTableHTML(data) {
        if (!data.items || data.items.length === 0) return '';

        let html = `
            <h3 style="margin-top: 24px; margin-bottom: 12px;">品項明細</h3>
            <table class="export-table">
                <thead>
                    <tr>
                        <th>品項名稱</th>
                        <th>金額</th>
                        <th>狀態</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.items.forEach(item => {
            const statusClass = item.needsReview ? 'review' : 'normal';
            const statusText = item.needsReview ? '需確認' : '正常';

            html += `
                <tr>
                    <td>${item.name}</td>
                    <td class="export-number">NT$ ${formatAmount(item.amount)}</td>
                    <td><span class="export-status ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }
}

// 全域 ExportManager 實例
const exportManager = new ExportManager();
