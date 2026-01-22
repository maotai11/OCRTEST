// ========================================
// Image Preprocessor (OpenCV.js)
// 影像前處理模組：傾斜校正、二值化、去噪、銳化
// ========================================

class ImagePreprocessor {
    constructor() {
        this.isInitialized = false;
        this.cv = null;
    }

    /**
     * 初始化 OpenCV.js
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('OpenCV.js 已初始化');
            return;
        }

        try {
            showLoading('初始化影像處理引擎...');

            // 等待 OpenCV.js 載入
            if (typeof cv === 'undefined') {
                throw new Error('OpenCV.js 未載入');
            }

            // 等待 OpenCV.js 準備就緒
            await new Promise((resolve, reject) => {
                if (cv.Mat) {
                    resolve();
                } else {
                    cv.onRuntimeInitialized = () => resolve();
                    setTimeout(() => reject(new Error('OpenCV.js 初始化超時')), 30000);
                }
            });

            this.cv = cv;
            this.isInitialized = true;
            hideLoading();
            console.log('OpenCV.js 初始化完成');
            showNotification('影像處理引擎初始化完成', 'success');
        } catch (error) {
            hideLoading();
            console.error('OpenCV.js 初始化失敗:', error);
            showNotification('影像處理引擎初始化失敗: ' + error.message, 'warning');
            // 不拋出錯誤，允許系統在沒有前處理的情況下運行
        }
    }

    /**
     * 前處理圖片
     * @param {string|HTMLImageElement|HTMLCanvasElement} imageData - 圖片來源
     * @param {string} mode - 處理模式 ('speed' | 'precision')
     * @returns {Promise<HTMLCanvasElement>} 處理後的 canvas
     */
    async preprocessImage(imageData, mode = 'speed') {
        // 如果 OpenCV.js 未初始化，嘗試初始化
        if (!this.isInitialized) {
            await this.initialize();
        }

        // 如果初始化失敗，返回原始圖片
        if (!this.isInitialized) {
            console.warn('OpenCV.js 未初始化，跳過影像前處理');
            return this.imageDataToCanvas(imageData);
        }

        try {
            // 將圖片轉換為 canvas
            const canvas = this.imageDataToCanvas(imageData);
            
            // 將 canvas 轉換為 OpenCV Mat
            let mat = this.cv.imread(canvas);

            // 根據模式執行不同的處理
            if (mode === 'speed') {
                mat = await this.speedMode(mat);
            } else if (mode === 'precision') {
                mat = await this.precisionMode(mat);
            } else {
                console.warn(`未知的處理模式: ${mode}，使用速度模式`);
                mat = await this.speedMode(mat);
            }

            // 將 Mat 轉換回 canvas
            const outputCanvas = document.createElement('canvas');
            this.cv.imshow(outputCanvas, mat);

            // 釋放記憶體
            mat.delete();

            return outputCanvas;
        } catch (error) {
            console.error('影像前處理失敗:', error);
            // 降級策略：返回原始圖片
            return this.imageDataToCanvas(imageData);
        }
    }

    /**
     * 速度模式：灰階 + 自適應二值化
     * @param {cv.Mat} mat - 輸入 Mat
     * @returns {cv.Mat} 處理後的 Mat
     */
    async speedMode(mat) {
        // 1. 灰階轉換
        let gray = new this.cv.Mat();
        if (mat.channels() === 4) {
            this.cv.cvtColor(mat, gray, this.cv.COLOR_RGBA2GRAY);
        } else if (mat.channels() === 3) {
            this.cv.cvtColor(mat, gray, this.cv.COLOR_RGB2GRAY);
        } else {
            gray = mat.clone();
        }

        // 2. 自適應二值化
        let binary = new this.cv.Mat();
        this.cv.adaptiveThreshold(
            gray,
            binary,
            255,
            this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            this.cv.THRESH_BINARY,
            11,
            2
        );

        // 釋放中間結果
        gray.delete();

        return binary;
    }

    /**
     * 精度模式：去噪 + 對比 + 二值化 + 去斜 + 透視校正
     * @param {cv.Mat} mat - 輸入 Mat
     * @returns {cv.Mat} 處理後的 Mat
     */
    async precisionMode(mat) {
        // 1. 灰階轉換
        let gray = new this.cv.Mat();
        if (mat.channels() === 4) {
            this.cv.cvtColor(mat, gray, this.cv.COLOR_RGBA2GRAY);
        } else if (mat.channels() === 3) {
            this.cv.cvtColor(mat, gray, this.cv.COLOR_RGB2GRAY);
        } else {
            gray = mat.clone();
        }

        // 2. 去噪
        let denoised = new this.cv.Mat();
        this.cv.fastNlMeansDenoising(gray, denoised, 10, 7, 21);

        // 3. 對比拉升（直方圖均衡化）
        let equalized = new this.cv.Mat();
        this.cv.equalizeHist(denoised, equalized);

        // 4. 銳化
        let sharpened = this.sharpen(equalized);

        // 5. 傾斜校正
        let deskewed = this.deskew(sharpened);

        // 6. 自適應二值化
        let binary = new this.cv.Mat();
        this.cv.adaptiveThreshold(
            deskewed,
            binary,
            255,
            this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            this.cv.THRESH_BINARY,
            11,
            2
        );

        // 釋放中間結果
        gray.delete();
        denoised.delete();
        equalized.delete();
        sharpened.delete();
        deskewed.delete();

        return binary;
    }

    /**
     * 銳化
     * @param {cv.Mat} mat - 輸入 Mat
     * @returns {cv.Mat} 銳化後的 Mat
     */
    sharpen(mat) {
        // 使用 Laplacian 銳化
        let laplacian = new this.cv.Mat();
        this.cv.Laplacian(mat, laplacian, this.cv.CV_16S, 1, 1, 0, this.cv.BORDER_DEFAULT);
        
        let abs_laplacian = new this.cv.Mat();
        this.cv.convertScaleAbs(laplacian, abs_laplacian);
        
        let sharpened = new this.cv.Mat();
        this.cv.addWeighted(mat, 1.5, abs_laplacian, -0.5, 0, sharpened);
        
        laplacian.delete();
        abs_laplacian.delete();
        
        return sharpened;
    }

    /**
     * 傾斜校正
     * @param {cv.Mat} mat - 輸入 Mat
     * @returns {cv.Mat} 校正後的 Mat
     */
    deskew(mat) {
        try {
            // 1. 邊緣檢測
            let edges = new this.cv.Mat();
            this.cv.Canny(mat, edges, 50, 150, 3, false);

            // 2. 霍夫線變換
            let lines = new this.cv.Mat();
            this.cv.HoughLines(edges, lines, 1, Math.PI / 180, 100, 0, 0, 0, Math.PI);

            // 3. 計算平均角度
            let angles = [];
            for (let i = 0; i < lines.rows; i++) {
                let rho = lines.data32F[i * 2];
                let theta = lines.data32F[i * 2 + 1];
                let angle = (theta * 180 / Math.PI) - 90;
                
                // 只考慮接近水平或垂直的線
                if (Math.abs(angle) < 45) {
                    angles.push(angle);
                }
            }

            // 4. 如果沒有檢測到線，返回原圖
            if (angles.length === 0) {
                edges.delete();
                lines.delete();
                return mat.clone();
            }

            // 5. 計算中位數角度
            angles.sort((a, b) => a - b);
            const medianAngle = angles[Math.floor(angles.length / 2)];

            // 6. 如果角度太小，不需要校正
            if (Math.abs(medianAngle) < 0.5) {
                edges.delete();
                lines.delete();
                return mat.clone();
            }

            // 7. 旋轉圖片
            const center = new this.cv.Point(mat.cols / 2, mat.rows / 2);
            const rotationMatrix = this.cv.getRotationMatrix2D(center, medianAngle, 1.0);
            
            let rotated = new this.cv.Mat();
            this.cv.warpAffine(
                mat,
                rotated,
                rotationMatrix,
                new this.cv.Size(mat.cols, mat.rows),
                this.cv.INTER_LINEAR,
                this.cv.BORDER_CONSTANT,
                new this.cv.Scalar(255, 255, 255, 255)
            );

            // 釋放記憶體
            edges.delete();
            lines.delete();
            rotationMatrix.delete();

            console.log(`傾斜校正: ${medianAngle.toFixed(2)}°`);

            return rotated;
        } catch (error) {
            console.error('傾斜校正失敗:', error);
            return mat.clone();
        }
    }

    /**
     * 將圖片資料轉換為 canvas
     * @param {string|HTMLImageElement|HTMLCanvasElement} imageData - 圖片來源
     * @returns {HTMLCanvasElement} canvas
     */
    imageDataToCanvas(imageData) {
        if (imageData instanceof HTMLCanvasElement) {
            return imageData;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (typeof imageData === 'string') {
            // Base64 字串
            const img = new Image();
            img.src = imageData;
            canvas.width = img.width || 800;
            canvas.height = img.height || 600;
            ctx.drawImage(img, 0, 0);
        } else if (imageData instanceof HTMLImageElement) {
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            ctx.drawImage(imageData, 0, 0);
        }

        return canvas;
    }

    /**
     * 取得前後對比預覽
     * @param {HTMLCanvasElement} originalCanvas - 原始 canvas
     * @param {HTMLCanvasElement} processedCanvas - 處理後 canvas
     * @returns {Object} 包含兩個 canvas 的物件
     */
    getBeforeAfterPreview(originalCanvas, processedCanvas) {
        return {
            before: originalCanvas,
            after: processedCanvas,
            beforeDataURL: originalCanvas.toDataURL('image/png'),
            afterDataURL: processedCanvas.toDataURL('image/png')
        };
    }

    /**
     * 取得引擎狀態
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            available: typeof cv !== 'undefined'
        };
    }
}

// 全域 ImagePreprocessor 實例
const imagePreprocessor = new ImagePreprocessor();
