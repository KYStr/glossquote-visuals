# V006 固定候選驗收

候選 52fa4e91f748be73f060c3acc3c91ce9728fccd9。主責 GlossQuote Visuals studio director。製作 01a1f9ca-6761-7bd1-8165-5ef3ff6b1f26。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44783845662)

## ART-1　PASS

潮位剖面與 A、B、C 三個地形標記在初訪畫面可辨。品牌、家庭海岸導覽說明和比較三條路線的按鈕同時可見。

## ART-2　PASS

北礁邊的小池在低潮與主水道分開，漲潮時低地連通，南側高地仍保有岩棚。泡沫線沿礁壁移動；控制回到低潮，岩點、淺池和水道回到相同相對位置。 四組冷開頁實測首次內容介於 224 至 488 ms，前三秒的原始合成影格可覆核。

## ART-3　PASS

與茜紅布樣冊及高彩果冰禮盒並看，海岸頁以海圖網格、深靛水域和固定礁點建立辨識。下方深色路線表與行前單延續圖例、細尺線、窄欄註記。

## GPU-1　PASS

zh-Hant-desktop：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 221–358。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。 zh-Hant-mobile：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 223–352。 en-desktop：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 226–358。 en-mobile：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 222–352。

## GPU-2　PASS

zh-Hant-desktop：控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1360.0 ms；相同影格 是，恢復後改變 是。 zh-Hant-mobile：控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1364.7 ms；相同影格 是，恢復後改變 是。 en-desktop：控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1364.9 ms；相同影格 是，恢復後改變 是。 en-mobile：控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1360.1 ms；相同影格 是，恢復後改變 是。

## PERF-1　PASS

zh-Hant-desktop：375 次提交／10.002 秒；median / p95 / max 26.60 / 27.60 / 30.00 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[576, 384]]、DPR 1。 zh-Hant-mobile：405 次提交／10.001 秒；median / p95 / max 24.60 / 25.70 / 26.50 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[349, 233]]、DPR 1。 en-desktop：487 次提交／10.008 秒；median / p95 / max 19.30 / 31.10 / 42.80 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[576, 384]]、DPR 1。 en-mobile：443 次提交／10.000 秒；median / p95 / max 22.50 / 23.60 / 25.70 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[349, 233]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop：含 lazy chunks 首載 1,323,448 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 zh-Hant-mobile：含 lazy chunks 首載 1,323,448 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 en-desktop：含 lazy chunks 首載 924,588 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 en-mobile：含 lazy chunks 首載 924,588 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

已對照桌面、窄版、放大畫面及兩語商品表的折行與欄距。 zh-Hant-desktop：viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。 zh-Hant-mobile：viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。 en-desktop：viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。 en-mobile：viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

對照原始截圖，選項以框線與文字識別，焦點能從相鄰內容辨認。 zh-Hant-desktop：23/23 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 42 次，熱區不足 44×44 的有 0 次；可計算純色對比 141 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 14.12:1, 門檻 4.5:1 群最小為 5.93:1。 zh-Hant-mobile：23/23 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 28 次，熱區不足 44×44 的有 0 次；可計算純色對比 94 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 14.12:1, 門檻 4.5:1 群最小為 5.93:1。 en-desktop：23/23 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 42 次，熱區不足 44×44 的有 0 次；可計算純色對比 141 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 14.12:1, 門檻 4.5:1 群最小為 5.93:1。 en-mobile：23/23 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 28 次，熱區不足 44×44 的有 0 次；可計算純色對比 94 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 14.12:1, 門檻 4.5:1 群最小為 5.93:1。

## BIZ-1　PASS

三條路線列來回距離、步行時間、地形、每團費用與適合的同行者；兩語均說明潮位與導覽屬示意。

## BIZ-2　PASS

實際下載包含所選路線、同行人數、往返距離、必備裝備與自選物品；比對了人數上下限和回改後的結果。 zh-Hant-desktop：匯出 tide-table-zh-Hant.txt，352 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。 zh-Hant-mobile：匯出 tide-table-zh-Hant.txt，352 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。 en-desktop：匯出 tide-table-en.txt，366 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。 en-mobile：匯出 tide-table-en.txt，366 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。

## FALL-1　PASS

無 JS 保留海岸圖、三條路線和基本清單；無 GPU 或偏好減少動態時仍可明辨礁岩與潮池，互動行前單可使用。 zh-Hant-desktop：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 tide-table-zh-Hant.txt，352 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。 使用預設 GPU 選擇的 Edge：static fallback。 zh-Hant-mobile：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 tide-table-zh-Hant.txt，352 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。 en-desktop：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 tide-table-en.txt，366 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。 en-mobile：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 tide-table-en.txt，366 bytes。路線 ['pool', 'ridge', 'shelf']；接受人數 [1, 8]；拒絕 ['0', '9', '1.5', '']。

## FALL-2　PASS

zh-Hant-desktop：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png zh-Hant-mobile：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png en-desktop：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png en-mobile：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop：原始流程記錄 17 筆請求、1 個來源、方法 {'GET': 17}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 zh-Hant-mobile：原始流程記錄 17 筆請求、1 個來源、方法 {'GET': 17}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 en-desktop：原始流程記錄 13 筆請求、1 個來源、方法 {'GET': 13}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 en-mobile：原始流程記錄 13 筆請求、1 個來源、方法 {'GET': 13}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

北礁邊的小池在低潮與主水道分開，漲潮時低地連通，南側高地仍保有岩棚。泡沫線沿礁壁移動；控制回到低潮，岩點、淺池和水道回到相同相對位置。 在 {'width': 1440, 'height': 900} 的原始連續畫面比對起始、過程、回到狀態及暫停，涵蓋 10 秒週期。

## mobile 動態貼合

北礁邊的小池在低潮與主水道分開，漲潮時低地連通，南側高地仍保有岩棚。泡沫線沿礁壁移動；控制回到低潮，岩點、淺池和水道回到相同相對位置。 在 {'width': 390, 'height': 844} 的原始連續畫面比對起始、過程、回到狀態及暫停，涵蓋 10 秒週期。

