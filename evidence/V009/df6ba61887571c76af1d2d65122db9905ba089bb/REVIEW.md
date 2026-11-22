# V009 固定候選驗收

候選 df6ba61887571c76af1d2d65122db9905ba089bb。主責 GlossQuote Visuals 工作室主責（獨立於原製作對話）。製作 01a1fa4c-f419-7853-bc26-6e79796f0a64。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/45002487345)

<a id="art-1-pass"></a>

## ART-1　PASS

左側服務標題與右側演出海報構成桌機首屏，手機先讀標題隨即看到紙上麥克風、規格與試算入口。

<a id="art-2-pass"></a>

## ART-2　PASS

藍色 FEEDBACK 與單支麥克風先留在紙上。橫刃向下推，紅色 ASSEMBLY 與第二層網點逐步留在刃後；刮刀離場後右側殘影和暗紫交疊區停住。

<a id="art-3-pass"></a>

## ART-3　PASS

全張窄字、紅藍專色與暖紙網點構成獨立的印刷語言。印件型錄與估價流程延續同一組紙張、色版和印量。

<a id="gpu-1-pass"></a>

## GPU-1　PASS

中英桌機與手機尺寸皆有單一有效 WebGPU 畫布。原始紋理與合成畫面隨動作改變，檢查使用 Windows 隔離 Chromium 軟體繪圖。

<a id="gpu-2-pass"></a>

## GPU-2　PASS

以鍵盤與觸控切換狀態並返回，暫停後畫面在至少一秒內保持一致，續播後會繼續。另以實際滑鼠和觸控輸入完成本件的操作序列。

<a id="perf-1-pass"></a>

## PERF-1　PASS

暖機後量十秒實際提交間隔。以下依序是中位數／p95／最長毫秒。zh-Hant-desktop 19.9/26/28.3、zh-Hant-mobile 21.5/22.2/23.0、en-desktop 27.4/28.6/29.4、en-mobile 19.9/21.0/21.3。

<a id="perf-2-pass"></a>

## PERF-2　PASS

兩語首載含延遲載入的壓縮大小最多 1917541 bytes。離屏與隱藏時停止提交，返回仍為單一實例。

<a id="ui-1-pass"></a>

## UI-1　PASS

檢視中英 320、390、768、1440 寬與桌面 200% 放大的實際版型。標題、主要行動、商品控制和結果均可讀，未見水平溢出。

<a id="ui-2-pass"></a>

## UI-2　PASS

檢視操作焦點及 DOM／合成文字對比。兩語五種版型的啟用控制熱區均至少 44×44 CSS px，觸控可完成操作與下載。

<a id="biz-1-pass"></a>

## BIZ-1　PASS

Three AP poster options, two paper colors and sizes, print quantity and production turnaround. Local print specification and indicative quote disclosed in both languages.

<a id="biz-2-pass"></a>

## BIZ-2　PASS

兩語實際切換印件、版本與數量，測試上下限及回改。估價單列出相同規格、印量及選項。

<a id="fall-1-pass"></a>

## FALL-1　PASS

逐一檢視無 JavaScript、GPU 初始化失敗和減少動態的首屏。產品與下一步可辨，減少動態預設靜止，GPU 不可用時仍可完成商流。

<a id="fall-2-pass"></a>

## FALL-2　PASS

快速暫停／恢復、模擬裝置遺失及離頁回返後仍有可讀產品與正常控制，沒有空白頁或未處理例外。

<a id="ship-1-pass"></a>

## SHIP-1　PASS

鎖版安裝、來源檢查、單元測試與建置通過。候選請求為同源，無額外儲存或遙測，兩語、分享圖、canonical 與畫廊入口均通過檢查。

<a id="silhouette-pass"></a>

## silhouette　PASS

160px 中可分辨橫向印刃與斜向麥克風，暖紙矩形不隨印刃走；完印時刀離開紙面。

<a id="finish-pass"></a>

## finish　PASS

標題墨緣銳利、麥克風網罩有意保留顆粒；檢視紙邊與刃口兩側，可辨哪一側已附著紅墨。

<a id="material-pass"></a>

## material　PASS

同一紙白透過粗細網點顯露，紅藍重疊處變深。工具投影只在印台上移動。

<a id="narrative-pass"></a>

## narrative　PASS

首訪藍版已在紙上，刀由上往下壓過，刃後才有朱紅，最終是完整的雙色演出海報。

<a id="continuity-pass"></a>

## continuity　PASS

固定定位十字、麥克風網罩及活動日期全程留在原位。單藍、印到一半、雙版及單紅可分別觀察。

<a id="fidelity-pass"></a>

## fidelity　PASS

桌機與手機能讀到相同海報標題與網罩。首屏、兩張專色校樣及型錄裡的樂團印件是同一設計。

## desktop 動態貼合

固定定位十字、麥克風網罩及活動日期全程留在原位。單藍、印到一半、雙版及單紅可分別觀察。 同一紙白透過粗細網點顯露，紅藍重疊處變深。工具投影只在印台上移動。

## mobile 動態貼合

固定定位十字、麥克風網罩及活動日期全程留在原位。單藍、印到一半、雙版及單紅可分別觀察。 同一紙白透過粗細網點顯露，紅藍重疊處變深。工具投影只在印台上移動。

