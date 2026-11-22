# V008 固定候選驗收

候選 df6ba61887571c76af1d2d65122db9905ba089bb。主責 GlossQuote Visuals 工作室主責（獨立於原製作對話）。製作 01a1f9ca-69a4-7252-9543-d0335c67631c。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/45002487345)

<a id="art-1-pass"></a>

## ART-1　PASS

粉色晨光、酒紅 Jelly Hour 字標與果時並列。首屏瓷盤上的蜜柑果凍和銀匙能辨識，搭配六杯的入口在桌機與手機均可找到。

<a id="art-2-pass"></a>

## ART-2　PASS

冷開頁空匙先斜入，再觸到果凍肩部。操作時先挖一側，再於另一側下匙，前一處的切面保留。第二口抬起後同時看得見匙上橘瓣與缺口。

<a id="art-3-pass"></a>

## ART-3　PASS

粉色斜光、深紅襯線字、透亮果膠有別於另兩件。蜜柑、覆盆莓及白芭樂口味和配盒結果保留同一組三色商品語言。

<a id="gpu-1-pass"></a>

## GPU-1　PASS

中英桌機與手機尺寸皆有單一有效 WebGPU 畫布。原始紋理與合成畫面隨動作改變，檢查使用 Windows 隔離 Chromium 軟體繪圖。

<a id="gpu-2-pass"></a>

## GPU-2　PASS

以鍵盤與觸控切換狀態並返回，暫停後畫面在至少一秒內保持一致，續播後會繼續。另以實際滑鼠和觸控輸入完成本件的操作序列。

<a id="perf-1-pass"></a>

## PERF-1　PASS

暖機後量十秒實際提交間隔。以下依序是中位數／p95／最長毫秒。zh-Hant-desktop 28.8/42.3/62.1、zh-Hant-mobile 22.4/24.9/52.0、en-desktop 29.2/41.6/68.9、en-mobile 21.9/29.1/71.7。

<a id="perf-2-pass"></a>

## PERF-2　PASS

兩語首載含延遲載入的壓縮大小最多 1383101 bytes。離屏與隱藏時停止提交，返回仍為單一實例。

<a id="ui-1-pass"></a>

## UI-1　PASS

檢視中英 320、390、768、1440 寬與桌面 200% 放大的實際版型。標題、主要行動、商品控制和結果均可讀，未見水平溢出。

<a id="ui-2-pass"></a>

## UI-2　PASS

檢視操作焦點及 DOM／合成文字對比。兩語五種版型的啟用控制熱區均至少 44×44 CSS px，觸控可完成操作與下載。

<a id="biz-1-pass"></a>

## BIZ-1　PASS

Mandarin, raspberry and white guava cards have use cases and bilingual ingredients/allergen notices. Six 100 mL cups, NT$680, local concept gift recipe.

<a id="biz-2-pass"></a>

## BIZ-2　PASS

兩語實際搭配六杯，測試未滿、滿盒、超量及移除重配，下載的各口味數量與選擇一致。

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

去除說明縮看，起態是完整圓肩果凍和瓷盤。接觸時有匙柄與凹面，抬起後靠缺口和匙上的一口辨認結束。

<a id="finish-pass"></a>

## finish　PASS

原尺寸可沿匙緣看到銀色反射與凹面陰影，盤沿和果膠底部厚度分開；缺口內保留果肉截面。

<a id="material-pass"></a>

## material　PASS

高光被曲面拉長，逆光透出橘瓣紋理。瓷盤的低光澤與銀匙的明暗反射有區別。

<a id="narrative-pass"></a>

## narrative　PASS

銀匙斜入，在被選中的肩部下壓、切入、帶走一口，移開後切痕留下；重設恢復完整外形。

<a id="continuity-pass"></a>

## continuity　PASS

從空匙到匙面承載橘瓣，能沿同一匙緣追蹤。連挖第二處時第一處切痕仍在，畫面與實際落匙區域相符。

<a id="fidelity-pass"></a>

## fidelity　PASS

和核准圖並排看，逆光、瓷盤、銀匙與字標保留。互動版的果肉輪廓較有稜角，兩處缺口確實能同時讀到。

## desktop 動態貼合

從空匙到匙面承載橘瓣，能沿同一匙緣追蹤。連挖第二處時第一處切痕仍在，畫面與實際落匙區域相符。 高光被曲面拉長，逆光透出橘瓣紋理。瓷盤的低光澤與銀匙的明暗反射有區別。

## mobile 動態貼合

從空匙到匙面承載橘瓣，能沿同一匙緣追蹤。連挖第二處時第一處切痕仍在，畫面與實際落匙區域相符。 高光被曲面拉長，逆光透出橘瓣紋理。瓷盤的低光澤與銀匙的明暗反射有區別。

