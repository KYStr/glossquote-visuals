# V011 固定候選驗收

候選 c19abda5645c174c8fa6df79c06d26993cc31746。主責 GlossQuote Visuals 工作室美術主責（非製作者）。製作 01a1fa4c-f6de-7273-803e-a88b0b23858d。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/44803659273)

## ART-1　PASS

黑色大視野裡的巨型月影與明亮弦月對著食刻字標；雙語首屏都能認出巡迴穹頂放映服務及選節目入口。手機保留完整遮掩輪廓。

## ART-2　PASS

首訪時象牙色弦月已可見，月影掠過後亮面縮在邊緣，短暫集中成亮珠，再留下完整紫色細環。復圓時亮面轉到另一側，遮蔽方向連續。按三個相位切換，光源、日冕與圓心始終一致。

## ART-3　PASS

象牙色日輪、紫暈、大片留黑及電影海報式襯線字，與同批四件構圖均不同。節目片單圖延續月相，場地條件與排程用窄線框票券形式承接。

## GPU-1　PASS

zh-Hant-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 117–128。 裸 Edge 157.0.4341.60 的實際模式是 static fallback。

zh-Hant-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 116–122。

en-desktop　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 118–127。

en-mobile　Chromium 158.0.8127.18，adapter google / swiftshader，裝置數 1；6 個原始 GPU 影格，6 個不同雜湊；每張取樣的顏色種類範圍 116–123。

## GPU-2　PASS

zh-Hant-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1366.2 ms；相同影格 是，恢復後改變 是。

zh-Hant-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1372.5 ms；相同影格 是，恢復後改變 是。

en-desktop　控制順序 [0, 1, 2, 0]，鍵盤。首次暫停擷取結束到複驗開始 1361.2 ms；相同影格 是，恢復後改變 是。

en-mobile　控制順序 [0, 1, 2, 0]，觸控。首次暫停擷取結束到複驗開始 1366.4 ms；相同影格 是，恢復後改變 是。

## PERF-1　PASS

zh-Hant-desktop　494 次提交／10.001 秒；median / p95 / max 18.70 / 31.60 / 42.40 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[560, 374]]、DPR 1。

zh-Hant-mobile　423 次提交／10.000 秒；median / p95 / max 23.60 / 24.60 / 30.90 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[263, 176]]、DPR 1。

en-desktop　344 次提交／10.004 秒；median / p95 / max 29.10 / 30.20 / 31.30 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [1440, 900]、canvas [[560, 374]]、DPR 1。

en-mobile　443 次提交／10.001 秒；median / p95 / max 22.60 / 23.40 / 24.10 ms。三項值皆在 34 / 50 / 150 ms 內。 CSS [390, 844]、canvas [[263, 176]]、DPR 1。

## PERF-2　PASS

zh-Hant-desktop　含 lazy chunks 首載 1,114,407 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

zh-Hant-mobile　含 lazy chunks 首載 1,114,407 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-desktop　含 lazy chunks 首載 810,591 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

en-mobile　含 lazy chunks 首載 810,591 / 2,097,152 gzip bytes。 離屏、背景停送與回返由 FALL-2-and-PERF-2 記錄 PASS；隱藏方法為 synthetic visibilitychange。

## UI-1　PASS

檢視雙語完整型錄、回改表單與窄版畫面，四種寬度及真正 200% 的完整頁面均保有可讀標題、圖說、選項、行動按鈕及結果。手機 390 與平板 768 的英文片名現在完整顯示 Chasing the Shadow。

zh-Hant-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

zh-Hant-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

en-desktop　viewport 寬／實際 scrollWidth 768/768 px, 1440/1440 px。真實 200% tab zoom：720/720 px。

en-mobile　viewport 寬／實際 scrollWidth 320/320 px, 390/390 px。

## UI-2　PASS

核對按鈕、商業表單、焦點順序、選中狀態及錯誤提示。各寬度實際啟用的控制均可觸按，Tab 焦點清楚。另檢視 10 組須從截圖取色的文字，最低對比 6.24:1。取樣例為 Pause motion 6.24:1（前景像素 [614, 163]、背景 [610, 159]）。

zh-Hant-desktop　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 33 次，熱區不足 44×44 的有 0 次；可計算純色對比 143 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 13.13:1, 門檻 4.5:1 群最小為 6.24:1。

zh-Hant-mobile　16/16 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 22 次，熱區不足 44×44 的有 0 次；可計算純色對比 94 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 13.13:1, 門檻 4.5:1 群最小為 6.24:1。

en-desktop　17/17 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 33 次，熱區不足 44×44 的有 0 次；可計算純色對比 143 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 13.13:1, 門檻 4.5:1 群最小為 6.24:1。

en-mobile　16/16 個 Tab 停點符合 :focus-visible；已啟用主要控制取樣 22 次，熱區不足 44×44 的有 0 次；可計算純色對比 94 次，待人工取色 0 次，低於門檻候選 0 次；門檻 3:1 群最小為 13.13:1, 門檻 4.5:1 群最小為 6.24:1。

## BIZ-1　PASS

三部片有片長、適齡與節目介紹，兩種穹頂說明面積、淨高、電源與人數。雙語顯示分場、預估時段和費用，清楚標明是場地規劃提案。

## BIZ-2　PASS

zh-Hant-desktop　實際匯出 umbra-dial-proposal-zh-Hant.txt，589 bytes。normal compact screening {"labels":["第 1 場・24 人","第 2 場・24 人"],"times":["09:30–09:52","10:07–10:29"],"summary":"追光入影・共 48 人・7 歲以上・22 分鐘"}；below minimum {"message":"請輸入至少 12 人的整數人數。"}；fractional count {"message":"請輸入至少 12 人的整數人數。"}；minimum {"labels":["第 1 場・12 人"],"times":["09:30–09:52"],"summary":"追光入影・共 12 人・7 歲以上・22 分鐘"}；compact overflow {"message":"此穹頂最多安排三場，合計可容納 72 人。"}；compact maximum {"labels":["第 1 場・24 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 72 人・7 歲以上・22 分鐘"}；unconfirmed venue {"message":"請先確認場地淨空、高度與電源符合規格，再試排放映。"}；hall overflow {"message":"此穹頂最多安排三場，合計可容納 108 人。"}；hall maximum {"labels":["第 1 場・36 人","第 2 場・36 人","第 3 場・36 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 108 人・7 歲以上・22 分鐘"}；revised hall proposal {"labels":["第 1 場・25 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"下一道月影・共 73 人・13 歲以上・38 分鐘"}；實際檔案摘錄「食刻 UMBRA DIAL｜場館提案 ｜ 概念展演。時段與金額皆為示意，下載提案不代表已預約。 ｜ 下一道月影・共 73 人・13 歲以上・38 分鐘 ｜ 第 1 場・25 人 | 09:30–10:08 ｜ 第 2 場・24 人 | 10:23–11:01 ｜ 第 3 場・24 人 | 11:16–11:54 ｜ 大型穹頂 · 淨空 9 × 9 公尺、高 5 公尺；獨立接地 110 V／15 A 插座兩組。 場地使用時間 08:30–12:39，含架設與撤場。 ｜ 隨團設備：充氣穹頂、全穹頂投影機、環繞音響。首場前預留 60 分鐘架設，末場後預留 45 分鐘撤場。 ｜ 示意總額：NT$ 78,000」。

zh-Hant-mobile　實際匯出 umbra-dial-proposal-zh-Hant.txt，589 bytes。normal compact screening {"labels":["第 1 場・24 人","第 2 場・24 人"],"times":["09:30–09:52","10:07–10:29"],"summary":"追光入影・共 48 人・7 歲以上・22 分鐘"}；below minimum {"message":"請輸入至少 12 人的整數人數。"}；fractional count {"message":"請輸入至少 12 人的整數人數。"}；minimum {"labels":["第 1 場・12 人"],"times":["09:30–09:52"],"summary":"追光入影・共 12 人・7 歲以上・22 分鐘"}；compact overflow {"message":"此穹頂最多安排三場，合計可容納 72 人。"}；compact maximum {"labels":["第 1 場・24 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 72 人・7 歲以上・22 分鐘"}；unconfirmed venue {"message":"請先確認場地淨空、高度與電源符合規格，再試排放映。"}；hall overflow {"message":"此穹頂最多安排三場，合計可容納 108 人。"}；hall maximum {"labels":["第 1 場・36 人","第 2 場・36 人","第 3 場・36 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 108 人・7 歲以上・22 分鐘"}；revised hall proposal {"labels":["第 1 場・25 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"下一道月影・共 73 人・13 歲以上・38 分鐘"}；實際檔案摘錄「食刻 UMBRA DIAL｜場館提案 ｜ 概念展演。時段與金額皆為示意，下載提案不代表已預約。 ｜ 下一道月影・共 73 人・13 歲以上・38 分鐘 ｜ 第 1 場・25 人 | 09:30–10:08 ｜ 第 2 場・24 人 | 10:23–11:01 ｜ 第 3 場・24 人 | 11:16–11:54 ｜ 大型穹頂 · 淨空 9 × 9 公尺、高 5 公尺；獨立接地 110 V／15 A 插座兩組。 場地使用時間 08:30–12:39，含架設與撤場。 ｜ 隨團設備：充氣穹頂、全穹頂投影機、環繞音響。首場前預留 60 分鐘架設，末場後預留 45 分鐘撤場。 ｜ 示意總額：NT$ 78,000」。

en-desktop　實際匯出 umbra-dial-proposal-en.txt，643 bytes。normal compact screening {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests"],"times":["09:30–09:52","10:07–10:29"],"summary":"Chasing the Shadow · 48 guests · Ages 7+ · 22 min"}；below minimum {"message":"Enter a whole number of guests, at least 12."}；fractional count {"message":"Enter a whole number of guests, at least 12."}；minimum {"labels":["Screening 1 · 12 guests"],"times":["09:30–09:52"],"summary":"Chasing the Shadow · 12 guests · Ages 7+ · 22 min"}；compact overflow {"message":"This dome can seat up to 72 guests across three screenings."}；compact maximum {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 72 guests · Ages 7+ · 22 min"}；unconfirmed venue {"message":"Confirm the clear floor, height and power requirements before building your proposal."}；hall overflow {"message":"This dome can seat up to 108 guests across three screenings."}；hall maximum {"labels":["Screening 1 · 36 guests","Screening 2 · 36 guests","Screening 3 · 36 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 108 guests · Ages 7+ · 22 min"}；revised hall proposal {"labels":["Screening 1 · 25 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"The Next Eclipse · 73 guests · Ages 13+ · 38 min"}；實際檔案摘錄「UMBRA DIAL | Venue proposal ｜ Concept service. Sample times and prices only. Downloading a proposal does not book a screening. ｜ The Next Eclipse · 73 guests · Ages 13+ · 38 min ｜ Screening 1 · 25 guests | 09:30–10:08 ｜ Screening 2 · 24 guests | 10:23–11:01 ｜ Screening 3 · 24 guests | 11:16–11:54 ｜ Hall dome · 9 × 9 m clear floor and 5 m height. Two dedicated grounded 110 V / 15 A circuits. Venue access 08:30–12:39 including setup and s」。

en-mobile　實際匯出 umbra-dial-proposal-en.txt，643 bytes。normal compact screening {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests"],"times":["09:30–09:52","10:07–10:29"],"summary":"Chasing the Shadow · 48 guests · Ages 7+ · 22 min"}；below minimum {"message":"Enter a whole number of guests, at least 12."}；fractional count {"message":"Enter a whole number of guests, at least 12."}；minimum {"labels":["Screening 1 · 12 guests"],"times":["09:30–09:52"],"summary":"Chasing the Shadow · 12 guests · Ages 7+ · 22 min"}；compact overflow {"message":"This dome can seat up to 72 guests across three screenings."}；compact maximum {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 72 guests · Ages 7+ · 22 min"}；unconfirmed venue {"message":"Confirm the clear floor, height and power requirements before building your proposal."}；hall overflow {"message":"This dome can seat up to 108 guests across three screenings."}；hall maximum {"labels":["Screening 1 · 36 guests","Screening 2 · 36 guests","Screening 3 · 36 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 108 guests · Ages 7+ · 22 min"}；revised hall proposal {"labels":["Screening 1 · 25 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"The Next Eclipse · 73 guests · Ages 13+ · 38 min"}；實際檔案摘錄「UMBRA DIAL | Venue proposal ｜ Concept service. Sample times and prices only. Downloading a proposal does not book a screening. ｜ The Next Eclipse · 73 guests · Ages 13+ · 38 min ｜ Screening 1 · 25 guests | 09:30–10:08 ｜ Screening 2 · 24 guests | 10:23–11:01 ｜ Screening 3 · 24 guests | 11:16–11:54 ｜ Hall dome · 9 × 9 m clear floor and 5 m height. Two dedicated grounded 110 V / 15 A circuits. Venue access 08:30–12:39 including setup and s」。

## FALL-1　PASS

三種降級情境的原始首屏均保留品牌、材質與主行動。對照正常頁，商業內容和下一步仍能辨認。

zh-Hant-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 umbra-dial-proposal-zh-Hant.txt，589 bytes。normal compact screening {"labels":["第 1 場・24 人","第 2 場・24 人"],"times":["09:30–09:52","10:07–10:29"],"summary":"追光入影・共 48 人・7 歲以上・22 分鐘"}；below minimum {"message":"請輸入至少 12 人的整數人數。"}；fractional count {"message":"請輸入至少 12 人的整數人數。"}；minimum {"labels":["第 1 場・12 人"],"times":["09:30–09:52"],"summary":"追光入影・共 12 人・7 歲以上・22 分鐘"}；compact overflow {"message":"此穹頂最多安排三場，合計可容納 72 人。"}；compact maximum {"labels":["第 1 場・24 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 72 人・7 歲以上・22 分鐘"}；unconfirmed venue {"message":"請先確認場地淨空、高度與電源符合規格，再試排放映。"}；hall overflow {"message":"此穹頂最多安排三場，合計可容納 108 人。"}；hall maximum {"labels":["第 1 場・36 人","第 2 場・36 人","第 3 場・36 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 108 人・7 歲以上・22 分鐘"}；revised hall proposal {"labels":["第 1 場・25 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"下一道月影・共 73 人・13 歲以上・38 分鐘"}；實際檔案摘錄「食刻 UMBRA DIAL｜場館提案 ｜ 概念展演。時段與金額皆為示意，下載提案不代表已預約。 ｜ 下一道月影・共 73 人・13 歲以上・38 分鐘 ｜ 第 1 場・25 人 | 09:30–10:08 ｜ 第 2 場・24 人 | 10:23–11:01 ｜ 第 3 場・24 人 | 11:16–11:54 ｜ 大型穹頂 · 淨空 9 × 9 公尺、高 5 公尺；獨立接地 110 V／15 A 插座兩組。 場地使用時間 08:30–12:39，含架設與撤場。 ｜ 隨團設備：充氣穹頂、全穹頂投影機、環繞音響。首場前預留 60 分鐘架設，末場後預留 45 分鐘撤場。 ｜ 示意總額：NT$ 78,000」。 使用預設 GPU 選擇的 Edge：static fallback。

zh-Hant-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 umbra-dial-proposal-zh-Hant.txt，589 bytes。normal compact screening {"labels":["第 1 場・24 人","第 2 場・24 人"],"times":["09:30–09:52","10:07–10:29"],"summary":"追光入影・共 48 人・7 歲以上・22 分鐘"}；below minimum {"message":"請輸入至少 12 人的整數人數。"}；fractional count {"message":"請輸入至少 12 人的整數人數。"}；minimum {"labels":["第 1 場・12 人"],"times":["09:30–09:52"],"summary":"追光入影・共 12 人・7 歲以上・22 分鐘"}；compact overflow {"message":"此穹頂最多安排三場，合計可容納 72 人。"}；compact maximum {"labels":["第 1 場・24 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 72 人・7 歲以上・22 分鐘"}；unconfirmed venue {"message":"請先確認場地淨空、高度與電源符合規格，再試排放映。"}；hall overflow {"message":"此穹頂最多安排三場，合計可容納 108 人。"}；hall maximum {"labels":["第 1 場・36 人","第 2 場・36 人","第 3 場・36 人"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"追光入影・共 108 人・7 歲以上・22 分鐘"}；revised hall proposal {"labels":["第 1 場・25 人","第 2 場・24 人","第 3 場・24 人"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"下一道月影・共 73 人・13 歲以上・38 分鐘"}；實際檔案摘錄「食刻 UMBRA DIAL｜場館提案 ｜ 概念展演。時段與金額皆為示意，下載提案不代表已預約。 ｜ 下一道月影・共 73 人・13 歲以上・38 分鐘 ｜ 第 1 場・25 人 | 09:30–10:08 ｜ 第 2 場・24 人 | 10:23–11:01 ｜ 第 3 場・24 人 | 11:16–11:54 ｜ 大型穹頂 · 淨空 9 × 9 公尺、高 5 公尺；獨立接地 110 V／15 A 插座兩組。 場地使用時間 08:30–12:39，含架設與撤場。 ｜ 隨團設備：充氣穹頂、全穹頂投影機、環繞音響。首場前預留 60 分鐘架設，末場後預留 45 分鐘撤場。 ｜ 示意總額：NT$ 78,000」。

en-desktop　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 umbra-dial-proposal-en.txt，643 bytes。normal compact screening {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests"],"times":["09:30–09:52","10:07–10:29"],"summary":"Chasing the Shadow · 48 guests · Ages 7+ · 22 min"}；below minimum {"message":"Enter a whole number of guests, at least 12."}；fractional count {"message":"Enter a whole number of guests, at least 12."}；minimum {"labels":["Screening 1 · 12 guests"],"times":["09:30–09:52"],"summary":"Chasing the Shadow · 12 guests · Ages 7+ · 22 min"}；compact overflow {"message":"This dome can seat up to 72 guests across three screenings."}；compact maximum {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 72 guests · Ages 7+ · 22 min"}；unconfirmed venue {"message":"Confirm the clear floor, height and power requirements before building your proposal."}；hall overflow {"message":"This dome can seat up to 108 guests across three screenings."}；hall maximum {"labels":["Screening 1 · 36 guests","Screening 2 · 36 guests","Screening 3 · 36 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 108 guests · Ages 7+ · 22 min"}；revised hall proposal {"labels":["Screening 1 · 25 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"The Next Eclipse · 73 guests · Ages 13+ · 38 min"}；實際檔案摘錄「UMBRA DIAL | Venue proposal ｜ Concept service. Sample times and prices only. Downloading a proposal does not book a screening. ｜ The Next Eclipse · 73 guests · Ages 13+ · 38 min ｜ Screening 1 · 25 guests | 09:30–10:08 ｜ Screening 2 · 24 guests | 10:23–11:01 ｜ Screening 3 · 24 guests | 11:16–11:54 ｜ Hall dome · 9 × 9 m clear floor and 5 m height. Two dedicated grounded 110 V / 15 A circuits. Venue access 08:30–12:39 including setup and s」。

en-mobile　三模式實存首屏 3/3。GPU 失敗模式客戶流程：實際匯出 umbra-dial-proposal-en.txt，643 bytes。normal compact screening {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests"],"times":["09:30–09:52","10:07–10:29"],"summary":"Chasing the Shadow · 48 guests · Ages 7+ · 22 min"}；below minimum {"message":"Enter a whole number of guests, at least 12."}；fractional count {"message":"Enter a whole number of guests, at least 12."}；minimum {"labels":["Screening 1 · 12 guests"],"times":["09:30–09:52"],"summary":"Chasing the Shadow · 12 guests · Ages 7+ · 22 min"}；compact overflow {"message":"This dome can seat up to 72 guests across three screenings."}；compact maximum {"labels":["Screening 1 · 24 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 72 guests · Ages 7+ · 22 min"}；unconfirmed venue {"message":"Confirm the clear floor, height and power requirements before building your proposal."}；hall overflow {"message":"This dome can seat up to 108 guests across three screenings."}；hall maximum {"labels":["Screening 1 · 36 guests","Screening 2 · 36 guests","Screening 3 · 36 guests"],"times":["09:30–09:52","10:07–10:29","10:44–11:06"],"summary":"Chasing the Shadow · 108 guests · Ages 7+ · 22 min"}；revised hall proposal {"labels":["Screening 1 · 25 guests","Screening 2 · 24 guests","Screening 3 · 24 guests"],"times":["09:30–10:08","10:23–11:01","11:16–11:54"],"summary":"The Next Eclipse · 73 guests · Ages 13+ · 38 min"}；實際檔案摘錄「UMBRA DIAL | Venue proposal ｜ Concept service. Sample times and prices only. Downloading a proposal does not book a screening. ｜ The Next Eclipse · 73 guests · Ages 13+ · 38 min ｜ Screening 1 · 25 guests | 09:30–10:08 ｜ Screening 2 · 24 guests | 10:23–11:01 ｜ Screening 3 · 24 guests | 11:16–11:54 ｜ Hall dome · 9 × 9 m clear floor and 5 m height. Two dedicated grounded 110 V / 15 A circuits. Venue access 08:30–12:39 including setup and s」。

## FALL-2　PASS

zh-Hant-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

zh-Hant-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-desktop　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

en-mobile　裝置失去後 running；背景事件 synthetic visibilitychange；離頁返回 actual away/back。實存恢復畫面與紋理：after-device-loss.png, device-recovered-texture.png, navigation-return-texture.png

## SHIP-1　PASS

zh-Hant-desktop　原始流程記錄 16 筆請求、1 個來源、方法 {'GET': 16}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

zh-Hant-mobile　原始流程記錄 16 筆請求、1 個來源、方法 {'GET': 16}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-desktop　原始流程記錄 11 筆請求、1 個來源、方法 {'GET': 11}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

en-mobile　原始流程記錄 11 筆請求、1 個來源、方法 {'GET': 11}；runtime 隱私及 storage 探針結果 PASS。build.txt 記載 emitted telemetry opt-out：是；記載 canonical/互返 metadata、CSP 與分享資源檢查：是。

## desktop 動態貼合

黑色月影在一條連續路徑上掩住日輪、短暫形成亮點與細環、緩慢重新放出日面。完整十秒週期可回到初始食相。

## mobile 動態貼合

大月牙在前三秒縮成細環，黑色圓心及光暈留在同一座標；手動比對三種相位也能從亮側方向與亮面面積辨認。

