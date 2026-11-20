# V008 固定候選驗收

候選 c19abda5645c174c8fa6df79c06d26993cc31746。主責 GlossQuote Visuals 工作室美術主責（非製作者）。製作 01a1f9ca-69a4-7252-9543-d0335c67631c。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44803659273)

## ART-1　PASS

奶油色背景上，果時品牌、配禮盒入口與盤上完整的蜜柑色果凍同屏。手機仍保留大輪廓與可操作的口味標籤或指引。

## ART-2　PASS

首訪只讓圓頂落下、橫向展開再彈回，瓷盤及接觸影留在原位；後續影格的果凍保持完整。使用者選擇上緣位置後，可同時看到輪廓缺口與盤上分離的一勺。重設可回復，換口味也保有原來的立體形狀。

## ART-3　PASS

圓頂透明果凍、瓷盤、莓紅圓角標籤讓它與布邊的纖維與印務的平面幾何區隔。三口味型錄沿用盤與透光材質，六杯禮盒用六個圓位回應成品形狀。

## GPU-1　PASS

zh-Hant-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 350–376。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。

zh-Hant-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 351–372。

en-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 351–365。

en-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 351–369。

## GPU-2　PASS

zh-Hant-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1372.5 ms；相同影格 是，恢復後改變 是。 挖取與重設：PASS。 before (0 個瀏覽器輸入事件), after (2 個瀏覽器輸入事件), reset (1 個瀏覽器輸入事件)。

zh-Hant-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1362.0 ms；相同影格 是，恢復後改變 是。 挖取與重設：PASS。 before (0 個瀏覽器輸入事件), after (1 個瀏覽器輸入事件), reset (1 個瀏覽器輸入事件)。

en-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1369.8 ms；相同影格 是，恢復後改變 是。 挖取與重設：PASS。 before (0 個瀏覽器輸入事件), after (2 個瀏覽器輸入事件), reset (1 個瀏覽器輸入事件)。

en-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1380.1 ms；相同影格 是，恢復後改變 是。 挖取與重設：PASS。 before (0 個瀏覽器輸入事件), after (1 個瀏覽器輸入事件), reset (1 個瀏覽器輸入事件)。

## PERF-1　PASS

zh-Hant-desktop　478 次提交／10.009 秒；median / p95 / max 17.30 / 31.50 / 38.50 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[288, 192]]、DPR 1。

zh-Hant-mobile　583 次提交／10.001 秒；median / p95 / max 16.20 / 31.30 / 32.10 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[288, 192]]、DPR 1。

en-desktop　349 次提交／10.002 秒；median / p95 / max 28.50 / 29.70 / 30.60 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[288, 192]]、DPR 1。

en-mobile　586 次提交／10.003 秒；median / p95 / max 16.10 / 31.70 / 32.50 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[288, 192]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop　含 lazy chunks 首載 889,049 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

zh-Hant-mobile　含 lazy chunks 首載 889,049 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-desktop　含 lazy chunks 首載 794,384 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-mobile　含 lazy chunks 首載 794,384 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

檢視雙語完整型錄、回改表單與窄版畫面，四種寬度及真正 200% 的完整頁面均保有可讀標題、圖說、選項、行動按鈕及結果。

zh-Hant-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

zh-Hant-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

en-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

en-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

核對按鈕、商業表單、焦點順序、選中狀態及錯誤提示。各寬度實際啟用的控制均可觸按，Tab 焦點清楚。另檢視 10 組須從截圖取色的文字，最低對比 5.80:1。取樣例為 Reset the jelly 5.94:1（前景像素 [627, 1022]、背景 [623, 1018]）。

zh-Hant-desktop　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 24 次，熱區不足 44×44 的有 0 次；可計算純色對比 144 次，待人工取色 3 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。

zh-Hant-mobile　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 16 次，熱區不足 44×44 的有 0 次；可計算純色對比 96 次，待人工取色 2 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。

en-desktop　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 24 次，熱區不足 44×44 的有 0 次；可計算純色對比 144 次，待人工取色 3 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。

en-mobile　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 16 次，熱區不足 44×44 的有 0 次；可計算純色對比 96 次，待人工取色 2 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。

## BIZ-1　PASS

蜜柑、覆盆莓及白芭樂各有成分。六杯、每杯 100 mL、保存、共用設備過敏原和示意價格在雙語頁都可找到，可在配滿後下載配方。

## BIZ-2　PASS

zh-Hant-desktop　實際匯出 jelly-hour-recipe-zh-Hant.txt，710 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「果時 JELLY HOUR｜果凍禮盒配方 ｜ 蜜柑果凍：3 杯 × 100 毫升 ｜ 覆盆莓果凍：1 杯 × 100 毫升 ｜ 白芭樂果凍：2 杯 × 100 毫升 ｜ 合計：6 杯 × 100 毫升 = 600 毫升 ｜ 成分 ｜ 蜜柑果凍 — 蜜柑汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 覆盆莓果凍 — 過篩覆盆莓汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 白芭樂果凍 — 白芭樂汁、水、蔗糖、柑橘果膠、萊姆汁。 ｜ 過敏原 ｜ 示意配方未添加乳、蛋、花生或堅果。共用設備可能接觸乳、花生與樹堅果。 ｜ 保存方式 ｜ 冷藏保存，依實際商品標示上的期限享用。 ｜ 季節果凍概念品牌。配方只在這個頁面產生，供離線保存與分享。」。

zh-Hant-mobile　實際匯出 jelly-hour-recipe-zh-Hant.txt，710 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「果時 JELLY HOUR｜果凍禮盒配方 ｜ 蜜柑果凍：3 杯 × 100 毫升 ｜ 覆盆莓果凍：1 杯 × 100 毫升 ｜ 白芭樂果凍：2 杯 × 100 毫升 ｜ 合計：6 杯 × 100 毫升 = 600 毫升 ｜ 成分 ｜ 蜜柑果凍 — 蜜柑汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 覆盆莓果凍 — 過篩覆盆莓汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 白芭樂果凍 — 白芭樂汁、水、蔗糖、柑橘果膠、萊姆汁。 ｜ 過敏原 ｜ 示意配方未添加乳、蛋、花生或堅果。共用設備可能接觸乳、花生與樹堅果。 ｜ 保存方式 ｜ 冷藏保存，依實際商品標示上的期限享用。 ｜ 季節果凍概念品牌。配方只在這個頁面產生，供離線保存與分享。」。

en-desktop　實際匯出 jelly-hour-recipe-en.txt，762 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「Jelly Hour | Fruit jelly gift box recipe ｜ Mandarin jelly: 3 × 100 mL ｜ Raspberry jelly: 1 × 100 mL ｜ White guava jelly: 2 × 100 mL ｜ Total: 6 cups × 100 mL = 600 mL ｜ Ingredients ｜ Mandarin jelly — Mandarin juice, water, cane sugar, citrus pectin, lemon juice. ｜ Raspberry jelly — Strained raspberry juice, water, cane sugar, citrus pectin, lemon juice. ｜ White guava jelly — White guava juice, water, cane sugar, citrus pectin, lime juice」。

en-mobile　實際匯出 jelly-hour-recipe-en.txt，762 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「Jelly Hour | Fruit jelly gift box recipe ｜ Mandarin jelly: 3 × 100 mL ｜ Raspberry jelly: 1 × 100 mL ｜ White guava jelly: 2 × 100 mL ｜ Total: 6 cups × 100 mL = 600 mL ｜ Ingredients ｜ Mandarin jelly — Mandarin juice, water, cane sugar, citrus pectin, lemon juice. ｜ Raspberry jelly — Strained raspberry juice, water, cane sugar, citrus pectin, lemon juice. ｜ White guava jelly — White guava juice, water, cane sugar, citrus pectin, lime juice」。

## FALL-1　PASS

三種降級情境的原始首屏均保留品牌、材質與主行動。對照正常頁，商業內容和下一步仍能辨認。

zh-Hant-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 jelly-hour-recipe-zh-Hant.txt，710 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「果時 JELLY HOUR｜果凍禮盒配方 ｜ 蜜柑果凍：3 杯 × 100 毫升 ｜ 覆盆莓果凍：1 杯 × 100 毫升 ｜ 白芭樂果凍：2 杯 × 100 毫升 ｜ 合計：6 杯 × 100 毫升 = 600 毫升 ｜ 成分 ｜ 蜜柑果凍 — 蜜柑汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 覆盆莓果凍 — 過篩覆盆莓汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 白芭樂果凍 — 白芭樂汁、水、蔗糖、柑橘果膠、萊姆汁。 ｜ 過敏原 ｜ 示意配方未添加乳、蛋、花生或堅果。共用設備可能接觸乳、花生與樹堅果。 ｜ 保存方式 ｜ 冷藏保存，依實際商品標示上的期限享用。 ｜ 季節果凍概念品牌。配方只在這個頁面產生，供離線保存與分享。」。 使用預設 GPU 選擇的 Edge：static fallback。

zh-Hant-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 jelly-hour-recipe-zh-Hant.txt，710 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「果時 JELLY HOUR｜果凍禮盒配方 ｜ 蜜柑果凍：3 杯 × 100 毫升 ｜ 覆盆莓果凍：1 杯 × 100 毫升 ｜ 白芭樂果凍：2 杯 × 100 毫升 ｜ 合計：6 杯 × 100 毫升 = 600 毫升 ｜ 成分 ｜ 蜜柑果凍 — 蜜柑汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 覆盆莓果凍 — 過篩覆盆莓汁、水、蔗糖、柑橘果膠、檸檬汁。 ｜ 白芭樂果凍 — 白芭樂汁、水、蔗糖、柑橘果膠、萊姆汁。 ｜ 過敏原 ｜ 示意配方未添加乳、蛋、花生或堅果。共用設備可能接觸乳、花生與樹堅果。 ｜ 保存方式 ｜ 冷藏保存，依實際商品標示上的期限享用。 ｜ 季節果凍概念品牌。配方只在這個頁面產生，供離線保存與分享。」。

en-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 jelly-hour-recipe-en.txt，762 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「Jelly Hour | Fruit jelly gift box recipe ｜ Mandarin jelly: 3 × 100 mL ｜ Raspberry jelly: 1 × 100 mL ｜ White guava jelly: 2 × 100 mL ｜ Total: 6 cups × 100 mL = 600 mL ｜ Ingredients ｜ Mandarin jelly — Mandarin juice, water, cane sugar, citrus pectin, lemon juice. ｜ Raspberry jelly — Strained raspberry juice, water, cane sugar, citrus pectin, lemon juice. ｜ White guava jelly — White guava juice, water, cane sugar, citrus pectin, lime juice」。

en-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 jelly-hour-recipe-en.txt，762 bytes。empty {"cups":[0,0,0],"total":0,"downloadEnabled":false}；empty removal blocked {"cups":[0,0,0],"total":0,"downloadEnabled":false}；five {"cups":[2,2,1],"total":5,"downloadEnabled":false}；full {"cups":[2,2,2],"total":6,"downloadEnabled":true}；seventh rejected {"cups":[2,2,2],"total":6,"downloadEnabled":true}；reopened {"cups":[2,1,2],"total":5,"downloadEnabled":false}；remixed {"cups":[3,1,2],"total":6,"downloadEnabled":true}；實際檔案摘錄「Jelly Hour | Fruit jelly gift box recipe ｜ Mandarin jelly: 3 × 100 mL ｜ Raspberry jelly: 1 × 100 mL ｜ White guava jelly: 2 × 100 mL ｜ Total: 6 cups × 100 mL = 600 mL ｜ Ingredients ｜ Mandarin jelly — Mandarin juice, water, cane sugar, citrus pectin, lemon juice. ｜ Raspberry jelly — Strained raspberry juice, water, cane sugar, citrus pectin, lemon juice. ｜ White guava jelly — White guava juice, water, cane sugar, citrus pectin, lime juice」。

## FALL-2　PASS

zh-Hant-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

zh-Hant-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop　原始流程記錄 15 筆請求、1 個來源、方法 {'GET': 15}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

zh-Hant-mobile　原始流程記錄 15 筆請求、1 個來源、方法 {'GET': 15}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-desktop　原始流程記錄 12 筆請求、1 個來源、方法 {'GET': 12}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-mobile　原始流程記錄 12 筆請求、1 個來源、方法 {'GET': 12}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

同一只瓷盤上果凍壓扁再站回原高，之後只有緩慢的光線變化。鍵盤從左側挖取，重設後恢復。

## mobile 動態貼合

手指點選上緣右側，在對應位置留下一個缺口，盤上有分離的小塊；復原後沒有殘留溝槽。

