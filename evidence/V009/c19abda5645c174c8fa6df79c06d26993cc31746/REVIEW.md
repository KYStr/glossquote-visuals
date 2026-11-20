# V009 固定候選驗收

候選 c19abda5645c174c8fa6df79c06d26993cc31746。主責 GlossQuote Visuals 工作室美術主責（非製作者）。製作 01a1fa4c-f419-7853-bc26-6e79796f0a64。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44803659273)

## ART-1　PASS

入口直接呈現限量雙色海報、印務品牌、試算印件入口及可辨識的 FEEDBACK ASSEMBLY 演出海報。桌面的深底窄文案與海報並列，手機上兩者保持同屏。

## ART-2　PASS

藍版的音箱圓環及橘版的喇叭原先方向相對，相向滑行時喇叭實際覆過音箱，中央深紫區從小角擴為大片。單看每塊版仍有可辨全形，雙版回位時，紙邊與版外文字保持固定。

## ART-3　PASS

鉛字般窄黑標、齊紙邊與鈷藍螢橘套版，跟其他四站的用色與構圖都不同。三張演出案例各自延續雙墨圖形，印件預覽延續印刷裁線與紙張格式。

## GPU-1　PASS

zh-Hant-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 63–77。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。

zh-Hant-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 57–75。

en-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 73–78。

en-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 58–81。

## GPU-2　PASS

zh-Hant-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1375.8 ms；相同影格 是，恢復後改變 是。

zh-Hant-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1374.5 ms；相同影格 是，恢復後改變 是。

en-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1364.9 ms；相同影格 是，恢復後改變 是。

en-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1360.8 ms；相同影格 是，恢復後改變 是。

## PERF-1　PASS

zh-Hant-desktop　394 次提交／10.001 秒；median / p95 / max 25.30 / 26.40 / 29.00 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[352, 176]]、DPR 1。

zh-Hant-mobile　465 次提交／10.001 秒；median / p95 / max 21.40 / 22.20 / 22.80 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[348, 174]]、DPR 1。

en-desktop　421 次提交／10.002 秒；median / p95 / max 23.80 / 24.70 / 29.00 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[352, 176]]、DPR 1。

en-mobile　478 次提交／10.001 秒；median / p95 / max 20.80 / 22.00 / 23.60 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[348, 174]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop　含 lazy chunks 首載 1,100,971 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

zh-Hant-mobile　含 lazy chunks 首載 1,100,971 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-desktop　含 lazy chunks 首載 1,018,161 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-mobile　含 lazy chunks 首載 1,018,161 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

檢視雙語完整型錄、回改表單與窄版畫面，四種寬度及真正 200% 的完整頁面均保有可讀標題、圖說、選項、行動按鈕及結果。

zh-Hant-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

zh-Hant-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

en-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

en-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

核對按鈕、商業表單、焦點順序、選中狀態及錯誤提示。各寬度實際啟用的控制均可觸按，Tab 焦點清楚。另檢視 10 組須從截圖取色的文字，最低對比 7.79:1。取樣例為 Pause motion 7.96:1（前景像素 [661, 854]、背景 [657, 850]）。

zh-Hant-desktop　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 27 次，熱區不足 44×44 的有 0 次；可計算純色對比 124 次，待人工取色 3 次，低於門檻候選 0 次；門檻 3:1 群最小為 12.31:1, 門檻 4.5:1 群最小為 5.42:1。

zh-Hant-mobile　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 18 次，熱區不足 44×44 的有 0 次；可計算純色對比 82 次，待人工取色 2 次，低於門檻候選 0 次；門檻 3:1 群最小為 12.31:1, 門檻 4.5:1 群最小為 5.42:1。

en-desktop　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 27 次，熱區不足 44×44 的有 0 次；可計算純色對比 124 次，待人工取色 3 次，低於門檻候選 0 次；門檻 3:1 群最小為 12.31:1, 門檻 4.5:1 群最小為 5.42:1。

en-mobile　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 18 次，熱區不足 44×44 的有 0 次；可計算純色對比 82 次，待人工取色 2 次，低於門檻候選 0 次；門檻 3:1 群最小為 12.31:1, 門檻 4.5:1 群最小為 5.42:1。

## BIZ-1　PASS

三場虛構演出各有海報；雙語可選圖案、A2/A3、紙色及 25–250 張。預估金額、交期、尺寸與 170 g/m² 未塗佈紙說明保留在製作單。

## BIZ-2　PASS

zh-Hant-desktop　實際匯出 afterimage-print-sheet-zh-Hant.txt，332 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"24","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"25.5","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"251","error":"請輸入 25 至 250 之間的整數。"}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「疊印 AFTERIMAGE PRESS｜印件製作單 ｜ 圖案 AP–03 Side B Social ｜ 成品尺寸 A3 · 297 × 420 mm ｜ 印量 72 張 ｜ 紙色 暖白 ｜ 預估金額 NT$2,534 ｜ 預估工期 5–7 個工作天 ｜ 170 g/m² 未塗佈紙，鈷藍與螢橘雙色 ｜ 概念印務。案例為虛構活動，金額與工期為示意，製作單僅供離線規劃。」。

zh-Hant-mobile　實際匯出 afterimage-print-sheet-zh-Hant.txt，332 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"24","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"25.5","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"251","error":"請輸入 25 至 250 之間的整數。"}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「疊印 AFTERIMAGE PRESS｜印件製作單 ｜ 圖案 AP–03 Side B Social ｜ 成品尺寸 A3 · 297 × 420 mm ｜ 印量 72 張 ｜ 紙色 暖白 ｜ 預估金額 NT$2,534 ｜ 預估工期 5–7 個工作天 ｜ 170 g/m² 未塗佈紙，鈷藍與螢橘雙色 ｜ 概念印務。案例為虛構活動，金額與工期為示意，製作單僅供離線規劃。」。

en-desktop　實際匯出 afterimage-print-sheet-en.txt，356 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"24","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"25.5","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"251","error":"Enter a whole number from 25 to 250 copies."}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「AFTERIMAGE PRESS | Print sheet ｜ Artwork AP–03 Side B Social ｜ Trim size A3 · 297 × 420 mm ｜ Print run 72 copies ｜ Paper Warm white ｜ Estimate NT$2,534 ｜ Lead time 5–7 working days ｜ 170 gsm uncoated, cobalt blue + fluorescent orange ｜ Concept print service. Events are fictional, prices and lead times are illustrative, and print sheets are for offline planning.」。

en-mobile　實際匯出 afterimage-print-sheet-en.txt，356 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"24","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"25.5","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"251","error":"Enter a whole number from 25 to 250 copies."}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「AFTERIMAGE PRESS | Print sheet ｜ Artwork AP–03 Side B Social ｜ Trim size A3 · 297 × 420 mm ｜ Print run 72 copies ｜ Paper Warm white ｜ Estimate NT$2,534 ｜ Lead time 5–7 working days ｜ 170 gsm uncoated, cobalt blue + fluorescent orange ｜ Concept print service. Events are fictional, prices and lead times are illustrative, and print sheets are for offline planning.」。

## FALL-1　PASS

三種降級情境的原始首屏均保留品牌、材質與主行動。對照正常頁，商業內容和下一步仍能辨認。

zh-Hant-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 afterimage-print-sheet-zh-Hant.txt，332 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"24","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"25.5","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"251","error":"請輸入 25 至 250 之間的整數。"}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「疊印 AFTERIMAGE PRESS｜印件製作單 ｜ 圖案 AP–03 Side B Social ｜ 成品尺寸 A3 · 297 × 420 mm ｜ 印量 72 張 ｜ 紙色 暖白 ｜ 預估金額 NT$2,534 ｜ 預估工期 5–7 個工作天 ｜ 170 g/m² 未塗佈紙，鈷藍與螢橘雙色 ｜ 概念印務。案例為虛構活動，金額與工期為示意，製作單僅供離線規劃。」。 使用預設 GPU 選擇的 Edge：static fallback。

zh-Hant-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 afterimage-print-sheet-zh-Hant.txt，332 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"24","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"25.5","error":"請輸入 25 至 250 之間的整數。"}；invalid count rejected {"input":"251","error":"請輸入 25 至 250 之間的整數。"}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「疊印 AFTERIMAGE PRESS｜印件製作單 ｜ 圖案 AP–03 Side B Social ｜ 成品尺寸 A3 · 297 × 420 mm ｜ 印量 72 張 ｜ 紙色 暖白 ｜ 預估金額 NT$2,534 ｜ 預估工期 5–7 個工作天 ｜ 170 g/m² 未塗佈紙，鈷藍與螢橘雙色 ｜ 概念印務。案例為虛構活動，金額與工期為示意，製作單僅供離線規劃。」。

en-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 afterimage-print-sheet-en.txt，356 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"24","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"25.5","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"251","error":"Enter a whole number from 25 to 250 copies."}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「AFTERIMAGE PRESS | Print sheet ｜ Artwork AP–03 Side B Social ｜ Trim size A3 · 297 × 420 mm ｜ Print run 72 copies ｜ Paper Warm white ｜ Estimate NT$2,534 ｜ Lead time 5–7 working days ｜ 170 gsm uncoated, cobalt blue + fluorescent orange ｜ Concept print service. Events are fictional, prices and lead times are illustrative, and print sheets are for offline planning.」。

en-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 afterimage-print-sheet-en.txt，356 bytes。initial estimate {"count":50}；invalid count rejected {"input":"","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"24","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"25.5","error":"Enter a whole number from 25 to 250 copies."}；invalid count rejected {"input":"251","error":"Enter a whole number from 25 to 250 copies."}；minimum {"count":25}；standard lead threshold {"count":150}；extra lead threshold {"count":151}；maximum {"count":250}；revised {"count":72}；實際檔案摘錄「AFTERIMAGE PRESS | Print sheet ｜ Artwork AP–03 Side B Social ｜ Trim size A3 · 297 × 420 mm ｜ Print run 72 copies ｜ Paper Warm white ｜ Estimate NT$2,534 ｜ Lead time 5–7 working days ｜ 170 gsm uncoated, cobalt blue + fluorescent orange ｜ Concept print service. Events are fictional, prices and lead times are illustrative, and print sheets are for offline planning.」。

## FALL-2　PASS

zh-Hant-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

zh-Hant-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop　原始流程記錄 21 筆請求、1 個來源、方法 {'GET': 21}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

zh-Hant-mobile　原始流程記錄 21 筆請求、1 個來源、方法 {'GET': 21}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-desktop　原始流程記錄 18 筆請求、1 個來源、方法 {'GET': 18}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-mobile　原始流程記錄 18 筆請求、1 個來源、方法 {'GET': 18}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

紙張與大標固定，兩個圖版沿各自路徑套準，交疊只出現在相交的墨形。完整週期及回到雙版時圖形無脫離。

## mobile 動態貼合

手機首屏能直接看到留下紙白的兩版和隨後佔據中央的深紫區，單版切換清楚分開喇叭與音箱。

