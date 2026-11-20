# V011 食刻 UMBRA DIAL

兩個 HTML 入口自帶完整片單、場地規格和手動排程方法。互動提案只用片名、總人數及穹頂規格，資料在頁內計算，下載是本地 UTF-8 TXT。示意首場 09:30，每兩場之間留 15 分鐘。每批 12 人起，試排上限三場，小型穹頂每場 24 人，大型每場 36 人。產生提案後可回表單改條件，下載內容會反映重算後的資料。

初次載入有 10 秒自動週期。選擇初虧、食甚或復圓會切到對應食相，保留低頻日冕變化。暫停期間畫布保留當幀，續播時套用期間選取的新食相。低動態及無 GPU 時，三個控制改用同一套日、月幾何產出的靜態圖。

## 製作驗證

- `npm ci --ignore-scripts --no-audit --no-fund`、`npm run check`、`npm test` 已執行，既有測試 23 項通過。使用現有候選配置指定 V011 雙語入口完成 scoped build。將各頁資產及 GPU lazy chunk 同時計入，繁中 913,810 bytes gzip，英文 806,114 bytes gzip。
- 以 `python src/works/umbra-dial/render-posters.py --samples <目錄>` 離屏編譯及執行正式 WGSL，輸出三張食相與一張獨立社群封面，都是 1200 × 800 WebP。製作環境 wgpu 0.31.0、Pillow 12.0.0、GeForce RTX 3060／Vulkan。以同一組象牙色像素門檻檢視 0、1.5、2.86、3 秒，其數量分別為 121,194、63,261、8,659、5,250，對應大弦月、窄弦月、亮珠及細光環。這組影格由原生離屏畫布產出。
- 兩語 DOM 模擬驗證正常排場、低於下限、非整數、兩種穹頂上下界、場地未確認、保留輸入回改、平均分場及 Blob 內容。最後一組改為大型穹頂 73 人和第三部片，三場為 25、24、24 人。繁中提案 589 bytes，英文 643 bytes。`flow.mjs` 提供隔離瀏覽器驗證所需的 `setMaterial` 與 `testFlow`。
- 繁中在 head preload 此作品的 Noto Sans TC 變動字重子集，沿用 Studio TC 首次排版腳本。WOFF2 為 106,404 bytes，包含繁中 HTML、操作文案及可列印 ASCII 字碼。同版上游原檔 SHA-256 為 `864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f`，子集使用 fontTools 4.63.0。OFL 與字型一併存放。 [Google Fonts 固定字型來源](https://github.com/google/fonts/tree/869789e84da92782c144d83d69b64cec54905b5f/ofl/notosanstc)
- 瀏覽器首屏與排版截圖、鍵盤及觸控實際操作、裝置中斷與恢復、瀏覽器網路／儲存檢查及實際送幀效能為 NOT_RUN，由主責鎖定整合候選後在隔離環境留證。
