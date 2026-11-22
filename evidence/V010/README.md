# V010 摺徑 FOLDLINE · M06

- 兩語入口為 `/works/foldline/` 與 `/en/works/foldline/`。初次開頁顯示攜行包。鬆開固定帶後，四塊底板及其相連船舷展長，甲板與椅背升起，約 4.8 秒成船。船身停在成船位置，水面持續微動。可用「重播展開」再看一次，也可直接選「攜行／半展／成船」。
- 板面、椅背、提環、扣具和座艙均使用一組固定拓撲。提環從兩條束帶的錨點立起，放鬆後向側邊放平。兩側硬板沿縱向船底邊線轉動，兩端保持同一組甲板幾何。鏡頭在底板展長時拉遠，讓小包與長船都保有足夠畫面空間。成船後的窄影與水面反光沿著橙紅船底。
- `flow.mjs` 保留 `setMaterial(page, state, input)` 與 `testFlow(page, lang)`。`testHeroInteraction(page, input, capture)` 依序產生 `before`、`after`、`reset`，並回傳重播的逐段時間。`data-assembly-phase` 依序為 `packed` → `releasing` → `extending` → `raising` → `settling` → `complete`，每次重播會增加 `data-assembly-run`。手動半展為 `half`，手動攜行和成船沿用各自的起訖名稱。
- 從 repo 根目錄執行 `python src/works/foldline/render-art.py` 可重建封面、三種姿態的寬窄海報、兩款型錄圖及攜行圖，需要 Node.js、Python、NumPy 與 Pillow。帶輸出目錄參數可另烘焙桌機與手機比例的 0、0.8、1.5、2.25、2.65、3、3.7 和 4.8 秒影格，例如 `python src/works/foldline/render-art.py .runs/m06-foldline-frames`。
- 減少動態或 GPU 不可用時可選用三種靜態姿態並完成選型下載。無 JavaScript 時保留攜行海報、雙語型錄和空白規劃表。動態版暫停保留當前影格，離畫及背景頁面停送幀，首次裝置遺失會嘗試重建。繁中與英語頁的中文切換文字沿用固定版 Noto Sans TC 和本地首排腳本。
- 作者驗證涵蓋 `npm ci`、`npm run check`、`npm test`（26 項）及 `npm run build`。建置輸出回檢計入 lazy chunks 後，繁中 353,610 bytes、英文 243,615 bytes gzip。另檢查 1200 × 800 的 WebP 封面、繁中字形、四種長寬比各 289 個幾何時點，以及無 WebGPU 的雙語 DOM 選擇、載重與下載內容。桌機和手機比例的靜態 160 px 無字影格由作者回看。
- 真實 WebGPU 首次渲染、畫面提交幀距、鍵盤／觸控與瀏覽器實際下載事件留待隔離環境獨立驗收。
