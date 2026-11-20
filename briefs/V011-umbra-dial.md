# V011 食刻 UMBRA DIAL

為學校與場館提供巡迴穹頂投影體驗。墨黑視野，象牙色日輪、電紫日冕和極簡大段留黑，配戲院票券排程。巨大月影第一幀已切入明亮日輪，前三秒掠過使寬弦月縮為光環並短暫露出亮珠，兩球輪廓、影線、日冕共享明確光源；低頻、無閃爍。手機第一屏同時可讀品牌、服務、選節目按鈕與一輪壯觀的天體遮掩。三鍵是初虧、食甚、復圓，明亮面積位置及形狀有本質不同。詳列三場穹頂片單、各自年齡與片長、場地/設備需求和示意價格；選節目、人數、場地條件，顯示場次/時間與需求，處理容量上下界、回改並匯出去識別化的場館活動提案，絕不暗示已預約。

## 交付與固定驗收

繁中、英文各有真正可用的商業頁與資訊、原生 HTML 全程閱讀、語言互返、canonical、OG、原始碼與畫廊頁尾。製作獨特在地 1200×800 cover.webp、可操作 CTA、精心設計的無 GPU / no JS / reduced-motion 站面。手機 390×844、桌機 1440×900 初次進站不用操作便見主體、品牌、服務、CTA。先比較 0、1.5、3 秒的實際大小形狀位置，肉眼能直接描述變化，光暈或紋理微動不夠。第一視覺與內頁至少兩處使用一致的商品語言。讀 docs/M04-ACCEPTANCE.md、docs/WORKFLOW.md、docs/UPSTREAM.md、專案 AGENTS.md 與 vendored shaders skill。依既有成功的生命週期、色彩／對比、字型啟動方式、效能與 fallback，禁止新 runtime 套件、外部素材請求、telemetry。桌機與手機暖機2秒再量10秒，實際更新間隔 median≤34 ms、P95≤50 ms、max≤150 ms；gzip含lazy≤2MiB。可用低解析精心設計的即時層提升表現；首屏必須以大尺度輪廓而非不可辨的細節變化為主。

介面沿用 V006–008：一個 [data-stage] 標示 data-cycle-seconds，單一活動 canvas，可見 [data-pause] 原生按鈕。完整支援 pause/running/still、頁面隱藏與離畫、裝置遺失；暫停保留當幀。evidence/本件ID/flow.mjs 匯出 setMaterial(page,state,input)（0→1→2→0、鍵盤或觸控）及 testFlow(page,lang)，對實際商業流程的正常、邊界、回改、下載逐項斷言，返回包含檔名、內容及 bytes 的可序列化證據；正常與無 GPU 均能用。作者只修改本件兩語 HTML、src/works/slug、public/media/slug、evidence/ID；共用 registry、gallery、release、CI 由主責處理。用可讀 DOM 和本地素材。作者在指定 clone 提交 source 候選，不自評、不啟新對話或碰本地瀏覽器。
