# V010 固定候選驗收

候選 5af20ebdb3d6f60dbbc4fa050678f05a9aca3c44。主責 GlossQuote Visuals 工作室主責（獨立於三個製作對話）。製作 01a1fa4c-f093-7943-9078-154c5d03d14f。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44981579584)

<a id="art-1-pass"></a>

## ART-1　PASS

紙白標題「把水路摺進旅程。」與配置按鈕上方引導閱讀，藍水面襯出亮橘的攜行包、提把和黑色束帶；手機首屏可見整包及狀態控制。

<a id="art-2-pass"></a>

## ART-2　PASS

可從同組板件追到鬆帶、展長、翻起側舷與座椅，最後是浮在水面且可坐進去的艇。重播後先回到包；使用者可檢視半展或成船。

<a id="art-3-pass"></a>

## ART-3　PASS

技術型錄的直角字排、硬折面、深藍水面與橘色艇殼形成獨立品牌；艇型比較與攜行尺寸圖都能對上同一船體與提把。

<a id="gpu-1-pass"></a>

## GPU-1　PASS

Chromium 158.0.8127.18 的四次隔離測試均建立 WebGPU 裝置與單一可見畫布。實測 adapter 為 Google SwiftShader。逐幀讀回材質有非空像素與不同雜湊，並與瀏覽器合成原圖對照。

<a id="gpu-2-pass"></a>

## GPU-2　PASS

鍵盤及觸控能在攜行、半展及成船三態切換，停止在展開中段後畫面保留，續播後能完成。重播回到帶提把的攜行包。

<a id="perf-1-pass"></a>

## PERF-1　PASS

暖機兩秒後量十秒的畫布提交；以下為中位數／p95／最長毫秒。en desktop 19.8/32.2/46.8；en mobile 24.1/28.8/31.8；zh-Hant desktop 19.8/31.6/52.7；zh-Hant mobile 23.7/27.6/29.5。四組分別符合 34／50／150 ms 門檻。

<a id="perf-2-pass"></a>

## PERF-2　PASS

建置後中英每頁含延遲載入資源皆在 2 MiB 內，分別為 354197 與 244202 gzip bytes。離開首屏及切至背景會停止送幀，返回後只有一個活動畫布。

<a id="ui-1-pass"></a>

## UI-1　PASS

逐張檢視兩語在 320、390、768、1440 CSS px 與桌面真實 200% 放大時的排版。標題、版頭、商品選項與結果欄完整，測得十份版型均無橫向溢出。

<a id="ui-2-pass"></a>

## UI-2　PASS

核對可見焦點、表單與恢復狀態。十份版型共量 110 個主要操作熱區，均至少 44 × 44 CSS px。一般文字的純色對比最低為 6.69:1，合成文字另外以原圖取樣。觸控可完成選擇、重播及下載。

<a id="biz-1-pass"></a>

## BIZ-1　PASS

Solo 330 與 Tandem 370 的艇型、攜行和展開尺寸、座位、重量、載重與適用水域在兩語都有列出；估價和配置單有概念產品標示。

<a id="biz-2-pass"></a>

## BIZ-2　PASS

測試空載重、110 kg 臨界值、單艇雙人、超載、水域與裝備數量限制；回改雙人 205 kg，匯出 Tandem 370、裝備數及 NT$43,210 清單。

<a id="fall-1-pass"></a>

## FALL-1　PASS

無 JS、WebGPU 失敗及減少動態皆有完整產品造型、首屏配置入口及兩艇型資料。減少動態預設靜止，無 GPU 仍可調整載重和輸出艇型配置。

<a id="fall-2-pass"></a>

## FALL-2　PASS

裝置遺失後恢復至可用狀態。快速暫停、續播、實際離頁再回返均能再取得畫布；商業內容一直可讀，沒有遮住頁面的空白層。

<a id="ship-1-pass"></a>

## SHIP-1　PASS

候選四組隔離建置皆以 lockfile 安裝，check、單元測試與 build 通過。實際請求同源，無追蹤或 storage 副作用。兩語可互返，canonical、分享圖、畫廊連結與正式路徑相符。

<a id="silhouette-pass"></a>

## silhouette　PASS

160 px 縮圖可分辨包頂提把、中央折板及完成後開放的座艙。即使去除標題，起點的短方包與終點兩個船尖輪廓都清楚。

<a id="finish-pass"></a>

## finish　PASS

在原尺寸檢查橙色上舷的長斜邊、板與板相接的細折脊，以及深色座艙邊界。水面色帶和艇身分離，邊緣連續。

<a id="material-pass"></a>

## material　PASS

相鄰硬板分別受光，折邊有明確轉折，深色座艙受側舷遮擋。下方水紋的尺度與船殼折面不同。

<a id="narrative-pass"></a>

## narrative　PASS

初訪先見綁帶攜行包，兩端沿折線接續展開，側舷向上，座艙落成。最後留在可以乘坐的完整艇型。

<a id="continuity-pass"></a>

## continuity　PASS

能沿同一段橙色折脊從束起的包體、半展的接板追到上舷；座位位於兩側板之間，展開過程未切換成另一張艇圖。

<a id="fidelity-pass"></a>

## fidelity　PASS

技術圖示中的攜行把手、尺寸與艇型對照可回扣首屏。桌機和手機都留出兩個艇尖的空間，完成後仍辨認出同組橙色硬折板。

## desktop 動態貼合

冷啟動先見束帶與攜行提把，長軸展開、兩舷翻立、座艙成形。重播和三個手動狀態與這段順序一致。

## mobile 動態貼合

手機能在同一座標系追到包、半展到艇；觸控重播確實先回到包，完成時船尖與座艙仍在框內。

