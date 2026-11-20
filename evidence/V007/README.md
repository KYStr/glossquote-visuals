
# V007 布邊 SELVEDGE · 作者交接

## 候選入口

- 繁中 `/glossquote-visuals/works/selvedge/`，英文 `/glossquote-visuals/en/works/selvedge/`。
- 整合時由主責保留 V007 registry 承接紀錄，並在共用 catalog 登錄 `media/selvedge/cover.webp`（1200 × 800）。本站使用既有 Vite 候選路由、CSP 及 metadata 格式。
- `[data-stage]` 提供 `data-motion`、`data-weave` 及 `data-cycle-seconds="8"`。三個控制為 `[data-weave-control="plain"]`、`[data-weave-control="twill"]`、`[data-weave-control="satin"]`，暫停和繼續共用唯一 `[data-pause]`。
- `flow.mjs` 匯出 `setMaterial(page, state, input)`，state 依序為 0、1、2。支援 keyboard 和具有觸控的 Playwright context。另匯出 `testFlow(page, lang)`，從初次載入的空白樣本單開始，回傳中英文實際下載內容及操作觀察。

## 構圖與來源

使用自行編寫的經緯格點、橫截面明暗及交點遮蔽。平紋以行列和的奇偶決定上浮，2/2 斜紋每列位移一格，五枚經面緞紋以跨二結點留下四緯長浮線。側光只更新照明，紗線座標與束邊保持固定。用像素所覆蓋的經緯距離平滑細節， fringe 有獨立的細絲和投影。三張放大圖固定從第 15–22 條經線及第 11–16 條緯線取樣。

`src/works/selvedge/render-posters.py` 用 NumPy 和 Pillow 從相同投影及組織規則產生本機 WebP，`cover.webp` 是平紋首幀，另外兩種布面對應各自的靜態海報。可從專案根目錄執行 `python src/works/selvedge/render-posters.py`。版面使用系統字型。內容與配色色號為原創概念目錄，樣本單是本頁暫存，下載在裝置上產生。停用 JavaScript 時，可透過瀏覽器列印完整布樣資料。

## 作者確認

- Windows、Node 24.14.0，鎖版 `npm ci`、`npm run check`、`npm test`（20 項）、候選 `npm run build`、JS 語法檢查皆通過。候選建置暫加本工作樹 registry/catalog 並已還原。Windows 持久環境指紋一致。
- 兩語靜態入口、canonical、hreflang、社群封面、畫廊返回連結和 CSP 通過建置檢查。含延遲載入資源的 gzip 預算為繁中 1,285,256 bytes、英文 1,284,908 bytes。檢視了原創海報與三張固定放大圖，逐像素核對三張放大圖共 144 個交點。
- 桌機／手機實際版面、鍵盤／觸控、真實下載、列印、WebGPU 畫面與更新間隔、隱私請求和生命週期的瀏覽器取證均為 NOT_RUN。請依 M04 規則在隔離環境對固定 SHA 獨立驗收。
