# V010 摺徑 FOLDLINE · M07

- 從核准的 `03-Foldline.png` 取水色、銅橘板件、黑色座艙與接觸水線作為方向。冷開頁的手提包以接觸影坐在岩岸，鬆帶後連續展長與翻舷，短橢圓座艙與右後方的軟墊椅背立起。成船可停留、切換三態或重播。
- 主體使用一組固定拓撲及原生 WebGPU 深度測試。內外板件沿各自鉸線活動，材質座標跟著表面走。船身 4× MSAA，水與倒影片層單採樣；倒影以相同艇身幾何對水面鏡射，再由水流扭曲、切碎並合成，並沿水線疊加接觸亮帶。靜止姿態沿用已解析的船身與倒影緩衝。
- 展開時重用索引、頂點緩衝及固定的照片 UV。桌機以 1296 × 579 呈現，4× MSAA 附件裁至 1177 × 442，解析後按原像素坐標合成。接水前不提交倒影網格，船底在入水時沿實際覆蓋輪廓加上暗色浸水帶及斷續波紋。作者比對 21 個桌機及手機取樣，索引幾何與原全幅版本相符。
- 寬螢幕自動展開沿用 4× MSAA，使用較小的中間附件，再以收邊重建合成至原尺寸畫布。停止在指定姿態或首次成船時使用原像素解析，保持攝影材質、折脊和扣帶的細節。
- [湖面](../../public/media/foldline/lake.webp)與[岩岸](../../public/media/foldline/shore.webp)由內建 ImageGen 生成，壓成自託管 WebP。兩張素材只有風景內容。下方是實際使用的生成提示。
- [攝影材質圖](../../public/media/foldline/material.webp)直接從核准原圖取樣，分為側板折脊、甲板、黑色軟墊三區。從 repo 根目錄執行 `python src/works/foldline/extract-material.py <核准原圖>` 可重建。各板件與椅背使用自身 UV，在打開或收摺時隨同一網格移動。兩條束帶所在的板件另帶會隨鬆帶逐步減淡的接觸影。
- `testApprovedHero(page, input, capture)` 提供 `packed → releasing → extending → raising → afloat`。頁面內觀察器在三個即時中段影格提交後啟動原本的暫停控制，等待截圖。重播與恢復使用 mouse 或 touch，既有 flow 與鍵盤介面延續。
- 作者以 Dawn D3D12 實際讀回 1296 × 579 與 358 × 278 紋理，確認所有姿態、1:1 座艙局部及手機全船；在 DOM 模擬取證延遲 1,015 ms，三個中段均保持同一畫面。瀏覽器外層排版以已驗證的舞台尺寸做構圖檢查，正式 Chromium 整頁、真實觸控及幀距由隔離 runner 驗收。
- 執行 `python src/works/foldline/render-art.py` 可更新各態首屏、兩款型錄、攜行圖與封面。加目錄參數可輸出獨立影格。

### 風景素材生成提示

**湖面**

Reference image only: approved FOLDLINE image, take the precise moody teal-green lake photography as visual direction. Generate a new empty deep-forest mountain lake water surface photographed from a kayak product photographer's downward-looking oblique viewpoint, no horizon, no shoreline, no rocks, no boat, no gear, no people, no lettering. Landscape extra-wide composition. Quiet near-black emerald water with naturally irregular vertical pine-tree reflections out of shot over the upper third and left, tiny warm olive highlights, increasingly horizontal broken silky cyan-dark green reflections and gently lapping shallow ripples in the lower and right areas. Keep mid-frame lake fairly restrained and dark so an orange 3D kayak rendered separately will read exceptionally well. Photographic realism, natural unlit black-green depths (not neon), real microtexture, asymmetric distribution of tiny ripple highlights, dappled natural daylight. The full frame must be uninterrupted water with no recognizable reflected product, object, or human silhouettes. No text, watermark, graphics, illustration, flare, or smoky fog.

**岩岸**

Generate a photoreal isolated rocky lakeshore foreground ledge for compositing, transparent cutout background. Reference image is only for natural rock, direction of light and material, NOT the kayak or bag. Wide horizontal still-life low slate and granite shelf photographed downward at oblique 35 degree angle, warm amber sunlight upper left, cool deep forest shadows, natural layered dark weathered slate, muted scrappy olive moss and a few fine pine needles. Broad flat usable top ledge with surface extending all the way to left edge, mostly level across central half, tip tapers toward the right. The top outline has modest cracks but no large stones or vegetation rising above it. Low front edge drops slightly like a rock terrace to the water. Use real mineral roughness and subtle natural color. The ledge occupies lower 65% of image with transparent area above, extends off the left and lower framing edges, irregular right edge, isolated with transparent alpha, no water, no backdrop, no shadows outside the object, absolutely no boat or bag or text.

---

# V010 摺徑 FOLDLINE · M06

- 兩語入口為 `/works/foldline/` 與 `/en/works/foldline/`。初次開頁顯示攜行包。鬆開固定帶後，四塊底板及其相連船舷展長，甲板與椅背升起，約 4.8 秒成船。船身停在成船位置，水面持續微動。可用「重播展開」再看一次，也可直接選「攜行／半展／成船」。
- 板面、椅背、提環、扣具和座艙均使用一組固定拓撲。提環從兩條束帶的錨點立起，放鬆後向側邊放平。兩側硬板沿縱向船底邊線轉動，兩端保持同一組甲板幾何。鏡頭在底板展長時拉遠，讓小包與長船都保有足夠畫面空間。成船後的窄影與水面反光沿著橙紅船底。
- `flow.mjs` 保留 `setMaterial(page, state, input)` 與 `testFlow(page, lang)`。`testHeroInteraction(page, input, capture)` 依序產生 `before`、`after`、`reset`，並回傳重播的逐段時間。`data-assembly-phase` 依序為 `packed` → `releasing` → `extending` → `raising` → `settling` → `complete`，每次重播會增加 `data-assembly-run`。手動半展為 `half`，手動攜行和成船沿用各自的起訖名稱。按已選姿態的 Space 明確切入手動。截圖等到 WebGPU 提交指定姿態及 `data-assembly-view="manual"`。
- 船身使用 4× MSAA 色彩及深度附件，姿態變更才重畫，解析後與獨立的單採樣水面合成。桌機舞台在 DPR 1 以 1296 × 579 原尺寸呈現，水面著色寬度上限 680 像素。作者以無瀏覽器的 Dawn D3D12 實際讀回最終 GPU 紋理，在 1:1 裁圖檢查扣具、斜邊與座艙；另模擬沒有 click 或 input 的 Space、半展與返回，以及六段重播。
- 從 repo 根目錄執行 `python src/works/foldline/render-art.py` 可重建封面、三種姿態的寬窄海報、兩款型錄圖及攜行圖，需要 Node.js、Python、NumPy 與 Pillow。帶輸出目錄參數可另烘焙桌機與手機比例的 0、0.8、1.5、2.25、2.65、3、3.7 和 4.8 秒影格，例如 `python src/works/foldline/render-art.py .runs/m06-foldline-frames`。
- 減少動態或 GPU 不可用時可選用三種靜態姿態並完成選型下載。無 JavaScript 時保留攜行海報、雙語型錄和空白規劃表。動態版暫停保留當前影格，離畫及背景頁面停送幀，首次裝置遺失會嘗試重建。繁中與英語頁的中文切換文字沿用固定版 Noto Sans TC 和本地首排腳本。
- 作者驗證涵蓋 `npm ci`、`npm run check`、`npm test`（26 項）及 `npm run build`。建置輸出回檢計入 lazy chunks 後，繁中 354,220 bytes、英文 244,225 bytes gzip。另檢查 1200 × 800 的 WebP 封面、繁中字形、四種長寬比各 289 個幾何時點，以及無 WebGPU 的雙語 DOM 選擇、載重與下載內容。桌機和手機比例的靜態 160 px 無字影格由作者回看。
- 瀏覽器 WebGPU 首次渲染、畫面提交幀距、真實鍵盤／觸控與下載事件留待隔離環境獨立驗收。
