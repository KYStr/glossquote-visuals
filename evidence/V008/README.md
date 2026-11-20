# 果時 SORBET HOUR 候選交接

- 候選入口為 `/glossquote-visuals/works/sorbet-hour/` 和 `/glossquote-visuals/en/works/sorbet-hour/`。沿用 M04 registry 的 V008 記錄。測試時暫加本機 catalog 條目，其 `image` 為 `media/sorbet-hour/cover.webp`，`width` 為 1200、`height` 為 800。中英文 title 分別為「果時 SORBET HOUR」與「Sorbet Hour」。條目由主責整合。
- `flow.mjs` 的 `testFlow(page, lang)` 預期已載入、杯數歸零且可接收下載的頁面，`lang` 為 `zh-Hant` 或 `en`。回傳每一步的杯數與配方原文。可在 GPU 初始化失敗模式重跑。
- `setMaterial(page, state, input)` 使用原生 radio 的方向鍵或實際 tap，觸控 context 需啟用 `hasTouch`。三個狀態 `0/1/2` 依序為蜜柑、覆盆莓、白芭樂。
- 舞台 `[data-stage]` 含 `data-motion`、`data-material` 與 `data-cycle-seconds="8"`。控制為 `[name=sorbet-flavor]`、`[data-pause]`、`[data-add]`、`[data-remove]`、`[data-download]`。無 JS 的空白配方在 `#blank-recipe`，列印樣式以這張表為輸出。

## 素材與取樣

三張 1200×800 WebP 是作品原創程式生成，無外部圖庫、字型或模型素材。蜜柑海報是首屏與 OG 圖；另兩張用於切換後的靜態切面與品項卡。原始材質為 `src/works/sorbet-hour/sorbet.wgsl`，由同目錄 `render-posters.py` 使用 Python 3.12、wgpu 0.31.0 與 Pillow 12.0.0 離線渲染。可加 `--samples .runs/v008-native` 取得蜜柑 0、2、4、6、8 秒取樣。

弧線距離控制凹深及法線，右端沿弧線延伸與收回，左端保持淺槽。外弧的高冰脊、撕裂面和接觸陰影共用距離與受推側遮罩。蜜柑果肉、莓果籽與芭樂冰晶採不同尺度，表面的光線和顆粒法線沿用基底切面。紙杯口沿遮罩保留同一構圖。

## 作者驗證

- Windows，Node 24.14.0、npm 11.9.0。鎖版 `npm ci`、`npm run check`、`npm test`（20 項）、含兩語 V008 的 `npm run build` 已完成。含 lazy chunks 的建置測量為繁中 1,185,145 bytes、英文 1,184,892 bytes gzip。建置驗證包含 reciprocal metadata、OG 資產、本機路徑、CSP 及 bundle 遙測停用。Vite 對共享 Shaders chunk 發出未壓縮大小提示。
- GPU 離線渲染使用 NVIDIA GeForce RTX 3060、Vulkan、驅動 610.88。同一 WGSL 在 0、2、4、6、8 秒取樣，2／4／6 秒相對首幀有像素差異，8 秒回到首幀。作者檢視 320 px 縮圖，紙杯口沿、左淺右深和三種顆粒的色形差異可辨。
- DOM 模擬對兩語載入無 GPU 模式，驗證零杯、零杯移除、五杯、滿六杯、拒絕第七杯、移除和重配。以產生的 Blob 讀回 3／1／2 杯、600 毫升及成分、過敏原、保存說明。另檢查純 HTML 的成分、份量和空白配方。

## PERF-1 修訂

舞台仍用原始三張海報鋪滿。透明 WebGPU 畫布聚焦刮痕右端約 51% × 51% 的區域，保留該區的原始像素密度。WGSL 先排除離刮痕較遠或落在冰體外的像素，也只在有果粒時評估其面光。紙杯、背景與切面其餘區域沿用原海報。兩語已宣告同源品牌圖示，並保留畫廊與原始碼連結。

以 `render-posters.py --inspect-patch .runs/v008-patch` 可重建局部畫布覆在原海報的三款合成，以及對照的全畫面影格。1200 × 800 蜜柑合成中，1、2、3 秒相對 0 秒分別有 31,543、44,724、51,197 像素至少一個 RGB 通道改變超過 5/255。8 秒回到首幀。作者檢視 320 px 合成縮圖確認冰脊、果粒和紙杯口沿。

原生 D3D12 Microsoft Basic Render Driver（軟體轉譯，10.0.26100.9818），以 wgpu 提交單一 render pass 並等待 GPU 工作完成，暖機 20 幀後收集 100 筆，期間無繪圖讀回。此數據量的是原生 WGSL 工作完成，瀏覽器呈現提交間隔待主責用原驗收方式重測。

| 原生目標 | 改前 median / p95 / max | 改後 median / p95 / max |
| --- | --- | --- |
| 1536 × 1024 → 783 × 522 | 6.881 / 7.180 / 7.447 ms | 1.766 / 1.947 / 2.280 ms |
| 546 × 364 → 278 × 186 | 1.173 / 1.311 / 1.468 ms | 0.463 / 0.517 / 0.585 ms |

## 待主責驗收

NOT_RUN 的瀏覽器項目包括實際下載事件、鍵盤與觸控操作、首屏與縮放、無 JS 列印、降低動態、隔離 WebGPU 初始化與畫面、暫停、裝置復原、更新間隔、網路與儲存檢查。作者驗證留作輔助證據。
