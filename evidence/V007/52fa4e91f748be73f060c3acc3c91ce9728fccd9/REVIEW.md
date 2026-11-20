# V007 固定候選驗收

候選 52fa4e91f748be73f060c3acc3c91ce9728fccd9。主責 GlossQuote Visuals studio director。製作 01a1f9ca-68b3-70e1-a9d4-377a38ec6f38。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44783845662)

## ART-1　PASS

左頁是可看清楚經緯的寬幅布樣，右頁深茜紅索引清楚標出織品打樣與選樣入口；手機先呈現布樣再接索引與顧客行動。

## ART-2　PASS

平紋逐格上下交錯、斜紋逐行移位、緞紋可見連續長浮線。斜光掃過時線頭與交點留在格點上，回到平紋仍見原有排列，控制與放大圖相符。 四組冷開頁實測首次內容介於 280 至 752 ms，前三秒的原始合成影格可覆核。

## ART-3　PASS

大幅橫向布樣搭配深茜紅索引建立攤開樣本冊的構圖；各布號的局部放大切片及下方布樣單都沿用索引色塊與欄線。

## GPU-1　PASS

zh-Hant-desktop：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 335–367。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。 zh-Hant-mobile：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 351–382。 en-desktop：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 332–362。 en-mobile：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 351–380。

## GPU-2　PASS

zh-Hant-desktop：控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1373.6 ms；相同影格 是，恢復後改變 是。 zh-Hant-mobile：控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1363.3 ms；相同影格 是，恢復後改變 是。 en-desktop：控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1369.4 ms；相同影格 是，恢復後改變 是。 en-mobile：控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1371.8 ms；相同影格 是，恢復後改變 是。

## PERF-1　PASS

zh-Hant-desktop：354 次提交／10.009 秒；median / p95 / max 31.00 / 31.40 / 31.90 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[640, 426]]、DPR 1。 zh-Hant-mobile：420 次提交／10.000 秒；median / p95 / max 23.80 / 24.90 / 26.50 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[351, 234]]、DPR 1。 en-desktop：436 次提交／10.013 秒；median / p95 / max 21.90 / 48.80 / 54.30 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[640, 426]]、DPR 1。 en-mobile：402 次提交／10.000 秒；median / p95 / max 24.80 / 25.60 / 26.70 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[351, 234]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop：含 lazy chunks 首載 1,685,510 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 zh-Hant-mobile：含 lazy chunks 首載 1,685,510 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 en-desktop：含 lazy chunks 首載 1,286,717 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 en-mobile：含 lazy chunks 首載 1,286,717 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

已對照桌面、窄版、放大畫面及兩語商品表的折行與欄距。 zh-Hant-desktop：viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。 zh-Hant-mobile：viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。 en-desktop：viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。 en-mobile：viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

對照原始截圖，選項以框線與文字識別，焦點能從相鄰內容辨認。 zh-Hant-desktop：19/19 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 33 次，熱區不足 44×44 的有 0 次；可計算純色對比 127 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。 zh-Hant-mobile：17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 22 次，熱區不足 44×44 的有 0 次；可計算純色對比 82 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。 en-desktop：19/19 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 33 次，熱區不足 44×44 的有 0 次；可計算純色對比 127 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。 en-mobile：17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 22 次，熱區不足 44×44 的有 0 次；可計算純色對比 82 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。

## BIZ-1　PASS

三款布均有組織、品號、色號、遮蔽、用途及保養資訊；兩語欄位能對照相同材料，樣本單定位為本地產生的打樣提案。

## BIZ-2　PASS

先加入兩款、嘗試重複或超量、回改色號、移除再選；匯出的布號、色號、數量、用途與保養均與頁面最後選擇相符。 zh-Hant-desktop：匯出 selvedge-samples-zh-Hant.txt，467 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。 zh-Hant-mobile：匯出 selvedge-samples-zh-Hant.txt，467 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。 en-desktop：匯出 selvedge-samples-en.txt，527 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。 en-mobile：匯出 selvedge-samples-en.txt，527 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。

## FALL-1　PASS

三種靜態織法和宏觀切片仍能辨識紗線上下交錯。無 JS 可讀完整布樣並列印，無 GPU 可選樣和匯出，降低動態會從靜態布面開始。 zh-Hant-desktop：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 selvedge-samples-zh-Hant.txt，467 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。 使用預設 GPU 選擇的 Edge：static fallback。 zh-Hant-mobile：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 selvedge-samples-zh-Hant.txt，467 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。 en-desktop：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 selvedge-samples-en.txt，527 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。 en-mobile：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 selvedge-samples-en.txt，527 bytes。最後布樣／色號 [['SLV-101', 'OA-02'], ['SLV-503', 'CH-06']]；清空清單 是。

## FALL-2　PASS

zh-Hant-desktop：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png zh-Hant-mobile：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png en-desktop：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png en-mobile：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop：原始流程記錄 19 筆請求、1 個來源、方法 {'GET': 19}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 zh-Hant-mobile：原始流程記錄 19 筆請求、1 個來源、方法 {'GET': 19}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 en-desktop：原始流程記錄 15 筆請求、1 個來源、方法 {'GET': 15}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 en-mobile：原始流程記錄 15 筆請求、1 個來源、方法 {'GET': 15}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

平紋逐格上下交錯、斜紋逐行移位、緞紋可見連續長浮線。斜光掃過時線頭與交點留在格點上，回到平紋仍見原有排列，控制與放大圖相符。 在 {'width': 1440, 'height': 900} 的原始連續畫面比對起始、過程、回到狀態及暫停，涵蓋 8 秒週期。

## mobile 動態貼合

平紋逐格上下交錯、斜紋逐行移位、緞紋可見連續長浮線。斜光掃過時線頭與交點留在格點上，回到平紋仍見原有排列，控制與放大圖相符。 在 {'width': 390, 'height': 844} 的原始連續畫面比對起始、過程、回到狀態及暫停，涵蓋 8 秒週期。

