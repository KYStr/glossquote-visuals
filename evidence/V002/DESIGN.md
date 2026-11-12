# V002 流體檔案 / Liquid Archive

把折光環、靜滴與開口弧放進深色材質檔案。橫排無襯線標題壓在主畫面上方，物件懸在兩側不等寬的邊注之間。暖橙標示選擇與焦點。窄版依物件、當前說明、控制與全文的順序閱讀。

## 實作

- 三種輪廓以固定版 Chrome 的 ringSDF、circleSDF、crescentSDF 建立。開口弧以相交圓的負空間形成切口。每個輪廓各有反射色與表面波紋，切換時只顯示一個 Chrome layer，三者沿用同一 canvas 和 renderer。
- 原生單選與 0–180° 滑桿更新輪廓、反射和說明。靜態 SVG 為原創，仍可切換和轉動。無 JavaScript 時顯示折光環及三篇完整物件說明。
- 共用 V001 的生命週期。這次把兩件作品的 SDK 呼叫集中在 standalone adapter，保留原有 sRGB、遙測停用、無 debug storage 讀取與手動尺寸控制。候選 workflow 會完整回歸 V001，並檢查 V002 的三個物件與 20 次連續切換。

## 驗證與限制

`npm ci --ignore-scripts`、`npm run check`、`npm test`、`npm run build`。同 SHA 的 Windows GitHub-hosted Chromium 檢查四寬、200% 文字、鍵盤與觸控、三個 WebGPU 物件、旋轉、暫停、離屏、無 JS / GPU 與 runtime 隱私。旋轉使用 Chrome 的 `envRotation` 和 2D SDF `rotation`。

SDK 的固定 public API 沒有硬性 DPR 或 FPS cap。軟體 renderer 的 texture acquisition 與有效 DPR 只代表該 runner；真機 FPS、耗電、完整讀屏體驗另列 NOT_RUN。
