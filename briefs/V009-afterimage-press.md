# V009 疊印 AFTERIMAGE PRESS

獨立樂團、展演與唱片行的限量海報印務。首屏就是一張巨大演出海報，鈷藍與螢橘兩層大圖像從相錯三分之一張的起點迎面套準，交疊生第三色。首幀已有套色交界。整版銳利紙邊、誇張窄體、明確日期和作品名。手機先讀印刷品牌/第一行動與大圖。三鍵分別顯示藍版、橘版、雙版，單色版具有完整獨立圖案。GPU 共享兩塊版的幾何與透明套色運算，網點控制尺寸防摩爾紋。下方以三個真實感演出海報圖案及印件規格組成案例牆。讓樂團選圖案、A3/A2、印量與紙色，顯示尺寸、數量、估價和交期，回改後下載兩語印件製作單；註明為概念印務。

## 交付與固定驗收

繁中、英文各有真正可用的商業頁與資訊、原生 HTML 全程閱讀、語言互返、canonical、OG、原始碼與畫廊頁尾。製作獨特在地 1200×800 cover.webp、可操作 CTA、精心設計的無 GPU / no JS / reduced-motion 站面。手機 390×844、桌機 1440×900 初次進站不用操作便見主體、品牌、服務、CTA。先比較 0、1.5、3 秒的實際大小形狀位置，肉眼能直接描述變化，光暈或紋理微動不夠。第一視覺與內頁至少兩處使用一致的商品語言。讀 docs/M04-ACCEPTANCE.md、docs/WORKFLOW.md、docs/UPSTREAM.md、專案 AGENTS.md 與 vendored shaders skill。依既有成功的生命週期、色彩／對比、字型啟動方式、效能與 fallback，禁止新 runtime 套件、外部素材請求、telemetry。桌機與手機暖機2秒再量10秒，實際更新間隔 median≤34 ms、P95≤50 ms、max≤150 ms；gzip含lazy≤2MiB。可用低解析精心設計的即時層提升表現；首屏必須以大尺度輪廓而非不可辨的細節變化為主。

介面沿用 V006–008：一個 [data-stage] 標示 data-cycle-seconds，單一活動 canvas，可見 [data-pause] 原生按鈕。完整支援 pause/running/still、頁面隱藏與離畫、裝置遺失；暫停保留當幀。evidence/本件ID/flow.mjs 匯出 setMaterial(page,state,input)（0→1→2→0、鍵盤或觸控）及 testFlow(page,lang)，對實際商業流程的正常、邊界、回改、下載逐項斷言，返回包含檔名、內容及 bytes 的可序列化證據；正常與無 GPU 均能用。作者只修改本件兩語 HTML、src/works/slug、public/media/slug、evidence/ID；共用 registry、gallery、release、CI 由主責處理。用可讀 DOM 和本地素材。作者在指定 clone 提交 source 候選，不自評、不啟新對話或碰本地瀏覽器。
