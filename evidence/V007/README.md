
# V007 布邊 SELVEDGE · M05 作者交接

## 候選入口與控制

- 繁中 `/glossquote-visuals/works/selvedge/`，英文 `/glossquote-visuals/en/works/selvedge/`。作品以已發布版本 `085460a3884d2e826e94b71ef5a3dea74ed05908` 為基線。
- `[data-stage]` 提供 `data-motion`、`data-weave` 及 `data-cycle-seconds="evolving"`。每 6 秒織入一緯並收布一格，下一次改從反側穿入，織紋按實際列索引延續。畫面從苔灰 2/2 斜紋開場。
- `[data-weave-control="plain"]`、`[data-weave-control="twill"]`、`[data-weave-control="satin"]` 依序對應 state 0、1、2。暫停和繼續共用唯一 `[data-pause]`。 `flow.mjs` 匯出 `setMaterial(page, state, input)` 和 `testFlow(page, lang)`。前者核對選取、名稱、品號及靜態素材掛載，後者檢查中英文實際下載及回改流程。

## 首屏與紗線

寬幅特寫約 18 根經線。開場的金色緯線已通過約八根經線，約 1.8 秒到達另一側。梭口依當列的浮沉規則分成兩層，完成後新緯線留在原有組織內，收布時已織交點跟隨布面上移。第 4.1 秒附近接到下一緯。隔離複驗可從 0、0.9、2.2、4.1 與 6–8 秒比對這些位置。

每款使用同一經緯座標。茜紅平紋一上一下、苔灰斜紋浮二沉二逐列移位、暮墨五枚緞紋有四緯長浮帶。連續斜向光澤跟隨斜紋的階梯組織。紗線使用微扁截面、低對比細紗股和交點壓痕，邊緣與纖維頻率隨渲染像素減弱。即時畫布的渲染寬度目標約 528 px，CSS 顯示寬度與放大圖尺寸各自保留。

`src/works/selvedge/render-posters.py` 用 NumPy 和 Pillow 產生自託管素材。 `cover.webp`（1200 × 800）為已織成的斜紋，也用於分享圖。 `plain.webp` 和 `satin.webp` 為另外兩種成品。降低動態、無 JavaScript 和 WebGPU 不可用均保留成品。 `shuttle-start.webp` 只在即時斜紋準備階段可見，接續到同一開場位置。三張放大圖取自相同的 8 根經線與 6 緯。原有商品規格、色號、列印和樣本單輸出流程保留。

## 作者驗證與待驗

- Node 24.14.0 的鎖版 `npm ci`、`npm run check`、`npm test`（23 項）、候選 `npm run build` 與 JS 語法檢查通過。Windows 持久環境指紋一致。
- `python evidence/V007/check-loom.py` 核對三張靜態放大圖共 144 個交點、成品與開場素材尺寸、離線梭線進度、成列後的遮擋，以及收布前後的已織交點。離線影格由 CPU 模型產生。
- 兩語候選與引用素材均以 HTTP 200 讀回。商品卡、樣本單 HTML 和輸出程式逐一比對已發布基線。含延遲載入資源為繁中 1,556,993 bytes、英文 1,158,181 bytes gzip。
- 固定候選的 M04 瀏覽器取證仍為 NOT_RUN。桌機與手機首屏、實際 WebGPU 畫面、連續幀間隔、控制與暫停、隱私與降級路線由主責在隔離環境複驗。
