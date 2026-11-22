# 果時 JELLY HOUR｜M06 銀匙試吃

候選分支從正式基線 `8206c4a55e8be0faee2ff4b265878d4da75445f7` 建立。中英文入口仍為 `/glossquote-visuals/works/sorbet-hour/` 與 `/glossquote-visuals/en/works/sorbet-hour/`。三款口味、六杯配盒與離線配方沿用現有接口。

## 重現

- 正常動態冷開先見完整果凍。銀匙斜向入鏡、按壓上緣、匙碗部分切入並由果凍遮住，最後托著與缺口配對的一口抬起。3.65 秒停在展示姿態，餘下只有很輕的果凍反光。
- 可在首播中點按或拖曳果凍來選另一個切點。鍵盤聚焦 `[data-scoop-hit]` 後用左右鍵選位置，再按 Enter。`[data-scoop-replay]` 重播所選位置，`[data-scoop-reset]` 恢復完整，`[data-pause]` 凍結當前幀。換口味回到完整姿態。減少動態和無 WebGPU 可切換相同構圖的靜態成品與銀匙尾幀。
- `flow.mjs` 保留 `setMaterial`、`testFlow`、`testHeroInteraction(page, input, capture)`。後者以 `data-bite-run`、`data-bite-phase`、`data-bite-elapsed` 鎖定新序列，保留 `before`、`after`、`reset`。中段凍結在 `cut` 取證，支援選用的 `capture.mid("cut", observation)` 或宣告 `capture.checkpoints` 包含 `mid` 的主程式。回傳值另含 `mid.pngBase64` 及另一切點尾幀 `alternate.pngBase64`，可與現有三點 runner 共用。
- 以 Python 3.12、wgpu 0.31.0、Pillow 12.0.0 執行 `python src/works/sorbet-hour/render-posters.py --samples .runs/v008-m06-frames`，可重現 1200×800 關鍵影格。加 `--assets` 會更新本作三張海報及九張靜態尾幀。未用外部影像或材質。繁中字型以工作室既有的 Noto Sans TC 原檔製作本版私有 WOFF2，保留上版字符並補入新介面所需的「匙、對、應、托、查、滋、起、銀」。沿用倉庫的 `public/fonts/studio-text-tc-OFL.txt` 授權。

## M06 原尺寸收邊

a9b6ee5 的桌面舞台約 768 px 寬，實際緩衝只有 288×192，匙沿、切口及盤紋放大後出現明顯階梯。新候選在 DPR 1 的桌機使用 576×384、390 px 版面使用 403×269。中心光線先判斷輪廓、切削交界與遮擋邊緣，附近才補三條次像素光線。匙柄維持連續覆蓋值，盤紋按像素足跡整合。實際 GPU 在整段演出和停住後持續使用相同幾何與著色。中央切點向前移 0.039 場景單位，露出較寬的琥珀色內壁，匙上的一口由同一體積截出。

在原工作目錄用同一 WGSL 產生實際緩衝影格與桌面／手機顯示尺寸的副本。切入中段見 `bite-1.78-display.png`，抬升見 `bite-2.35-display.png`，停住見 `bite-3.65-display.png`。

```powershell
python src/works/sorbet-hour/render-posters.py --samples .runs/v008-m06-finish-desktop --backing 576 384 --display 768 512
python src/works/sorbet-hour/render-posters.py --samples .runs/v008-m06-finish-mobile --backing 403 269 --display 351 234
```

作者在兩個顯示尺寸逐一裁切檢視匙碗暗緣、中央缺口、盤沿與切入時的遮擋。Microsoft Basic Render Driver 原生 D3D12 驗證各取 100 筆繪製提交至完成，使用實際緩衝尺寸。桌面 p95 為 2.81–4.96 ms，手機 2.93–4.15 ms。這些數值供估算本地負載，瀏覽器呈現間隔與 ART-1 收邊仍待獨立驗收。

## 作者核對

原生 RTX 3060 Vulkan 影格檢視了 160 px 無字輪廓，以及原尺寸的匙碗和果膠接縫。銀匙頂面與下方厚度分開著色，匙柄有連續冷灰暗緣，尾幀仍可辨認承載關係。上緣受壓及切口使用同一切入點，抽出的果凍與匙碗共用抬升位移，瓷盤與畫面座標固定。鎖版安裝、來源檢查、26 項單元測試、雙語建置，以及無 GPU 的 DOM、配方 Blob、時間線凍結與重設測試已通過。未使用本機瀏覽器，實際瀏覽器 M04 十四條及 M06 六項美術觀察待主責判定。

---

# 果時 JELLY HOUR｜M05 作者交接

作品入口維持 `/glossquote-visuals/works/sorbet-hour/` 和 `/glossquote-visuals/en/works/sorbet-hour/`。變更從發布基線 `085460a3884d2e826e94b71ef5a3dea74ed05908` 製作。果時英文品牌改為 Jelly Hour。共享畫廊、catalog、registry 和發布檔案由主責處理。

## 首屏和配盒操作

- `[data-stage]` 初次啟動播放一次落下、壓縮、回彈與收斂。約 1.21 秒後只保留緩慢反光，`data-cycle-seconds="evolving"`。暫停控制沿用 `[data-pause]`。
- `[data-scoop-hit]` 接受滑鼠點擊、拖曳、觸控及鍵盤方向鍵加 Enter。左肩、上緣中央與右肩都可挖取一勺。舞台以 `data-hero-state`、`data-scoop-position` 和 `data-scoop-visual` 表示狀態與到位位置，`[data-scoop-reset]` 還原。
- 同一個球形勺口從主體扣除，並與原模具取交集生成獨立的一勺。三個位置都切穿模具輪廓，凹面有陰影和受光邊。挖出的模具片保持原姿態，在盤上接地。
- 降低動態、手動暫停後操作或即時 GPU 不可用時，可用同構圖 WebP 挖取與重設。無 JS 仍顯示海報、成分、過敏原及 `#blank-recipe`。
- 三款果凍沿用六杯、600 毫升的離線禮盒。測試匯出 `jelly-hour-recipe-{zh-Hant|en}.txt`，含實際選擇、柑橘果膠、過敏原與冷藏保存說明。

## 驗收入口

`flow.mjs` 匯出 `setMaterial(page, state, input)`、`testFlow(page, lang)` 和 `testHeroInteraction(page, input, capture)`。試吃口味狀態為 0／1／2（蜜柑／覆盆莓／白芭樂）。首屏測試支援 `keyboard`、`touch`、`mouse`，依序呼叫 `capture("before")`、`capture("after")` 和 `capture("reset")`，回傳可序列化的形狀、位置、材質、動態和圖說。

三種完整模型與九種挖取狀態採作品原創 WGSL，無外部素材。可用 Python 3.12、wgpu 0.31.0、Pillow 12.0.0 執行 `src/works/sorbet-hour/render-posters.py --assets --samples .runs/v008-m05-frames`，重現海報與原生落下、壓縮、反彈、靜止、挖取及重設取樣。

## 作者驗證與待驗

- 鎖版安裝、來源檢查、23 項單元測試和兩語候選建置完成。Vite 的既有字型資產警告保留，建置檢查確認輸出路徑可用。
- 無 GPU 的 DOM 模擬驗證兩語三種輸入及重設、單一缺口狀態、配滿六杯後拒絕第七杯、減一再配及讀回 3／1／2 杯的配方 Blob。
- RTX 3060 Vulkan 原生取樣確認三款模具、三處打破外輪廓的缺口與分離的一勺。0.34 秒壓扁、0.57 秒回彈，1.21 秒與 3 秒的蜜柑輪廓範圍相同。原生 D3D12 軟體轉譯於 1120×746 目標的完整／挖取狀態，100 幀的 median 為 4.72／4.48 ms，p95 為 5.23／5.15 ms。此計時為單一原生 render pass 提交到完成。
- 網頁瀏覽器的發布首屏前三秒、畫面合成、真實輸入及下載、生命週期和 PERF-1 仍待獨立驗收。

## M05 效能複測候選

冷啟動先給 Shaders 已受限的元素尺寸，首幀就緒後再讓 canvas 鋪滿舞台。桌面 backing 封頂約 392×261，手機隨舞台縮小。裝置重建前撤除顯示尺寸覆寫，重新套用相同像素預算。靜止時略過形變，背景遠離接觸影的像素略過陰影運算，挖口內壁先於高光計算輸出。

同一原生 Microsoft Basic Render Driver（D3D12）以 20 幀暖機、100 幀提交流程取樣。完整果凍由 760×507 目標的 2.334／2.976 ms 降至 392×261 的 0.856／1.029 ms（median／p95）。挖取版同尺寸對照由 2.298／2.556 ms 降至 0.811／0.922 ms。這是原生單一繪製工作完成的時間。瀏覽器的 34／50 ms 門檻待原環境複測。

落下時壓縮峰維持約 90 ms，模型高度降至 70%、寬度增至約 116%，以原底面為錨點，約 1.21 秒收斂。392 px 原生影格已檢視落下、壓縮、回彈、穩定、三處缺口與重設。繁中頁以本地字型切換顯示，靜態產物直接提供 `lang="zh-Hant"`、正文、成分和配方，無整頁遮蔽腳本。

## M05 第二次效能與暫停修訂

候選 f13860b 的兩語桌面原始 768×513 PNG 中，暫停當下與一秒後只有相同 136 個像素有差，座標 x19–748、y1–79，RGB 差值也完全一致，單通道最多差 4。差異沿著舊舞台上弧，果凍與瓷盤內部未變。改用直邊舞台解除這個圓弧抗鋸齒的變因，暫停仍凍結原動態畫布。實際瀏覽器複測待主責。

最大 backing 降至 288×192，較 392×261 少約 46% 像素。靜止姿態略過光線座標的形變逆轉換、溝紋方向改用等價三角恆等式，且桌面遠離盤與陰影的片段直接返回。1200×800 同尺寸前後著色對照的完整與三處缺口影格，最大單通道差 1。288×192 取樣放大至桌面後，仍可分辨瓷盤、三處凹口及分離的一勺，輪廓邊緣較軟。

同一 D3D12 原生軟體轉譯測試的完整狀態 p95 從 1.176 ms 降至 0.917 ms，挖取狀態從 1.182 ms 降至 0.836 ms。瀏覽器實際呈現間隔另測。已撤除頁面 CSS 的舊「Jelly Hour TC」字型覆寫，繁中專用字型與 startup 由主責整合。

# M04 歷史作者交接

- 候選入口為 `/glossquote-visuals/works/sorbet-hour/` 和 `/glossquote-visuals/en/works/sorbet-hour/`。沿用 M04 registry 的 V008 記錄。測試時暫加本機 catalog 條目，其 `image` 為 `media/sorbet-hour/cover.webp`，`width` 為 1200、`height` 為 800。中英文 title 分別為「果時 SORBET HOUR」與「Sorbet Hour」。條目由主責整合。
- `flow.mjs` 的 `testFlow(page, lang)` 預期已載入、杯數歸零且可接收下載的頁面，`lang` 為 `zh-Hant` 或 `en`。回傳每一步的杯數與配方原文。可在 GPU 初始化失敗模式重跑。
- `setMaterial(page, state, input)` 使用原生 radio 的方向鍵或實際 tap，觸控 context 需啟用 `hasTouch`。三個狀態 `0/1/2` 依序為蜜柑、覆盆莓、白芭樂。
- 舞台 `[data-stage]` 含 `data-motion`、`data-material` 與 `data-cycle-seconds="8"`。控制為 `[name=sorbet-flavor]`、`[data-pause]`、`[data-add]`、`[data-remove]`、`[data-download]`。無 JS 的空白配方在 `#blank-recipe`，列印樣式以這張表為輸出。

## 素材與取樣

三張 1200×800 WebP 是作品原創程式生成，無外部圖庫、字型或模型素材。蜜柑海報是首屏與 OG 圖；另兩張用於切換後的靜態切面與品項卡。原始材質為 `src/works/sorbet-hour/sorbet.wgsl`，由同目錄 `render-posters.py` 使用 Python 3.12、wgpu 0.31.0 與 Pillow 12.0.0 離線渲染。可加 `--samples .runs/v008-native` 取得蜜柑 0、2、4、6、8 秒取樣。

弧線距離控制凹深及法線，右端沿弧線延伸與收回，左端保持淺槽。外弧的高冰脊、撕裂面和接觸陰影共用距離與受推側遮罩。蜜柑果肉、莓果籽與芭樂冰晶採不同尺度，表面的光線和顆粒法線沿用基底切面。紙杯口沿遮罩保留同一構圖。

## 作者驗證

- Windows，Node 24.14.0、npm 11.9.0。鎖版 `npm ci`、`npm run check`、`npm test`（20 項）、含兩語 V008 的 `npm run build` 已完成。含 lazy chunks 的建置測量為繁中 1,185,145 bytes、英文 1,184,892 bytes gzip。建置驗證包含 reciprocal metadata、OG 資產、本機路徑、CSP 及 bundle 遙測停用。Vite 對共享 Shaders chunk 發出未壓縮大小提示。
- GPU 離線渲染使用 NVIDIA GeForce RTX 3060、Vulkan、驅動 610.88。同一 WGSL 在 0、2、4、6、8 秒取樣，2／4／6 秒相對首幀有像素差異，8 秒回到首幀。作者檢視 320 px 縮圖，紙杯口沿、左淺右深和三種顆粒的色形差異可辨。
- DOM 模擬對兩語載入無 GPU 模式，驗證零杯、零杯移除、五杯、滿六杯、拒絕第七杯、移除和重配。以產生的 Blob 讀回 3／1／2 杯、600 毫升及成分、過敏原、保存說明。另檢查純 HTML 的成分、份量和空白配方。

## PERF-1 修訂

舞台仍用原始三張海報鋪滿。透明 WebGPU 畫布聚焦刮痕右端約 51% × 51% 的區域，保留該區的原始像素密度。WGSL 先排除離刮痕較遠或落在冰體外的像素，也只在有果粒時評估其面光。紙杯、背景與切面其餘區域沿用原海報。兩語已宣告同源品牌圖示，並保留畫廊與原始碼連結。

以 `render-posters.py --inspect-patch .runs/v008-patch` 可重建局部畫布覆在原海報的三款合成，以及對照的全畫面影格。1200 × 800 蜜柑合成中，1、2、3 秒相對 0 秒分別有 31,543、44,724、51,197 像素至少一個 RGB 通道改變超過 5/255。8 秒回到首幀。作者檢視 320 px 合成縮圖確認冰脊、果粒和紙杯口沿。

原生 D3D12 Microsoft Basic Render Driver（軟體轉譯，10.0.26100.9818），以 wgpu 提交單一 render pass 並等待 GPU 工作完成，暖機 20 幀後收集 100 筆，期間無繪圖讀回。此數據量的是原生 WGSL 工作完成，瀏覽器呈現提交間隔待主責用原驗收方式重測。

| 原生目標 | 改前 median / p95 / max | 改後 median / p95 / max |
| --- | --- | --- |
| 1536 × 1024 → 783 × 522 | 6.881 / 7.180 / 7.447 ms | 1.766 / 1.947 / 2.280 ms |
| 546 × 364 → 278 × 186 | 1.173 / 1.311 / 1.468 ms | 0.463 / 0.517 / 0.585 ms |

## 待主責驗收

NOT_RUN 的瀏覽器項目包括實際下載事件、鍵盤與觸控操作、首屏與縮放、無 JS 列印、降低動態、隔離 WebGPU 初始化與畫面、暫停、裝置復原、更新間隔、網路與儲存檢查。作者驗證留作輔助證據。
