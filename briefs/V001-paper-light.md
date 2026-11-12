# V001 紙與光 / Paper & Light

Scope: M01 的第一件，加上雙語作品集入口。觀眾是想參考文化刊物/藝廊官網視覺的人。用完整可閱讀的原創小展覽呈現光如何掠過紙，不是空白 shader demo。

## 構成與設計

暖白紙、墨黑 serif 大標、灰細線、極少朱紅。Desktop 左側約 35% 刊物題名/引言，右側 65% 一張大紙面，下面不等寬的兩篇短文與材料筆記。Mobile 先標題與主視覺，再單欄短文；沒有固定巨高 hero 擋住內容。自行寫三段中英文展覽文案（明示原創概念展，無假日期售票）。

主視覺以官方免費 generators + 低強度 grain 組出紙面光影；選實際存在的元件，光角度滑桿 0–180 與 3 個有名稱的光色 presets。內容字不繪進 canvas。明顯的「暫停動態 / Pause motion」與「重設 / Reset」，帶 accessible value output；觸控、鍵盤 Arrow/Home/End 有效。動態很慢且不能閃爍。使用者選擇保留在當頁記憶體，不寫 storage。

Fallback 用原創 CSS/SVG 紙纖維/光束構圖，無 GPU/no JS/reduced-motion 都有完整視覺和敘事；若無 shader，滑桿可改 CSS 光角，不能假稱 GPU 已啟動。GPU 必須 progressive enable，failed/lost 時可靠回到 fallback。

## 畫廊

中文 `/index.html`、英文 `/en/index.html`。不等比例作品索引、有作品名/一句情境/縮圖/狀態，標題 GlossQuote Visuals。只有 published 作品列正式入口；candidate 用明示候選連結或只放於 preview，不用假 live。Gallery 不啟動 WebGPU；縮圖本地 SVG/已驗真實截圖，有 credits。每個作品連回對應語言 gallery 與 source。以 registry 或作品 manifest 產生清單，不手工漏加。

## 工程與驗收

允許修改共通 src/shared、package/lockfile、build/check/test、gallery、V001、registry 自己紀錄、evidence。不可改其他候選作品實作。靜態 HTML + Vite + pinned shaders/js；最多一個 canvas，hidden/offscreen時用公開 pause 停止。有效DPR≤1.5與30fps是設計目標，固定版 public API 不暴露這兩項限制，不得虛構 rendererSettings；依 ACCEPTANCE 的測量/adapter規則處理，記錄實際效果。

測試：shared shader state machine 的 async init/dispose race、telemetry disabled、pause/reduced-motion/visibility 優先規則；真實 renderer 檢驗四種 viewport、鍵盤範圍、fallback/no JS、雙語文字、contrast與Network/Storage；clean build 子路徑連結與 metadata。reviewer 依 docs/ACCEPTANCE.md 同 candidate SHA 核對。若無安全隔離GPU環境，source candidate可推但不得記live/已驗視覺。

非目標：上傳圖片、編輯器、文章 CMS、付費字型、第三方素材或服務、即時資料。完成物是可重現來源、PR、設計說明、實測記錄；發布另依 RELEASE.md。
