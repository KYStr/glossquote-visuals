# V001 紙與光 / Paper & Light

紙與光是一場可在頁面上閱讀的原創概念展。桌面版左欄放刊物式題名與引言，右欄以一張斜折紙面承接光線。窄版把展名和紙面放在控制與短文之前。畫廊以雙語靜態作品卡連到候選頁面，索引由 catalog 和 registry 產生。

## 視覺與互動

- 紙面由原創向量曲線、紙纖維、摺面與投影構成。暖白、墨黑與少量朱紅對應印刷材料。字體使用裝置已有的 serif 與 sans-serif。分享圖為同一向量構圖的 1200 × 630 JPEG。
- 晨白、蜜光和灰藍各有獨立色組。0–180° 原生滑桿與單選鈕更新 CSS 紙面。GPU 運行時，角度改變 LinearGradient 與 Beam 端點，光色更新其顏色。低幅 SimplexNoise 增加纖維變化。所有文字在 HTML。
- 在首次合成畫面前顯示原創靜態圖。暫停時仍可操作靜態光線。減少動態與頁面離開時釋放實例。畫面離開可視區或分頁隱藏時暫停，延後 shader 參數和尺寸寫入。初始化過期後等待回傳、銷毀，再允許下一次啟動。
- 鍵盤可透過原生滑桿與單選鈕調整，重設回到晨白與 38°。頁面內記憶保存選項。無 JavaScript 時保留紙面、雙語導覽與文章。

## 建置與驗收

執行 `npm ci --ignore-scripts`、`npm run check`、`npm test`、`npm run build`。候選 workflow 在 GitHub 託管 Ubuntu VM 對同一 SHA 執行 Chromium 驗收。它檢查 WebGPU 實際像素、鍵盤與觸控、fallback、尺寸與放大、動態生命週期、網路與儲存，以及 Pages 子路徑的本機 HTTP。

固定版 Shaders 使用 `disableTelemetry: true`，以容器尺寸呼叫公開 resize。官方 API 沒有強制 DPR 或 FPS 的選項。軟體 WebGPU 的 texture acquisition 頻率與 canvas 像素比例屬該測試環境。真機更新率、發熱與耗電需另外驗證。meta CSP 作用於頁面資源，Pages response headers 與 frame-ancestors 另受託管環境限制。

見 [依賴 notices](../../public/licenses/NOTICES.txt)、[驗收矩陣](../../docs/ACCEPTANCE.md)、[狀態](../STATUS.md)。託管 VM 與隔離範圍參考 [GitHub 官方文件](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)。
