# 作品驗收矩陣

固定 candidate SHA、作者、reviewer、環境、日期與證據路徑。尚未進行寫 NOT_RUN，不得沿用不同 commit 的完整通過。

M02 商業網站依使用者 Goal 加上美術、UI、商業完整度三項評分，每件每項嚴格 >9/10。詳見 docs/M02-ART-DIRECTION.md 的固定子項；每個子項需畫面或流程證據，缺證據標 NOT_RUN，主觀評分不可替代以下必要技術 gates。

| 面向 | 必要檢查 |
|---|---|
| 視覺個性 | desktop/mobile 真實 render；與前件在構圖、字體、材質/色彩、動態至少三項不同；不是範例預設換標題 |
| 內容與互動 | 完整敘事、實際可用控制、不含假商業聲明；非 canvas 文字；觸控可替代 hover |
| Shader | 支援 WebGPU 的隔離環境真實初始化、非空畫面、無 validation/runtime errors；不是以 CSS 圖代替 shader PASS |
| 生命週期 | 初始化成功/失敗、無 GPU、device loss、暫停/繼續、連續切換、頁面離開/回返、hidden/offscreen 停止與清理 |
| 可及性 | 320/390/768/1440 寬，200% text zoom，鍵盤/焦點、對比、44px主要控制；reduced-motion 預設靜止且不偷開 GPU |
| 效能 | 測量實際畫面/裝置；每頁最多 1 活動 canvas；以有效DPR≤1.5、30fps作節能設計目標，但固定版 public createShader 沒有 rendererSettings/fps/DPR cap 選項，不能傳無效參數假裝限制。先用公開 resize/pause 與畫布尺寸管理，記錄實測差異與接受理由；需要硬性 frame cap 時先審查 adapter。初始傳輸目標≤2MiB gzip、超標需有測量與理由；不要發明 fps 測試 |
| 隱私安全 | disableTelemetry:true；無第三方 runtime fetch、beacon/WebSocket、remote fonts、未宣告 storage；正式 CSP 與 Network/Storage 檢查含同源請求。Pages 可用經驗證的 meta CSP，清楚記錄其限制，不能聲稱有不存在的 response headers |
| 雙語 SEO | 伺服器可讀 HTML、每語獨立 title/description/h1/canonical、zh-Hant/en/x-default 互返、sitemap/robots、真實分享圖/描述、不得索引未發布預覽 |
| 可重現與發布 | lockfile clean install、check/test/build、固定 source SHA、PR、獨立 review、實際 live GET、資產/相對路徑/404、gallery backlink、單 ZIP完整性 |

持續動畫是本作品的主體，需有可見且鍵盤可用的暫停控制。減少動態模式下以精心設計的靜態材質呈現，不能只留下空白色塊或報錯。初始化 rejection/async dispose 競態需有單元測試；真機發熱/電池、讀屏完整體驗可以明列 manual NOT_RUN，但必要 shader render/操作不能用 build 取代。

測試不能影響使用者。沒有證明隔離的瀏覽器時標 NOT_RUN_USER_FOCUS_BOUNDARY，保留 candidate。不能為完成而開桌面視窗或本地 hidden/IAB互動。
