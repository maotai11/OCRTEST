// ========================================
// 分塊頁面擴展功能
// 為 App 類別新增分塊相關方法
// ========================================

/**
 * 更新分塊頁面
 */
App.prototype.updateChunkingPage = function () {
    if (this.processedData.length === 0) {
        showNotification('請先執行 OCR 識別', 'warning');
        return;
    }

    const firstData = this.processedData[0];
    this.displayChunkingResult(firstData);
};

/**
 * 顯示分塊結果
 */
App.prototype.displayChunkingResult = async function (data) {
    const canvas = document.getElementById('chunk-canvas');
    if (!canvas) return;

    chunkVisualizer.initialize(canvas);
    await chunkVisualizer.drawChunks(data.fileData, data.chunks);
    this.updateFieldList(data.invoiceFields);
    this.updateLegend();
};

/**
 * 更新欄位列表
 */
App.prototype.updateFieldList = function (fields) {
    const fieldList = document.getElementById('field-list');
    if (!fieldList) return;

    const fieldItems = [];

    if (fields.invoiceNumber) {
        fieldItems.push({
            label: '發票號碼',
            value: fields.invoiceNumber.value,
            confidence: fields.invoiceNumber.confidence,
            color: FieldTypeColors.INVOICE_NUMBER
        });
    }

    if (fields.taxIds.buyer) {
        fieldItems.push({
            label: '買方統編',
            value: fields.taxIds.buyer.value,
            confidence: fields.taxIds.buyer.confidence,
            color: FieldTypeColors.TAX_ID_BUYER
        });
    }

    if (fields.taxIds.seller) {
        fieldItems.push({
            label: '賣方統編',
            value: fields.taxIds.seller.value,
            confidence: fields.taxIds.seller.confidence,
            color: FieldTypeColors.TAX_ID_SELLER
        });
    }

    if (fields.date) {
        fieldItems.push({
            label: '日期',
            value: fields.date.value,
            confidence: fields.date.confidence,
            color: FieldTypeColors.DATE
        });
    }

    if (fields.amounts.sales) {
        fieldItems.push({
            label: '銷售額',
            value: `NT$ ${formatAmount(fields.amounts.sales.value)}`,
            confidence: fields.amounts.sales.confidence,
            color: FieldTypeColors.SALES_AMOUNT
        });
    }

    if (fields.amounts.tax) {
        fieldItems.push({
            label: '稅額',
            value: `NT$ ${formatAmount(fields.amounts.tax.value)}`,
            confidence: fields.amounts.tax.confidence,
            color: FieldTypeColors.TAX_AMOUNT
        });
    }

    if (fields.amounts.total) {
        fieldItems.push({
            label: '總計',
            value: `NT$ ${formatAmount(fields.amounts.total.value)}`,
            confidence: fields.amounts.total.confidence,
            color: FieldTypeColors.TOTAL_AMOUNT
        });
    }

    if (fields.itemsTable && fields.itemsTable.items) {
        fieldItems.push({
            label: '商品列表',
            value: `${fields.itemsTable.items.length} 項商品`,
            confidence: fields.itemsTable.confidence,
            color: FieldTypeColors.ITEMS_TABLE
        });
    }

    fieldList.innerHTML = fieldItems.map(item => `
        <div class="field-item" style="border-left: 4px solid ${item.color}">
            <div class="field-label">${item.label}</div>
            <div class="field-value">${item.value}</div>
            <div class="field-confidence">信心度: ${Math.round(item.confidence * 100)}%</div>
        </div>
    `).join('');
};

/**
 * 更新圖例
 */
App.prototype.updateLegend = function () {
    const legendList = document.getElementById('legend-list');
    if (!legendList) return;

    const legend = chunkVisualizer.createLegend();

    legendList.innerHTML = legend.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color}"></div>
            <div class="legend-label">${item.label}</div>
            <div class="legend-count">(${item.count})</div>
        </div>
    `).join('');
};

/**
 * 處理區塊選擇事件
 */
App.prototype.handleChunkSelected = function (chunk) {
    console.log('選中區塊:', chunk);

    if (chunk.fieldInfo) {
        const info = chunk.fieldInfo;
        showNotification(
            `${FieldTypeLabels[chunk.fieldType]}: ${info.value || documentChunker.getChunkText(chunk)}`,
            'info'
        );
    }
};

/**
 * 匯出標註後的圖片
 */
App.prototype.exportAnnotatedImage = function () {
    try {
        const imageData = chunkVisualizer.exportImage();

        const link = document.createElement('a');
        link.download = `annotated_${Date.now()}.png`;
        link.href = imageData;
        link.click();

        showNotification('標註圖片已匯出', 'success');
    } catch (error) {
        console.error('匯出失敗:', error);
        showNotification('匯出失敗', 'error');
    }
};
