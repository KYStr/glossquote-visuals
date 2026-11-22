# V009 固定候選驗收

候選 5af20ebdb3d6f60dbbc4fa050678f05a9aca3c44。主責 GlossQuote Visuals 工作室主責（獨立於三個製作對話）。製作 01a1fa4c-f419-7853-bc26-6e79796f0a64。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44981579584)

<a id="art-1-pass"></a>

## ART-1　PASS

桌機以黑色工作室頁面襯出米白印台、鈷藍第一版與木柄刮刀；手機首屏含限量雙色海報、印台及詢價入口。

<a id="art-2-pass"></a>

## ART-2　PASS

固定的藍版先出現，刮刀往下推時只有刀後出現橘色，重疊處留深紫。紙張及定位角在工具離開、單色檢視和再印之間維持原位。

<a id="art-3-pass"></a>

## ART-3　PASS

黑色印台、密排海報字樣和雙色墨與另兩件形成區別；三張型錄海報沿用雙墨與米白紙，詢價單保留印件欄位、粗線和同組品牌配色。

<a id="gpu-1-pass"></a>

## GPU-1　PASS

Chromium 158.0.8127.18 的四次隔離測試均建立 WebGPU 裝置與單一可見畫布。實測 adapter 為 Google SwiftShader。逐幀讀回材質有非空像素與不同雜湊，並與瀏覽器合成原圖對照。

<a id="gpu-2-pass"></a>

## GPU-2　PASS

桌機以鍵盤、手機以觸控實際再印。印前、刮刀在中段、完印及重印各階段影像可查；中段暫停一秒逐位元組完全一致且零提交，續播繼續落墨。

<a id="perf-1-pass"></a>

## PERF-1　PASS

暖機兩秒後量十秒的畫布提交；以下為中位數／p95／最長毫秒。en desktop 16.4/32.2/33.1；en mobile 20.8/22.0/23.7；zh-Hant desktop 30.0/31.0/31.6；zh-Hant mobile 20.6/21.3/22.7。四組分別符合 34／50／150 ms 門檻。

<a id="perf-2-pass"></a>

## PERF-2　PASS

建置後中英每頁含延遲載入資源皆在 2 MiB 內，分別為 531381 與 447477 gzip bytes。離開首屏及切至背景會停止送幀，返回後只有一個活動畫布。

<a id="ui-1-pass"></a>

## UI-1　PASS

逐張檢視兩語在 320、390、768、1440 CSS px 與桌面真實 200% 放大時的排版。標題、版頭、商品選項與結果欄完整，測得十份版型均無橫向溢出。

<a id="ui-2-pass"></a>

## UI-2　PASS

核對可見焦點、表單與恢復狀態。十份版型共量 100 個主要操作熱區，均至少 44 × 44 CSS px。一般文字的純色對比最低為 5.42:1，合成文字另外以原圖取樣。觸控可完成選擇、重播及下載。

<a id="biz-1-pass"></a>

## BIZ-1　PASS

三張印件提供圖案、成品規格、紙別與印量；兩語都能看到預估金額、工期和概念印刷工作室說明。

<a id="biz-2-pass"></a>

## BIZ-2　PASS

驗過印量 25、250 與非法值，以及 150/151 張的工期切換。回改為 Side B Social、A3、72 張，產出暖白紙、NT$2,534 的印件製作單。

<a id="fall-1-pass"></a>

## FALL-1　PASS

原始 HTML、減少動態及 GPU 失敗的首屏均留可辨識的雙色印件與詢價入口。減少動態靜止；無 GPU 仍能調整紙別、印量及下載製作單。

<a id="fall-2-pass"></a>

## FALL-2　PASS

裝置遺失後恢復至可用狀態。快速暫停、續播、實際離頁再回返均能再取得畫布；商業內容一直可讀，沒有遮住頁面的空白層。

<a id="ship-1-pass"></a>

## SHIP-1　PASS

候選四組隔離建置皆以 lockfile 安裝，check、單元測試與 build 通過。實際請求同源，無追蹤或 storage 副作用。兩語可互返，canonical、分享圖、畫廊連結與正式路徑相符。

<a id="silhouette-pass"></a>

## silhouette　PASS

去除頁面文字、縮至 160 px，短柄橫刮刀、紙框和雙喇叭的大負形可區分，頭尾的版面色塊也能分辨。

<a id="finish-pass"></a>

## finish　PASS

原尺寸檢查音箱負形的斜線、白色斜槽的轉角和黑色刀唇。圖內有規律的粗網點，墨層外緣平順；刮刀移過後白槽與套色線穩定。

<a id="material-pass"></a>

## material　PASS

鈷藍與橙墨重疊成深紫，同一處留白仍見紙色；刀唇的接觸影貼住紙面，能與平坦的墨層區分。

<a id="narrative-pass"></a>

## narrative　PASS

先見鈷藍底版；刮刀橫跨紙面往下推，橙色圖形只出現在刀口後。完工時刀離開，保留完整雙色海報供檢視。

<a id="continuity-pass"></a>

## continuity　PASS

沿紙角對位線與音箱邊緣對照印前、刮至中段、印畢及重播。紙未移動，刀口兩側的未印及已印區分界相接。

<a id="fidelity-pass"></a>

## fidelity　PASS

首圖與執行中的海報共用音箱版心、白紙與雙專色；型錄其他印件和詢價單使用一致的印刷配色、粗線與格線。手機保留完整印床。

## desktop 動態貼合

從第一版、刮刀中段到第二版完成有連貫記錄；切換兩個單版再回雙版可辨識重疊的深紫，重播會回到印前。

## mobile 動態貼合

手機上刀口寬度、紙角和重疊色仍能辨認，觸控再印從第一版開始，留下完整海報。

