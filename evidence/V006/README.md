# V006 潮間帶 TIDE TABLE｜作者驗證

作品入口為候選版的 `/glossquote-visuals/works/tide-table/` 與 `/glossquote-visuals/en/works/tide-table/`。候選建置時由主責的 registry 搭配 `tide-table` catalog 條目收錄。封面為 `media/tide-table/cover.webp`（1200 × 800）。網站為概念品牌，潮位、路線與團費均為規劃示意。

## 材質與來源

地形、配色、波紋、海圖符號及站標皆為本作品原創。沒有外部媒材或自訂字型下載。`src/works/tide-table/coast.wgsl` 使用同一個解析高度場計算等高線、浸水遮罩和泡沫帶。海圖虛線依水位切掉淹沒的路段。低潮起算，約 2.5 秒達中潮、5 秒達高潮、10 秒回到低潮。手動潮位固定水面高度，海水紋理持續流動至暫停。三張 WebP 從同一份 WGSL 輸出，構圖與即時畫面相同。

`native-*.png` 為 1200 × 800 原生離屏 WebGPU 輸出，加上與網頁位置相同的 A/B/C 標記。環境為 Windows、wgpu-py 0.29.0、Vulkan、NVIDIA GeForce RTX 3060（610.88）。`native-survey.json` 以同一 shader 的深度遮罩讀回像素，四幀濕區依水位擴大，低潮復位後遮罩與初始逐像素一致。

| 幀 | A 北礁 | B 南礁 | C 水道 |
|---|---|---|---|
| 低潮 0 s | 岩面露出並與高地相連，右側岩脊隔開潮池 | 岩面露出，外沿有窄泡沫帶 | 水道已進水，末端狹窄 |
| 中潮 2.5 s | 岩面仍露出，與右側高地間已進水 | 岩面露出，礁腳退到更高一圈等高線 | 水道變寬並接通原先獨立的潮池 |
| 高潮 5 s | 北礁標記處已被水覆蓋 | 南礁標記處維持乾燥，岸線到達礁腳 | 水道向內延伸，上方高地仍露出 |
| 返回低潮 10 s | 岩面與岩脊重新露出 | 露出範圍回到初始位置 | 回到低潮範圍，潮池再度隔離 |

使用 `python src/works/tide-table/render-coast.py` 重繪三張海報與四幀原生證據，需在工具環境提供 wgpu 0.29.0 與 Pillow。

## 頁面與驗收介面

- `[data-stage]` 包含唯一畫布、`data-motion`、`data-level`、`data-tide`（固定潮位 0/1/2）及 `data-cycle-seconds="10"`。
- `button[data-tide="0"]` 至 `button[data-tide="2"]` 選擇低／中／高潮。 `[data-cycle]` 回到循環，`[data-pause]` 暫停／繼續。
- `flow.mjs` 匯出 `setMaterial(page, state, input)` 與 `testFlow(page, lang)`。後者檢查三條路線、1 和 8 人、無效人數、回改保留、自選與空裝備，以及真實下載的 UTF-8 位元組。建議用獨立頁面執行商業流程，從初始路線開始。
- clean install、來源與建置檢查和 20 項專案測試已執行。候選雙語頁與海報可由本機 HTTP 讀取。雙語 DOM 測試驗證基本清單、路線切換、表單有效性、回改與 Blob 文字。
- 桌面／手機瀏覽器截圖、鍵盤／觸控、WebGPU 整合與提交效能、下載事件、列印實際版面、裝置遺失、背景與儲存狀態均待隔離瀏覽器驗收，記為 NOT_RUN。原生圖是材質作者證據。
