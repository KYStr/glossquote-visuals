# V001 紙與光 — 最終整合候選驗收

固定候選 `40d3740761c2c8b44f41bf8efe0723e03f8a650a`，2026-11-13。作品作者 `01a1d0b2-395e-72c2-8518-7e9a0b18ec11`；非作品作者 reviewer `/root/commercial_review`。

**候選驗收 PASS。美術 9.2/10、UI 9.3/10、商業完整度 9.2/10，維持上一輪評分。** 九項候選 gates 均有同 SHA 證據。這不是正式站驗收，部署與最終 ZIP 仍待驗。

依據 [CI.json](CI.json) 與 [results.json](results.json)：[Actions run 43272957275](https://github.com/KYStr/glossquote-visuals/actions/runs/43272957275)，Windows job `131373875460`，artifact `13969476687`。下載 SHA-256 `372edbaaddbaf5fd476ae7778f457424d7f819da1f595e5c77a0c35b93999bd8` 與 CI 記錄一致。

## 本輪確認

- 親讀雙語 1440、390、768 全頁與完成摘要。同 SHA 768 首屏保留左右構圖，圖說位於完整圖寬下方；英文紙材與加工欄位改為全寬，選中值不再截短。三欄商品的規格改為直排，閱讀穩定。
- 親讀 [英文實際下載](paper-en-print-brief.txt) 與 [中文實際下載](paper-zh-print-brief.txt)。禮盒紙品尺寸、腰封／吊牌／小卡組成、棉紙 350 g/m²、印刷＋盲壓、250 sets／250 組、分行交期與未送出訂單文字，均與完成畫面一致。
- 與作者 `88ec74e0da4c4062c065b56c3bf781d504043c89` 比較，紙品雙語 HTML、CSS、JS、shader、共享 runtime、紙品素材、依賴與鎖檔、紙品商業測試無差異。整合未改動紙品顧客流程。
- 總分保留原判斷。平板小改善消除了可見瑕疵，但不以新增技術 PASS 或 Goal 門檻自動增加美術分數。

## 十五子項

| 分類 | 子項 | 分數 /2 | 判斷與同 SHA 證據 |
|---|---|---:|---|
| 美術 | 品牌辨識（brandIdentity） | 1.8 | 弧形壓紋、暖紙色與朱紅貫穿商品、紙樣及表單，維持首輪評價。 [paper-zh-1440-webgpu.png](paper-zh-1440-webgpu.png)、[paper-en-1440-webgpu.png](paper-en-1440-webgpu.png) |
| 美術 | 首屏構圖（heroComposition） | 1.9 | 桌面斜切紙面增加辨識度，文字與紙張曲線有明確主次；390 首屏仍容納完整商品主視覺。 [paper-zh-1440-webgpu-fold.png](paper-zh-1440-webgpu-fold.png)、[paper-en-1440-webgpu-fold.png](paper-en-1440-webgpu-fold.png)、[paper-zh-390-webgpu-fold.png](paper-zh-390-webgpu-fold.png)、[paper-en-390-webgpu-fold.png](paper-en-390-webgpu-fold.png) |
| 美術 | 字體排版（typography） | 1.8 | 英文主標與段落標題字距恢復清楚節奏；中文表單孤立「單。」已消失。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-en-390-webgpu.png](paper-en-390-webgpu.png)、[paper-zh-1440-webgpu.png](paper-zh-1440-webgpu.png)、[paper-zh-Hant-768-still.png](paper-zh-Hant-768-still.png) |
| 美術 | 材質影像（materialImagery） | 1.9 | 新三紙樣能辨識棉紙纖維、平滑卡紙與再生斑點，影像真正支援選材。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-zh-390-webgpu.png](paper-zh-390-webgpu.png) |
| 美術 | 整頁與跨尺寸節奏（pageRhythm） | 1.8 | 同 SHA 桌面與手機維持商品影像、紙樣及訂製表單的段落節奏；768 改回左右首屏，減少上一輪右側留白，商品規格直排且圖說不擠成窄欄。 [paper-en-768-still.png](paper-en-768-still.png)、[paper-zh-Hant-768-still.png](paper-zh-Hant-768-still.png)、[paper-en-390-webgpu.png](paper-en-390-webgpu.png)、[paper-zh-1440-webgpu.png](paper-zh-1440-webgpu.png) |
| UI | 資訊層級（informationHierarchy） | 1.9 | 商品、規格、紙材比較、流程、摘要順序清楚；表單內補上尺寸及組成，減少來回查找。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png) |
| UI | 導航與行動（navigationActions） | 1.8 | 主 CTA、系列入口及頁內導覽清楚，維持首輪評價；同 SHA 測試涵蓋鍵盤進入訂製與各系列入口。 [paper-zh-1440-webgpu.png](paper-zh-1440-webgpu.png)、[paper-en-390-webgpu.png](paper-en-390-webgpu.png)、[results.json](results.json) |
| UI | 表單與狀態（formsStates） | 1.9 | 推薦值、自訂保留、數量單位、錯誤焦點與修改流程均有同 SHA 實際瀏覽器測試證據。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png)、[results.json](results.json) |
| UI | 手機／鍵盤／縮放（responsiveAccessibility） | 1.8 | 390 表單與摘要可讀；768 紙材／加工改為全寬欄位，英文選中值完整。遠端同 SHA 測試通過雙語四寬度、200% 文字、鍵盤焦點、觸控、44px 控制與 reduced motion。 [paper-en-768-still.png](paper-en-768-still.png)、[paper-zh-Hant-768-still.png](paper-zh-Hant-768-still.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png)、[results.json](results.json) |
| UI | 互動回饋與一致性（interactionConsistency） | 1.9 | 系列、表單、摘要及實際下載的尺寸、組成、單位與交期一致；自訂保留提示清楚。原始 CSS 的光角 A/A/B/A 差異顯著超過自然動畫漂移，復位後接近原設定。 [paper-en-1440-brief-complete.png](paper-en-1440-brief-complete.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png)、[paper-en-print-brief.txt](paper-en-print-brief.txt)、[paper-zh-print-brief.txt](paper-zh-print-brief.txt)、[candidate-paper-light-en-composite-a1.png](candidate-paper-light-en-composite-a1.png)、[candidate-paper-light-en-composite-b.png](candidate-paper-light-en-composite-b.png)、[results.json](results.json) |
| 商業 | 定位與價值（positioningValue） | 1.8 | 紙品訂製工作室、三個用途與工藝價值清楚，維持首輪評價。 [paper-zh-1440-webgpu.png](paper-zh-1440-webgpu.png)、[paper-en-1440-webgpu.png](paper-en-1440-webgpu.png) |
| 商業 | 產品決策資訊（decisionInformation） | 1.9 | 三紙材差異、起印量、尺寸、組成及交期支援選擇；本輪親讀雙語下載，250 組／sets、禮盒腰封／吊牌／小卡與示意尺寸均保留。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-en-1440-brief-complete.png](paper-en-1440-brief-complete.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png)、[paper-en-print-brief.txt](paper-en-print-brief.txt)、[paper-zh-print-brief.txt](paper-zh-print-brief.txt) |
| 商業 | 內容信任與真實性（truthfulTrust） | 1.7 | 保留概念網站及不接單說明，沒有虛構客戶背書；仍屬示意品牌資訊，維持首輪評價。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-en-1440-brief-complete.png](paper-en-1440-brief-complete.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png) |
| 商業 | 主要顧客流程（customerJourney） | 1.9 | 從商品或主 CTA 進入，選系列、調整需求、檢查及下載形成完整流程；同 SHA 測試涵蓋雙語操作。 [paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-en-1440-brief-complete.png](paper-en-1440-brief-complete.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png)、[results.json](results.json) |
| 商業 | 完成與錯誤恢復（completionRecovery） | 1.9 | 同 SHA 測試證明錯誤定位、返回修改及自訂保留；親讀雙語實際 TXT 與完成截圖，交期分行且明示尚未送出訂單，完整摘要可攜出頁面。 [paper-en-1440-brief-complete.png](paper-en-1440-brief-complete.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png)、[paper-en-print-brief.txt](paper-en-print-brief.txt)、[paper-zh-print-brief.txt](paper-zh-print-brief.txt)、[results.json](results.json) |

## 九項候選 gates

| Gate | 結果 | 依據 |
|---|---|---|
| visual | PASS | 已目視同 SHA 中英 1440/390/768 全頁、完成摘要與原始 CSS 合成圖；紙品品牌、斜切首屏、三紙樣、版式及平板修正成立。 [paper-zh-1440-webgpu.png](paper-zh-1440-webgpu.png)、[paper-en-1440-webgpu.png](paper-en-1440-webgpu.png)、[paper-zh-390-webgpu.png](paper-zh-390-webgpu.png)、[paper-en-390-webgpu.png](paper-en-390-webgpu.png)、[paper-zh-Hant-768-still.png](paper-zh-Hant-768-still.png)、[paper-en-768-still.png](paper-en-768-still.png) |
| interaction | PASS | paperCommercial PASS：雙語商品預填與建議、自訂保留、尺寸/組成/單位、數量及用途驗證、觸控、鍵盤、修改與實際下載逐字比對。兩份 TXT 已親讀。 [results.json](results.json)、[paper-en-print-brief.txt](paper-en-print-brief.txt)、[paper-zh-print-brief.txt](paper-zh-print-brief.txt)、[paper-en-1440-brief-complete.png](paper-en-1440-brief-complete.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png) |
| shader | PASS | WebGPU 真實初始化及非空 texture，首張 240 色且 GPU errors 為空；雙語原始 CSS 合成控制差異、GPU 讀回及原生暫停對照通過，未以強制 opacity 的獨立輸出取代可見性證據。 [results.json](results.json)、[paper-en-texture-readback.png](paper-en-texture-readback.png)、[candidate-paper-light-en-composite-a1.png](candidate-paper-light-en-composite-a1.png)、[candidate-paper-light-en-composite-b.png](candidate-paper-light-en-composite-b.png)、[candidate-paper-light-en-composite-native-pause.png](candidate-paper-light-en-composite-native-pause.png)、[candidate-paper-light-en-texture-a1.png](candidate-paper-light-en-texture-a1.png)、[candidate-paper-light-en-texture-b.png](candidate-paper-light-en-texture-b.png) |
| lifecycle | PASS | 同 SHA pause/deviceRecovery/visibility/webgpu PASS：三次暫停恢復、無額外 device、hidden/offscreen 停止取 texture、注入 unknown loss 並實際銷毀 device 後重建、離開與返回。 [results.json](results.json)、[CI.json](CI.json) |
| accessibility | PASS | 雙語 320/390/768/1440、200% 文字、鍵盤焦點、觸控、44px 控制、no-JS/no-GPU/reduced-motion 測試通過；抽測最低對比 6.83:1。完整讀屏體驗另列 NOT_RUN。 [results.json](results.json)、[paper-en-768-still.png](paper-en-768-still.png)、[paper-zh-Hant-768-still.png](paper-zh-Hant-768-still.png)、[paper-en-390-webgpu.png](paper-en-390-webgpu.png)、[paper-zh-390-brief-complete.png](paper-zh-390-brief-complete.png) |
| performance | PASS | 單活動 canvas、實測 DPR 1、軟體環境 12.41 次 texture acquisition/s。固定 SHA 的成功 build 包含 checkDist 對每頁（含 lazy chunks）<=2 MiB gzip 的硬性斷言；未聲稱實體 GPU FPS 或不存在的硬性 frame cap。 [results.json](results.json)、[CI.json](CI.json) |
| privacy | PASS | 固定來源 disableTelemetry:true；同 SHA Network/Storage 探針只見同源靜態 GET，無 fetch/XHR/beacon/socket、CSP/runtime/GPU errors、cookies 或 storage。CSP 為 meta，未聲稱 response-header CSP。 [results.json](results.json)、[CI.json](CI.json) |
| seo | PASS | 同 SHA checkDist 在成功 build 中核對雙語 title/description/h1/canonical、互返 alternate、分享圖與資產、candidate noindex/robots/sitemap；候選 HTTP/404 檢查通過。 [CI.json](CI.json)、[results.json](results.json) |
| reproducibility | PASS | 同一 SHA Windows job 成功依序執行 npm ci --ignore-scripts、check、test、build、瀏覽器驗證。CI run/job/artifact 與候選相符，下載摘要核對記錄一致。此 PASS 限候選可重現性，正式部署及最終 ZIP 待驗。 [CI.json](CI.json)、[results.json](results.json) |

## 合成測量判讀

100ms 等量推進、暫停取樣的 A/A/B/A 序列，使用真實 `#light-angle` 的 0→180→0° 控制。原始 canvas 維持 opacity 0.46 與 multiply，沒有以強制不透明畫面宣稱可見性。

| 語言 | 合成自然漂移平均 | 0→180° 差異平均 | 明顯變動像素 /4800 | 回到 0° 後差異平均 |
|---|---:|---:|---:|---:|
| 中文 | 0.00208 | 7.12076 | 1640 | 0.00375 |
| 英文 | 0.00181 | 7.12049 | 1641 | 0.00424 |

GPU texture 的控制差異約 27.44、自然漂移約 0.006；同設定原生暫停的合成差異約 12.73。數值支持控制改變可見光線，非自然動畫造成假陽性。已目視 [A 畫面](candidate-paper-light-en-composite-a1.png)、[B 畫面](candidate-paper-light-en-composite-b.png) 與 [原生暫停](candidate-paper-light-en-composite-native-pause.png)。這些是候選產物，不是 live。

## 限制與證據完整性

- **NOT_RUN：** 實體 GPU、完整讀屏、實際手機發熱／電池、真實轉換率、正式部署與最終交付 ZIP。
- Windows Server 2025 VM、Chromium 158.0.8127.18、WARP compositor、SwiftShader fallback adapter。12.41 是每秒 texture acquisition，不能稱為實體 GPU FPS。
- `results.json` 的 downloads 索引被夜航測試重新初始化，漏列紙品 TXT；兩個紙品實檔存在，且同 SHA 紙品測試包含 saveAs、讀回及逐字比對 PASS。這是索引記錄瑕疵，沒有把它冒充下載測試未執行。
- 現有公開證據沒有每頁精確 gzip bytes 或單元測試總數；只宣告成功 CI 與固定來源硬性斷言支持的結果。
- Reviewer 未撰寫 V001 產品來源／美術素材；曾補強共用合成驗證 helper。工程證據與來源比對另經 `/root/commercial_review/release_gate_audit` 唯讀複核。
- 本輪沒有啟動本機瀏覽器，沒有修改產品來源。`checks.live` 尚不存在，後續正式部署需獨立核對 receipt、同版本頁面與資產。

