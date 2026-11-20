# V008 固定候選驗收

候選 52fa4e91f748be73f060c3acc3c91ce9728fccd9。主責 GlossQuote Visuals studio director。製作 01a1f9ca-69a4-7252-9543-d0335c67631c。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44783845662)

## ART-1　PASS

首屏紙杯近景、弧形冰槽與季節禮盒主題可在手機和桌機辨識，配六杯的行動入口位於口味選擇上方。

## ART-2　PASS

同一杯沿與冰面保持固定，勺痕沿弧線加深，末端同側的冰脊跟著捲起。三種口味的色澤和果粒不同；局部即時區域與其餘海報在切換、暫停和繼續時對齊。 四組冷開頁實測首次內容介於 252 至 780 ms，前三秒的原始合成影格可覆核。

## ART-3　PASS

果時用莓紅圓弧按鈕、暖黃色食物近景與明亮大字。向下的三色口味卡和六個圓形杯位延續同一包裝語言。

## GPU-1　PASS

zh-Hant-desktop：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 194–203。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。 zh-Hant-mobile：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 194–202。 en-desktop：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 193–203。 en-mobile：Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 193–202。

## GPU-2　PASS

zh-Hant-desktop：控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1362.5 ms；相同影格 是，恢復後改變 是。 zh-Hant-mobile：控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1376.1 ms；相同影格 是，恢復後改變 是。 en-desktop：控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1359.0 ms；相同影格 是，恢復後改變 是。 en-mobile：控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1363.6 ms；相同影格 是，恢復後改變 是。

## PERF-1　PASS

zh-Hant-desktop：374 次提交／10.003 秒；median / p95 / max 26.60 / 27.90 / 28.90 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[392, 261]]、DPR 1。 zh-Hant-mobile：443 次提交／10.001 秒；median / p95 / max 22.50 / 23.60 / 24.60 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[179, 119]]、DPR 1。 en-desktop：338 次提交／10.006 秒；median / p95 / max 30.00 / 30.90 / 31.60 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[392, 261]]、DPR 1。 en-mobile：466 次提交／10.008 秒；median / p95 / max 21.40 / 22.30 / 23.40 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[179, 119]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop：含 lazy chunks 首載 1,355,934 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 zh-Hant-mobile：含 lazy chunks 首載 1,355,934 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 en-desktop：含 lazy chunks 首載 1,184,892 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。 en-mobile：含 lazy chunks 首載 1,184,892 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

已對照桌面、窄版、放大畫面及兩語商品表的折行與欄距。 zh-Hant-desktop：viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。 zh-Hant-mobile：viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。 en-desktop：viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。 en-mobile：viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

對照原始截圖，選項以框線與文字識別，焦點能從相鄰內容辨認。 zh-Hant-desktop：16/16 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 21 次，熱區不足 44×44 的有 0 次；可計算純色對比 138 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。 zh-Hant-mobile：16/16 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 14 次，熱區不足 44×44 的有 0 次；可計算純色對比 92 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。 en-desktop：16/16 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 21 次，熱區不足 44×44 的有 0 次；可計算純色對比 138 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。 en-mobile：16/16 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 14 次，熱區不足 44×44 的有 0 次；可計算純色對比 92 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 7.05:1, 門檻 4.5:1 群最小為 6.45:1。

## BIZ-1　PASS

三款口味標示成分、過敏原與共用設備資訊，另有單杯容量、六杯示意盒價及保存方式；中英文對應相同份量和產品。

## BIZ-2　PASS

從零杯、五杯、配滿六杯，到嘗試第七杯、移除重配並下載；最後三款數量與 600 ml 合計在兩語檔案均與畫面一致。 zh-Hant-desktop：匯出 sorbet-hour-recipe-zh-Hant.txt，680 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。 zh-Hant-mobile：匯出 sorbet-hour-recipe-zh-Hant.txt，680 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。 en-desktop：匯出 sorbet-hour-recipe-en.txt，741 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。 en-mobile：匯出 sorbet-hour-recipe-en.txt，741 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。

## FALL-1　PASS

即時渲染無法啟動或偏好減少動態時，首屏仍可見完整果冰杯、挖痕和配盒入口。無 JS 仍可閱讀成分與空白禮盒配方。 zh-Hant-desktop：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 sorbet-hour-recipe-zh-Hant.txt，680 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。 使用預設 GPU 選擇的 Edge：static fallback。 zh-Hant-mobile：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 sorbet-hour-recipe-zh-Hant.txt，680 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。 en-desktop：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 sorbet-hour-recipe-en.txt，741 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。 en-mobile：三模式實存首屏 3/3。GPU 失敗模式客戶流程：匯出 sorbet-hour-recipe-en.txt，741 bytes。選取數變化 empty=0/6, empty removal blocked=0/6, five=5/6, full=6/6, seventh rejected=6/6, reopened=5/6, remixed=6/6。

## FALL-2　PASS

zh-Hant-desktop：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png zh-Hant-mobile：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png en-desktop：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png en-mobile：裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop：原始流程記錄 15 筆請求、1 個來源、方法 {'GET': 15}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 zh-Hant-mobile：原始流程記錄 15 筆請求、1 個來源、方法 {'GET': 15}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 en-desktop：原始流程記錄 12 筆請求、1 個來源、方法 {'GET': 12}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。 en-mobile：原始流程記錄 12 筆請求、1 個來源、方法 {'GET': 12}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

同一杯沿與冰面保持固定，勺痕沿弧線加深，末端同側的冰脊跟著捲起。三種口味的色澤和果粒不同；局部即時區域與其餘海報在切換、暫停和繼續時對齊。 在 {'width': 1440, 'height': 900} 的原始連續畫面比對起始、過程、回到狀態及暫停，涵蓋 8 秒週期。

## mobile 動態貼合

同一杯沿與冰面保持固定，勺痕沿弧線加深，末端同側的冰脊跟著捲起。三種口味的色澤和果粒不同；局部即時區域與其餘海報在切換、暫停和繼續時對齊。 在 {'width': 390, 'height': 844} 的原始連續畫面比對起始、過程、回到狀態及暫停，涵蓋 8 秒週期。

