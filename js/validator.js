// ========================================
// 驗算引擎
// ========================================

class Validator {
    constructor() {
        this.rules = [
            {
                name: '銷售額 + 稅額 = 合計',
                validate: (data) => this.validateSalesTaxTotal(data)
            },
            {
                name: '品項金額加總 = 銷售額',
                validate: (data) => this.validateItemsTotal(data)
            },
            {
                name: '統編核對',
                validate: (data) => this.validateTaxId(data)
            }
        ];
    }

    /**
     * 驗算所有規則
     * @param {Object} extractedData - 擷取資料
     * @returns {Object} 驗算結果
     */
    validate(extractedData) {
        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            details: {}
        };

        // 執行所有驗算規則
        this.rules.forEach(rule => {
            const result = rule.validate(extractedData);
            results.details[rule.name] = result;

            if (!result.isValid) {
                results.isValid = false;
                results.errors.push({
                    rule: rule.name,
                    message: result.message,
                    diff: result.diff,
                    expected: result.expected,
                    actual: result.actual
                });
            }

            if (result.warnings && result.warnings.length > 0) {
                results.warnings.push(...result.warnings);
            }
        });

        return results;
    }

    /**
     * 驗算：銷售額 + 稅額 = 合計
     * @param {Object} data - 擷取資料
     * @returns {Object} 驗算結果
     */
    validateSalesTaxTotal(data) {
        const amounts = data.amounts || [];

        const salesAmount = amounts.find(a => a.keyword === '銷售額');
        const taxAmount = amounts.find(a => a.keyword === '稅額');
        const totalAmount = amounts.find(a => a.keyword === '合計' || a.keyword === '總計');

        if (!salesAmount || !taxAmount || !totalAmount) {
            return {
                isValid: false,
                message: '缺少必要欄位（銷售額、稅額或合計）',
                warnings: []
            };
        }

        // 使用 Decimal.js 進行精準計算
        const sales = new Decimal(salesAmount.amount);
        const tax = new Decimal(taxAmount.amount);
        const total = new Decimal(totalAmount.amount);
        
        const expected = sales.plus(tax);
        const diff = total.minus(expected);

        // 容許 1 元誤差
        if (diff.abs().greaterThan(1)) {
            return {
                isValid: false,
                message: `銷售額 + 稅額 ≠ 合計`,
                expected: formatAmount(expected.toNumber()),
                actual: formatAmount(total.toNumber()),
                diff: formatAmount(diff.toNumber()),
                warnings: []
            };
        }

        return {
            isValid: true,
            message: '驗算通過',
            warnings: []
        };
    }

    /**
     * 驗算：品項金額加總 = 銷售額
     * @param {Object} data - 擷取資料
     * @returns {Object} 驗算結果
     */
    validateItemsTotal(data) {
        const amounts = data.amounts || [];
        const items = data.items || [];

        const salesAmount = amounts.find(a => a.keyword === '銷售額' || a.keyword === '小計');

        if (!salesAmount) {
            return {
                isValid: false,
                message: '缺少銷售額或小計欄位',
                warnings: []
            };
        }

        if (items.length === 0) {
            return {
                isValid: true,
                message: '無品項明細，跳過驗算',
                warnings: ['未偵測到品項明細']
            };
        }

        // 使用 Decimal.js 進行精準加總
        let itemsTotal = new Decimal(0);
        items.forEach(item => {
            itemsTotal = itemsTotal.plus(new Decimal(item.amount));
        });

        const expected = new Decimal(salesAmount.amount);
        const diff = itemsTotal.minus(expected);

        // 容許 1 元誤差
        if (diff.abs().greaterThan(1)) {
            return {
                isValid: false,
                message: `品項金額加總 ≠ 銷售額`,
                expected: formatAmount(expected.toNumber()),
                actual: formatAmount(itemsTotal.toNumber()),
                diff: formatAmount(diff.toNumber()),
                warnings: []
            };
        }

        return {
            isValid: true,
            message: '驗算通過',
            warnings: []
        };
    }

    /**
     * 驗算：統編核對
     * @param {Object} data - 擷取資料
     * @returns {Object} 驗算結果
     */
    validateTaxId(data) {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) {
            return {
                isValid: false,
                message: '無當前使用者',
                warnings: []
            };
        }

        const extractedTaxId = data.taxId;

        if (!extractedTaxId) {
            return {
                isValid: false,
                message: '未偵測到統一編號',
                warnings: ['請手動確認統一編號']
            };
        }

        const userTaxId = currentUser.taxId;

        if (extractedTaxId.taxId !== userTaxId) {
            // 檢查是否為其他已儲存的帳號
            const allUsers = authManager.getAllUsers();
            const matchedUser = allUsers.find(u => u.taxId === extractedTaxId.taxId);

            if (matchedUser) {
                return {
                    isValid: false,
                    message: `統一編號不符：此為「${matchedUser.username}」的統編`,
                    expected: userTaxId,
                    actual: extractedTaxId.taxId,
                    warnings: [`建議切換至帳號「${matchedUser.username}」`]
                };
            }

            return {
                isValid: false,
                message: '統一編號不符',
                expected: userTaxId,
                actual: extractedTaxId.taxId,
                warnings: ['請確認是否為正確的發票']
            };
        }

        return {
            isValid: true,
            message: '統編核對通過',
            warnings: []
        };
    }

    /**
     * 批量驗算
     * @param {Array} extractedDataArray - 擷取資料陣列
     * @returns {Array} 驗算結果陣列
     */
    validateBatch(extractedDataArray) {
        return extractedDataArray.map(data => this.validate(data));
    }
}

// 全域 Validator 實例
const validator = new Validator();
