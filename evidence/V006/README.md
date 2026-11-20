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

## PERF-1 修訂

岩面、水面與泡沫只在各自可見的像素著色，等高線和受光共用高度導數，波紋的整數次方直接相乘。即時畫布的邏輯渲染寬度上限為 640 px，兩軸同比縮放，海圖 CSS 尺寸及 DOM 標記位置維持原樣。上一輪繁中桌機的畫布為 786 × 524、DPR 1，修訂後同條件預期為 640 × 427，約少 34% 像素。窄於上限的畫布維持原解析度。

本機 Microsoft Basic Render Driver（D3D12）以 12 幀暖機、各組交錯取樣 120 幀，量單一 WGSL 繪圖提交到佇列完成。舊版 786 × 524 的 median／p95 為 2.508／2.632 ms，修訂版同尺寸為 2.277／2.437 ms，修訂版 640 × 427 為 1.568／1.690 ms。同尺寸的四幀色彩比對結果為單一色彩通道相差 1/255，其餘完全一致；1200 × 800 的四張浸水遮罩及三處標記結果與原稿相同。縮放後仍可辨識低潮獨立潮池、中潮連通、兩處礁岩、等高線與泡沫邊緣。

本機數字只量原生離屏繪圖。PERF-1 仍需在原 GitHub Windows 瀏覽器以既有呈現提交方法重驗。上一輪繁中桌機的 adapter 欄位回報 SwiftShader，p95 為 59.8 ms。 [原 GitHub 驗收執行](https://github.com/KYStr/glossquote-visuals/actions/runs/44775958168)

## 頁面與驗收介面

- `[data-stage]` 包含唯一畫布、`data-motion`、`data-level`、`data-tide`（固定潮位 0/1/2）及 `data-cycle-seconds="10"`。
- `button[data-tide="0"]` 至 `button[data-tide="2"]` 選擇低／中／高潮。 `[data-cycle]` 回到循環，`[data-pause]` 暫停／繼續。
- `flow.mjs` 匯出 `setMaterial(page, state, input)` 與 `testFlow(page, lang)`。後者檢查三條路線、1 和 8 人、無效人數、回改保留、自選與空裝備，以及真實下載的 UTF-8 位元組。建議用獨立頁面執行商業流程，從初始路線開始。
- clean install、來源與建置檢查和 20 項專案測試已執行。候選雙語頁與海報可由本機 HTTP 讀取。雙語 DOM 測試驗證基本清單、路線切換、表單有效性、回改與 Blob 文字。
- 桌面／手機瀏覽器截圖、鍵盤／觸控、WebGPU 整合與提交效能、下載事件、列印實際版面、裝置遺失、背景與儲存狀態均待隔離瀏覽器驗收，記為 NOT_RUN。原生圖是材質作者證據。
