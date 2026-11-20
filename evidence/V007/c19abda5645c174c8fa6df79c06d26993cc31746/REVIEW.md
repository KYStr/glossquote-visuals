# V007 固定候選驗收

候選 c19abda5645c174c8fa6df79c06d26993cc31746。主責 GlossQuote Visuals 工作室美術主責（非製作者）。製作 01a1f9ca-68b3-70e1-a9d4-377a38ec6f38。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44803659273)

## ART-1　PASS

桌面先見佔去左側三分之二的經緯特寫，深酒紅側欄標示布邊、提供的室內織品樣本與選布入口。手機把品牌、布樣入口和梭口放在同一屏。

## ART-2　PASS

首輪已露出有遮擋的斜紋與鬆垂的經線。銅紅緯線從左向右穿入，梭口逐步被橫線填滿並壓回布邊；線段在經線前後交替，動作回到起始時交點沒有漂走。

## ART-3　PASS

平紋的短棋格、斜紋的錯位稜線、緞紋跨越多根紗的長浮線可憑結構辨別。型錄用同樣裁切展示三款，下方樣本單沿用布卡酒紅標籤及色號。

## GPU-1　PASS

zh-Hant-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 459–479。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。

zh-Hant-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 472–477。

en-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 456–477。

en-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 468–487。

## GPU-2　PASS

zh-Hant-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1366.7 ms；相同影格 是，恢復後改變 是。

zh-Hant-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1370.9 ms；相同影格 是，恢復後改變 是。

en-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1371.7 ms；相同影格 是，恢復後改變 是。

en-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1374.3 ms；相同影格 是，恢復後改變 是。

## PERF-1　PASS

zh-Hant-desktop　356 次提交／10.009 秒；median / p95 / max 28.10 / 29.60 / 36.30 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[528, 352]]、DPR 1。

zh-Hant-mobile　426 次提交／10.000 秒；median / p95 / max 22.80 / 25.80 / 28.20 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[351, 234]]、DPR 1。

en-desktop　345 次提交／10.008 秒；median / p95 / max 29.10 / 30.30 / 30.90 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[528, 352]]、DPR 1。

en-mobile　415 次提交／10.001 秒；median / p95 / max 24.00 / 25.10 / 26.00 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[351, 234]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop　含 lazy chunks 首載 1,391,558 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

zh-Hant-mobile　含 lazy chunks 首載 1,391,558 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-desktop　含 lazy chunks 首載 1,143,835 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-mobile　含 lazy chunks 首載 1,143,835 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

檢視雙語完整型錄、回改表單與窄版畫面，四種寬度及真正 200% 的完整頁面均保有可讀標題、圖說、選項、行動按鈕及結果。

zh-Hant-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

zh-Hant-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

en-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

en-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

核對按鈕、商業表單、焦點順序、選中狀態及錯誤提示。各寬度實際啟用的控制均可觸按，Tab 焦點清楚。原始畫面與可計算的背景色一致。

zh-Hant-desktop　19/19 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 33 次，熱區不足 44×44 的有 0 次；可計算純色對比 127 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。

zh-Hant-mobile　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 22 次，熱區不足 44×44 的有 0 次；可計算純色對比 82 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。

en-desktop　19/19 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 33 次，熱區不足 44×44 的有 0 次；可計算純色對比 127 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。

en-mobile　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 22 次，熱區不足 44×44 的有 0 次；可計算純色對比 82 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 11.95:1, 門檻 4.5:1 群最小為 6.63:1。

## BIZ-1　PASS

三款布料各列用途、規格、色號及保養。兩語可將選定的布樣與顏色放入樣本單，認得這是供客戶提案的離線概念打樣。

## BIZ-2　PASS

zh-Hant-desktop　實際匯出 selvedge-samples-zh-Hant.txt，467 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「布邊 SELVEDGE｜樣本單 ｜ 概念打樣室・離線樣本單，供提案核對。 ｜ 款數: 2 ｜ 布樣: 原地平紋 ｜ 識別碼: SLV-101 ｜ 色號: OA-02 · 燕麥 ｜ 數量: 1 ｜ 用途: 日光窗簾、空間隔簾 ｜ 保養: 30°C 輕柔洗。陰乾，微濕時低溫整燙。 ｜ 布樣: 長浮緞紋 ｜ 識別碼: SLV-503 ｜ 色號: CH-06 · 香檳 ｜ 數量: 1 ｜ 用途: 禮賓窗簾、靠枕面布」。

zh-Hant-mobile　實際匯出 selvedge-samples-zh-Hant.txt，467 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「布邊 SELVEDGE｜樣本單 ｜ 概念打樣室・離線樣本單，供提案核對。 ｜ 款數: 2 ｜ 布樣: 原地平紋 ｜ 識別碼: SLV-101 ｜ 色號: OA-02 · 燕麥 ｜ 數量: 1 ｜ 用途: 日光窗簾、空間隔簾 ｜ 保養: 30°C 輕柔洗。陰乾，微濕時低溫整燙。 ｜ 布樣: 長浮緞紋 ｜ 識別碼: SLV-503 ｜ 色號: CH-06 · 香檳 ｜ 數量: 1 ｜ 用途: 禮賓窗簾、靠枕面布」。

en-desktop　實際匯出 selvedge-samples-en.txt，527 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「SELVEDGE | Sample sheet ｜ Concept studio · offline sample selection for project review. ｜ Fabrics: 2 ｜ Fabric: Ground Plain ｜ Fabric ID: SLV-101 ｜ Colourway: OA-02 · Oat ｜ Quantity: 1 ｜ Use: Day curtains and room dividers ｜ Care: Gentle wash at 30°C. Line dry in shade and iron cool while damp. ｜ Fabric: Long Float Satin ｜ Fabric ID: SLV-503 ｜ Colourway: CH-06 · Champagne ｜ Quantity: 1 ｜ Use: Formal drapes and cushion faces」。

en-mobile　實際匯出 selvedge-samples-en.txt，527 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「SELVEDGE | Sample sheet ｜ Concept studio · offline sample selection for project review. ｜ Fabrics: 2 ｜ Fabric: Ground Plain ｜ Fabric ID: SLV-101 ｜ Colourway: OA-02 · Oat ｜ Quantity: 1 ｜ Use: Day curtains and room dividers ｜ Care: Gentle wash at 30°C. Line dry in shade and iron cool while damp. ｜ Fabric: Long Float Satin ｜ Fabric ID: SLV-503 ｜ Colourway: CH-06 · Champagne ｜ Quantity: 1 ｜ Use: Formal drapes and cushion faces」。

## FALL-1　PASS

三種降級情境的原始首屏均保留品牌、材質與主行動。對照正常頁，商業內容和下一步仍能辨認。

zh-Hant-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 selvedge-samples-zh-Hant.txt，467 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「布邊 SELVEDGE｜樣本單 ｜ 概念打樣室・離線樣本單，供提案核對。 ｜ 款數: 2 ｜ 布樣: 原地平紋 ｜ 識別碼: SLV-101 ｜ 色號: OA-02 · 燕麥 ｜ 數量: 1 ｜ 用途: 日光窗簾、空間隔簾 ｜ 保養: 30°C 輕柔洗。陰乾，微濕時低溫整燙。 ｜ 布樣: 長浮緞紋 ｜ 識別碼: SLV-503 ｜ 色號: CH-06 · 香檳 ｜ 數量: 1 ｜ 用途: 禮賓窗簾、靠枕面布」。 使用預設 GPU 選擇的 Edge：static fallback。

zh-Hant-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 selvedge-samples-zh-Hant.txt，467 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「布邊 SELVEDGE｜樣本單 ｜ 概念打樣室・離線樣本單，供提案核對。 ｜ 款數: 2 ｜ 布樣: 原地平紋 ｜ 識別碼: SLV-101 ｜ 色號: OA-02 · 燕麥 ｜ 數量: 1 ｜ 用途: 日光窗簾、空間隔簾 ｜ 保養: 30°C 輕柔洗。陰乾，微濕時低溫整燙。 ｜ 布樣: 長浮緞紋 ｜ 識別碼: SLV-503 ｜ 色號: CH-06 · 香檳 ｜ 數量: 1 ｜ 用途: 禮賓窗簾、靠枕面布」。

en-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 selvedge-samples-en.txt，527 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「SELVEDGE | Sample sheet ｜ Concept studio · offline sample selection for project review. ｜ Fabrics: 2 ｜ Fabric: Ground Plain ｜ Fabric ID: SLV-101 ｜ Colourway: OA-02 · Oat ｜ Quantity: 1 ｜ Use: Day curtains and room dividers ｜ Care: Gentle wash at 30°C. Line dry in shade and iron cool while damp. ｜ Fabric: Long Float Satin ｜ Fabric ID: SLV-503 ｜ Colourway: CH-06 · Champagne ｜ Quantity: 1 ｜ Use: Formal drapes and cushion faces」。

en-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 selvedge-samples-en.txt，527 bytes。chosen=[["SLV-101","OA-02"],["SLV-503","CH-06"]]；emptied=true；實際檔案摘錄「SELVEDGE | Sample sheet ｜ Concept studio · offline sample selection for project review. ｜ Fabrics: 2 ｜ Fabric: Ground Plain ｜ Fabric ID: SLV-101 ｜ Colourway: OA-02 · Oat ｜ Quantity: 1 ｜ Use: Day curtains and room dividers ｜ Care: Gentle wash at 30°C. Line dry in shade and iron cool while damp. ｜ Fabric: Long Float Satin ｜ Fabric ID: SLV-503 ｜ Colourway: CH-06 · Champagne ｜ Quantity: 1 ｜ Use: Formal drapes and cushion faces」。

## FALL-2　PASS

zh-Hant-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

zh-Hant-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop　原始流程記錄 20 筆請求、1 個來源、方法 {'GET': 20}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

zh-Hant-mobile　原始流程記錄 20 筆請求、1 個來源、方法 {'GET': 20}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-desktop　原始流程記錄 16 筆請求、1 個來源、方法 {'GET': 16}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-mobile　原始流程記錄 16 筆請求、1 個來源、方法 {'GET': 16}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

紅線穿過墨綠梭口時，垂紗依序讓位，中央留下新一列。切換三個織法及回到平紋後仍保有正確上下交錯。

## mobile 動態貼合

首三秒可追到下緣銅紅線向右橫越多根經紗，手機也能辨認三種織法的短格、斜脊與浮線。

