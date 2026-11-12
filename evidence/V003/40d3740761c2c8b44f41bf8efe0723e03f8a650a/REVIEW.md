# V003 夜航訊號 — 共同候選獨立驗收

**PASS_CANDIDATE。美術 9.2、UI 9.3、商業完整度 9.5，三項均嚴格大於 9。** 本輪所見的共同候選維持前輪品質，沒有待修的候選阻擋問題。

本次簽核範圍為固定整合候選，**正式部署與最終 ZIP 尚待驗證**。不得將本報告表述為 live 已驗或整體 Goal 已完成。

- Candidate：`40d3740761c2c8b44f41bf8efe0723e03f8a650a`
- 作者：`01a1d0b2-414c-7452-ad32-445d958fb8a1`
- 非作者 reviewer：`/root/signal_review`
- 日期：2026-11-13
- Actions run 43272957275 / job 131373875460，Windows 2025 隔離 VM；[CI.json](CI.json) 及 [results.json](results.json) 的 commit 一致、工作成功。
- Artifact 13969476687；SHA-256 `372edbaaddbaf5fd476ae7778f457424d7f819da1f595e5c77a0c35b93999bd8`。下載digest核對記錄見 CI.json。

## 與作者候選的關係

對 `82ba3063ec2e7bd2bddee2a6efe7307563d8a7bd` 與本輪候選執行限定路徑 diff：V003 中英 HTML、CSS、page/tickets/shader、波形與場地資產、字型、shared runtime 和 signal-commercial 測試沒有差異。先前 f761f27→82ba306 的相關改動是把真實下載另存入artifact，未改產品來源。整合候選新增通用原 CSS 合成檢查，因此本輪不是直接搬用舊版測試結果。

已直接重看同 SHA 中英1440/390全頁、英文320/200%首屏、中文768全頁、英文1440與中文390選票及完成圖，以及中英原 CSS 合成 A/B 與暫停參考。中英實際行程檔也已親讀。

## 九項候選 gates

| Gate | 結論 | 證據與範圍 |
|---|---|---|
| visual | PASS | 本輪同SHA中英1440/390全頁、320/200%首屏及768畫面已直接檢視，沒有整合退化。V003的海報窄體、午夜藍/淡黃與訊號波形，在字體、色彩材質和構圖上與紙品及家飾作品有明顯區別。 [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-1440-webgpu.png](signal-zh-Hant-1440-webgpu.png)、[signal-en-390-webgpu.png](signal-en-390-webgpu.png)、[signal-zh-Hant-390-webgpu.png](signal-zh-Hant-390-webgpu.png)、[signal-en-320-200-percent.png](signal-en-320-200-percent.png)、[signal-zh-Hant-768-still.png](signal-zh-Hant-768-still.png) |
| interaction | PASS | signalBooking與signal專用檢查PASS；radio選取/保留場次、兩種票價、非法數量、焦點、完成/修改與真實下載都有同SHA證據。下載兩語內容已親讀。 [results.json](results.json)、[signal-en-1440-selection.png](signal-en-1440-selection.png)、[signal-zh-Hant-390-selection.png](signal-zh-Hant-390-selection.png)、[signal-en-1440-complete.png](signal-en-1440-complete.png)、[signal-zh-Hant-390-complete.png](signal-zh-Hant-390-complete.png)、[night-signal-2026-11-21-en.txt](night-signal-2026-11-21-en.txt)、[night-signal-2026-11-21-zh-Hant.txt](night-signal-2026-11-21-zh-Hant.txt) |
| shader | PASS | 同SHA隔離Windows VM真實WebGPU texture非均勻、三頻道不同，無probe收集到的validation/runtime錯誤；新增原CSS合成A/A/B/A及原生暫停對照，並同時量測GPU texture，排除只由CSS換色造成控制效果的假陽性。 [results.json](results.json)、[candidate-night-signal-en-composite-a0.png](candidate-night-signal-en-composite-a0.png)、[candidate-night-signal-en-composite-b.png](candidate-night-signal-en-composite-b.png)、[candidate-night-signal-en-composite-native-pause.png](candidate-night-signal-en-composite-native-pause.png)、[candidate-night-signal-en-texture-a0.png](candidate-night-signal-en-texture-a0.png)、[candidate-night-signal-en-texture-b.png](candidate-night-signal-en-texture-b.png) |
| lifecycle | PASS | signal測試完整執行初始化、拒絕adapter、無GPU、reduced-motion不初始化、暫停/繼續、18次切換共用一canvas/device、hidden/offscreen停止、實際device loss恢復及pagehide/pageshow重新配置與新frame。CI單元測試亦通過。 [results.json](results.json)、[CI.json](CI.json)、[candidate-night-signal-zh-Hant-composite-native-pause.png](candidate-night-signal-zh-Hant-composite-native-pause.png) |
| accessibility | PASS | signal專用雙語320/390/768/1440、200%文字、鍵盤/焦點、觸控與44px目標測試PASS；抽樣對比最低6:1，no-JS/reduced-motion內容可讀。真實讀屏測試另列NOT_RUN。 [results.json](results.json)、[signal-en-320-200-percent.png](signal-en-320-200-percent.png)、[signal-zh-Hant-768-still.png](signal-zh-Hant-768-still.png)、[signal-zh-Hant-390-selection.png](signal-zh-Hant-390-selection.png)、[signal-zh-Hant-390-still.png](signal-zh-Hant-390-still.png) |
| performance | PASS | 本輪signal實測27.03 texture acquisitions/s、有效DPR1、每頁一活動canvas，暫停/hidden/offscreen停止。CI build的每路由<=2MiB gzip（包含所追蹤lazy chunks）斷言通過。30fps是設計目標，不宣稱SDK有硬上限，也不把此量測等同真機流暢度或電池測試。 [results.json](results.json)、[CI.json](CI.json) |
| privacy | PASS | 固定source createShader第三參數disableTelemetry:true，CI檢查原始及輸出bundle；signal各狀態和新合成頁的assertPrivate均通過，只允許同源靜態GET與列明本地字型，沒有fetch/XHR/beacon/socket、storage或CSP/runtime錯誤。CSP為meta，非HTTP response header。 [results.json](results.json)、[CI.json](CI.json) |
| seo | PASS | 固定source與成功CI build檢查雙語HTML title/description/h1/canonical、互返hreflang/x-default、分享資產及Pages base；candidate robots/noindex、sitemap與404的HTTP檢查PASS。正式部署的index/sitemap與live GET尚待發布工作驗證。 [CI.json](CI.json)、[results.json](results.json) |
| reproducibility | PASS | CI固定40d3740、lockfile clean install、source check、unit tests、build及隔離瀏覽器整批成功；run/job與artifact digest由CI.json記錄，與本輪來源/證據吻合。本gate只簽核候選可重現性；正式部署驗證及交付ZIP另列PENDING。 [CI.json](CI.json)、[results.json](results.json) |

## 原 CSS 合成與效能量測

新檢查以相同100ms推進間隔記錄 A/A/B/A，保留原 opacity 0.71、screen blend、mask 及可見祖先，並同時讀取GPU texture。控制造成的改變必須超過自然動畫漂移，返回A後差異必須降低；原生暫停提供沒有live shader的同設定參考。這使CSS波形換色無法單獨冒充GPU控制成功。

| 語言 | 合成 A/A 漂移平均 | 合成 A/B 改變平均 | 返回 A 差異平均 | GPU A/A 漂移平均 | GPU A/B 改變平均 | 原生暫停差異平均／像素 |
|---|---:|---:|---:|---:|---:|---:|
| zh-Hant | 0.265 | 6.135 | 0.628 | 0.596 | 10.325 | 4.894 / 341 |
| en | 0.265 | 6.129 | 0.613 | 0.602 | 10.319 | 4.909 / 340 |

數值取自 [results.json](results.json) 的 `measurements.compositeControls.candidate-night-signal-*`，是80×60取樣網格的RGB差異，並非可用性分數。V003 本輪實測 **27.03 texture acquisitions/s、有效DPR 1、抽樣最低對比6:1**；不可稱作所有真機的幀率保證。CI build 的2MiB gzip預算斷言通過，沒有虛構額外FPS cap選項。

## 美術：9.2 / 10

| 子項 | /2 | 判斷 | 同 SHA 證據 |
|---|---:|---|---|
| 品牌辨識 | 1.9 | 午夜藍、淡黃、窄體英文與訊號標記貫穿首屏、節目及完成頁；新增脈衝標記把主視覺語言延續到節目列。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-1440-webgpu.png](signal-zh-Hant-1440-webgpu.png)、[signal-en-1440-complete.png](signal-en-1440-complete.png) |
| 首屏構圖 | 1.9 | 大字、日期地點與 CTA 主次清楚。波形焦點集中於右上亮脊，文字區與圖像區形成完整活動海報；390 保留主標、時間與行動。 | [signal-en-1440-poster.png](signal-en-1440-poster.png)、[signal-zh-Hant-390-poster.png](signal-zh-Hant-390-poster.png)、[signal-en-390-webgpu.png](signal-en-390-webgpu.png) |
| 字體排版 | 1.8 | 英文 Barlow Condensed 與中文大字各自保持層級；修改後英文主標字距清楚。中文正文與介面較保守，但沒有阻擋閱讀的擠壓或孤字。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-1440-webgpu.png](signal-zh-Hant-1440-webgpu.png)、[signal-zh-Hant-390-selection.png](signal-zh-Hant-390-selection.png) |
| 材質影像 | 1.8 | 細波形、集中亮脊與退後底格維持前輪改善，場地黃光與午夜藍延續品牌。新原CSS合成與原生暫停對照顯示實際shader貢獻，不以只看獨立canvas取代整頁美術判斷。 | [signal-en-1440-poster.png](signal-en-1440-poster.png)、[candidate-night-signal-en-composite-a0.png](candidate-night-signal-en-composite-a0.png)、[candidate-night-signal-en-composite-b.png](candidate-night-signal-en-composite-b.png)、[candidate-night-signal-en-composite-native-pause.png](candidate-night-signal-en-composite-native-pause.png) |
| 整頁與跨尺寸節奏 | 1.8 | 深淺區塊、時間表與場地大圖形成穩定節奏。手機已改標題→圖片→實用資訊，改善原本先讀長文的負擔。英文手機交通段仍略長，但沒有妨礙主要流程。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-en-390-webgpu.png](signal-en-390-webgpu.png)、[signal-zh-Hant-390-webgpu.png](signal-zh-Hant-390-webgpu.png)、[signal-zh-Hant-768-still.png](signal-zh-Hant-768-still.png) |

## UI：9.3 / 10

| 子項 | /2 | 判斷 | 同 SHA 證據 |
|---|---:|---|---|
| 資訊層級 | 1.9 | 活動定位、節目與時間、場地、票種、FAQ 的決策順序清楚；選票摘要內的場次、單價、張數及總額可直接核對。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-1440-webgpu.png](signal-zh-Hant-1440-webgpu.png)、[signal-en-1440-selection.png](signal-en-1440-selection.png)、[signal-zh-Hant-390-selection.png](signal-zh-Hant-390-selection.png) |
| 導航與行動 | 1.9 | 首屏與頁內導覽能清楚進入選票，單場票標籤已明示場次；完成後下載與修改的主次分明。鍵盤焦點與 CTA 導向有同 SHA 測試支持。 | [signal-en-390-webgpu.png](signal-en-390-webgpu.png)、[signal-en-1440-selection.png](signal-en-1440-selection.png)、[signal-en-1440-complete.png](signal-en-1440-complete.png)、[results.json](results.json) |
| 表單與狀態 | 1.8 | 票種、場次、數量、價格更新、未選與非法數量的恢復均有同 SHA 測試。原生欄位清楚實用，選擇及完成圖排版完整；artifact 未保留獨立錯誤畫面，錯誤視覺判斷不超出測試及來源所能支持的範圍。 | [signal-en-1440-selection.png](signal-en-1440-selection.png)、[signal-zh-Hant-390-selection.png](signal-zh-Hant-390-selection.png)、[signal-zh-Hant-390-complete.png](signal-zh-Hant-390-complete.png)、[results.json](results.json) |
| 手機／鍵盤／縮放 | 1.8 | 雙語390與桌面畫面完整，768雙欄保留閱讀寬度，320／200%首屏自然改成單欄且文字與CTA沒有裁斷。同 SHA 測試涵蓋雙語四寬度、200%文字、44px目標、鍵盤與觸控；未聲稱完整輔具使用者測試。 | [signal-en-320-200-percent.png](signal-en-320-200-percent.png)、[signal-zh-Hant-768-still.png](signal-zh-Hant-768-still.png)、[signal-en-390-webgpu.png](signal-en-390-webgpu.png)、[signal-zh-Hant-390-webgpu.png](signal-zh-Hant-390-webgpu.png)、[results.json](results.json) |
| 互動回饋與一致性 | 1.9 | 節目圓點單選、選中背景與脈衝標記一致；首次選單場票後場次保留。新A/A/B/A測試同時驗證原CSS合成與GPU texture的變化大於自然漂移，返回A及原生暫停行為成立。 | [signal-zh-Hant-390-webgpu.png](signal-zh-Hant-390-webgpu.png)、[signal-en-1440-selection.png](signal-en-1440-selection.png)、[candidate-night-signal-zh-Hant-composite-a0.png](candidate-night-signal-zh-Hant-composite-a0.png)、[candidate-night-signal-zh-Hant-composite-b.png](candidate-night-signal-zh-Hant-composite-b.png)、[results.json](results.json) |

## 商業完整度：9.5 / 10

| 子項 | /2 | 判斷 | 同 SHA 證據 |
|---|---:|---|---|
| 定位與價值 | 1.9 | 首屏直接說出環境音、低頻現場與深夜DJ；節目描述及場地影像支撐港邊電子音樂夜的體驗，網站已有完整活動品牌而非特效展示。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-1440-webgpu.png](signal-zh-Hant-1440-webgpu.png) |
| 產品決策資訊 | 1.8 | 日期、三場時間、曲風、NT$480/880、單場與全夜差異、開門與散場參考都有；場地改成入口、站席、休息及回程資訊。真實地址不存在且已披露，不能拿概念站當真實售票站。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-390-webgpu.png](signal-zh-Hant-390-webgpu.png)、[signal-en-1440-selection.png](signal-en-1440-selection.png)、[results.json](results.json) |
| 內容信任與真實性 | 2.0 | 票價示意、概念場地、場地示意圖與作品頁尾皆有揭露；完成明確說尚未付款或保留席位，沒有虛構交易成功、客戶背書或可到場地址。 | [signal-en-1440-webgpu.png](signal-en-1440-webgpu.png)、[signal-zh-Hant-390-webgpu.png](signal-zh-Hant-390-webgpu.png)、[signal-en-1440-complete.png](signal-en-1440-complete.png)、[signal-zh-Hant-390-complete.png](signal-zh-Hant-390-complete.png) |
| 主要顧客流程 | 1.9 | 從節目理解、票種與場次選擇、張數和總額核對到完成摘要的路徑連貫。預選與保留規則已揭露且通過測試，不再因重新瀏覽節目暗中改掉已選票的場次。 | [signal-en-1440-selection.png](signal-en-1440-selection.png)、[signal-zh-Hant-390-selection.png](signal-zh-Hant-390-selection.png)、[signal-en-1440-complete.png](signal-en-1440-complete.png)、[results.json](results.json) |
| 完成與錯誤恢復 | 1.9 | 完成頁與本輪保存的中英實際下載均已親讀：日期、地點、舞台、NT$880×3=NT$2,640、三場時間一致，且明示未付款與未保留席位。返回修改保留值、錯誤聚焦由同SHA遠端測試確認。 | [signal-en-1440-complete.png](signal-en-1440-complete.png)、[signal-zh-Hant-390-complete.png](signal-zh-Hant-390-complete.png)、[night-signal-2026-11-21-en.txt](night-signal-2026-11-21-en.txt)、[night-signal-2026-11-21-zh-Hant.txt](night-signal-2026-11-21-zh-Hant.txt)、[results.json](results.json) |

## 真實下載核對

[English itinerary](night-signal-2026-11-21-en.txt) 與[繁體中文行程](night-signal-2026-11-21-zh-Hant.txt) 是同SHA瀏覽器實際下載後保存的檔案，非 reviewer 重建。兩檔與完成畫面一致：2026-11-21、北堤聲場及主舞台、全夜票3張、單價NT$880、總額NT$2,640、19:00–20:00／20:15–21:30／21:45–23:30三段演出，並明示尚未付款或保留席位。

## 未執行與發布邊界

- 實體GPU、真實手機熱量／電池與硬體效能：**NOT_RUN**。本輪是WARP compositor與SwiftShader fallback adapter。
- 人工讀屏完整操作：**NOT_RUN**。已有鍵盤、焦點與語意檢查不可當作讀屏實測。
- 正式部署、live HTTPS及source SHA、live互動、最終ZIP：**PENDING**；由發布工作另行完成。

- 同SHA提供中英1440/390全頁、中文768全頁與英文320/200%首屏；其餘尺寸/語言組合的布局證據來自signal自動測試，沒有宣稱每個組合都有保留截圖。
- 未保存獨立表單錯誤畫面；錯誤顯示、aria-invalid、焦點及修正後提交依同SHA源碼與成功測試，並非人工讀屏觀察。
- signal-*-webgpu.png三頻道獨立GPU證據會暫時隱藏poster並改canvas opacity/blend；美術及合成驗收採正常全頁/hero與candidate-night-signal-*-composite-*.png原CSS圖。
- 本輪評分維持9.2/9.3/9.5，因來源與同SHA畫面沒有造成需調分的改變。分數是固定commercial-v1規準的設計判斷，不是轉換率或市場認證。
- 只寫本目錄REVIEW.md與acceptance.json；未更動作品來源、未commit、未啟動本機瀏覽器或桌面。

## 非阻擋建議

英文390交通段略長，中文正文風格較保守。 若日後精修，可把回程時間、站點與概念地址披露分成更短句；目前不構成候選阻擋，修改後需新SHA核對。

