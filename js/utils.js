// ========================================
// 工具函式
// ========================================

/**
 * 格式化金額（加上千分位逗號）
 * @param {number} amount - 金額數字
 * @returns {string} 格式化後的金額字串
 */
function formatAmount(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    return amount.toLocaleString('zh-TW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * 解析金額字串（移除逗號、貨幣符號）
 * @param {string} amountStr - 金額字串
 * @returns {number} 解析後的數字
 */
function parseAmount(amountStr) {
    if (typeof amountStr === 'number') return amountStr;
    
    // 移除 NT$、$、逗號、空格
    const cleaned = amountStr.replace(/[NT$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * 驗證統一編號（8位數字）
 * @param {string} taxId - 統一編號
 * @returns {boolean} 是否有效
 */
function isValidTaxId(taxId) {
    return /^\d{8}$/.test(taxId);
}

/**
 * 驗證發票字軌號碼（2個英文字母 + 8位數字）
 * @param {string} invoiceNo - 發票字軌號碼
 * @returns {boolean} 是否有效
 */
function isValidInvoiceNo(invoiceNo) {
    return /^[A-Z]{2}\d{8}$/.test(invoiceNo);
}

/**
 * 從文字中擷取金額
 * @param {string} text - 文字內容
 * @returns {number|null} 擷取到的金額，若無則返回 null
 */
function extractAmount(text) {
    // 匹配金額模式：可能包含 NT$、$、逗號
    const patterns = [
        /NT\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /\$\s*([\d,]+(?:\.\d{1,2})?)/,
        /([\d,]+(?:\.\d{1,2})?)\s*元/,
        /(?:^|\s)([\d,]+(?:\.\d{1,2})?)(?:\s|$)/
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseAmount(match[1]);
        }
    }
    
    return null;
}

/**
 * 從文字中擷取統一編號
 * @param {string} text - 文字內容
 * @returns {string|null} 擷取到的統編，若無則返回 null
 */
function extractTaxId(text) {
    const match = text.match(/\d{8}/);
    return match ? match[0] : null;
}

/**
 * 從文字中擷取發票字軌號碼
 * @param {string} text - 文字內容
 * @returns {string|null} 擷取到的發票號碼，若無則返回 null
 */
function extractInvoiceNo(text) {
    const match = text.match(/[A-Z]{2}\d{8}/);
    return match ? match[0] : null;
}

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 顯示載入遮罩
 * @param {string} message - 載入訊息
 */
function showLoading(message = '處理中...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text" id="loading-text"></div>
        `;
        document.body.appendChild(overlay);
    }
    
    document.getElementById('loading-text').textContent = message;
    overlay.style.display = 'flex';
}

/**
 * 隱藏載入遮罩
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * 顯示通知訊息
 * @param {string} message - 訊息內容
 * @param {string} type - 訊息類型 (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: var(--bg-card);
        border: 2px solid var(--neon-cyan);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slide-in 0.3s ease;
    `;
    
    // 根據類型調整邊框顏色
    if (type === 'success') notification.style.borderColor = 'var(--status-normal)';
    if (type === 'error') notification.style.borderColor = 'var(--status-error)';
    if (type === 'warning') notification.style.borderColor = 'var(--status-review)';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * 深拷貝物件
 * @param {Object} obj - 要拷貝的物件
 * @returns {Object} 拷貝後的物件
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函式
 * @param {Function} func - 要執行的函式
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} 防抖後的函式
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 將 File 轉換為 Base64
 * @param {File} file - 檔案物件
 * @returns {Promise<string>} Base64 字串
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 將 Canvas 轉換為 Blob
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @returns {Promise<Blob>} Blob 物件
 */
function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve);
    });
}

/**
 * 下載檔案
 * @param {Blob} blob - 檔案 Blob
 * @param {string} filename - 檔案名稱
 */
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
