# V003 夜航訊號 / Night Signal

一場以廣播章節閱讀的虛構展。奶油黃頁面、靛藍斜切海報與少量紅色把「離岸載波」、「盲區回聲」、「晨線」編排在一起。節目格以 3 比 2 的橫向分欄接到通欄的尾章，手機保留順序。HTML 有三篇完整原創文案與可定位的節目連結。

## 實作

- 固定版 SolidColor、Grid、Stripes 與兩條 SineWave 組成訊號圖。三個頻道各有不同底色、網格密度、條紋方向與波形頻率。15–65% 的強度輸入只調整兩條波形的振幅與主波可見度，速度固定在低幅的 0.11。頁面無音訊與閃動式切換。
- 原生單選鈕與滑桿可用鍵盤及觸控。選取有底線，章節摘要隨頻道更新。SVG 原創海報搭配 CSS 條紋，靜態狀態仍能切換與調整。無 JavaScript 保留三篇節目、雙語導覽與海報。
- 沿用共用 standalone adapter 與生命週期。預設 reduced motion 不啟動 WebGPU。暫停、隱藏及離屏停止連續渲染，回返使用當頁設定。

## 驗證與限制

同 SHA 的 Windows GitHub-hosted Chromium 驗證三種可見 WebGPU 合成、強度兩端、18 次切換、四寬與 200% 文字、鍵盤／觸控、隱藏／離屏、無 GPU / JS、網路、storage，並回歸 V001、V002。建置命令為 `npm ci --ignore-scripts`、`npm run check`、`npm test`、`npm run build`。

軟體 GPU 的有效 DPR 與每秒 texture acquisitions 屬該測試環境。固定 public API 無硬性 DPR 或 FPS cap。真機 FPS、耗電、完整讀屏與外部驗收另列。
