# V009 疊印 AFTERIMAGE PRESS · M06

## 重現

- 以正常動態開啟 `works/afterimage-press/` 或 `en/works/afterimage-press/`。等首個 WebGPU 畫面出現，刮刀從紙張上緣接觸、向下轉印第二色，再離開印台。完整行程 3.75 秒，完成後留在印件。
- 用「重印第二版」再印一次。色版保留原 `0 / 1 / 2` 介面（雙版／鈷藍／螢橘）。切色會直接顯示所選校樣，中止進行中的刮墨行程。減少動態或無 GPU 時，查看起點與完整成品可手動切換，單版仍可獨立檢視。
- 刮刀與印墨共用 `stroke.js` 的刃口位置。刀身為原生 SVG，紙邊、套準線、工作頁字排由 CSS、SVG 與 HTML 呈現。WebGPU 只繪製兩版實色墨、交疊色、網點和極淡紙面反光，沿用 352 px backing width 上限。場景仍有單一 `[data-stage]`、單一活動 canvas、可見 `[data-pause]` 與既有動態階段；`data-cycle-seconds` 改為 `evolving`，完成後無自動重印。
- `bake-art.py` 使用 Pillow 和 NumPy 重產固定版形、型錄與 1200 × 800 封面。繁中 WOFF2 沿用固定 Google Fonts Noto Sans TC 來源 `869789e84da92782c144d83d69b64cec54905b5f`，補齊重印和印刷階段文案。字型授權與首次排版機制沿用本作既有檔案。

## 複驗介面

- `setMaterial(page, state, input)` 與 `testFlow(page, lang)` 相容原驗收。商業驗收仍涵蓋估價、張數邊界、回改及 UTF-8 印件製作單。
- `testHeroInteraction(page, input, capture)` 保留既有 `before / after / reset` 回呼順序。M06 可用 `testPrintStroke(page, input, capture)` 多取一張 `passing`。探針記錄 `data-print-run`、`data-print-step`、刮刀位置及紙張和套準線固定的區域，支援鍵盤、滑鼠與觸控。實際套印像素、瀏覽器互動和提交間隔由主責在隔離 Windows 驗收。

## 作者驗證

- 以 `npm ci --ignore-scripts --no-audit --no-fund` 安裝鎖版依賴。`npm run check`、`npm test`（26 項）、`npm run build` 通過。
- 離線模型逐段比對刃口與印墨。刮刀只前進，未經過區域仍與首版一致，已印區域不回退。1.45 秒的落墨像素約佔紙面 7.5%，2 秒約 18%，完成約 24%。檢視 160 px 無字輪廓和較大尺寸的刀口、投影及紙邊。模型並未執行瀏覽器或 WebGPU。
