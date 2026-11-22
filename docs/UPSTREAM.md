# 官方 Shaders skill 與固定來源

## M06 三件修訂的字型

果時、疊印、摺徑的繁中首屏皆載入各作品的單一同源 Noto Sans TC 子集。三件沿用 M05 記錄的上游固定字型及 OFL。依本次頁面、表單、鍵盤操作提示與動態文案清點，三件分別需要 360、328、365 個字碼，均已逐一核對對應檔案的 cmap。[果時字型](../public/media/sorbet-hour/text-tc.woff2) · [疊印字型](../public/media/afterimage-press/press-tc.woff2) · [摺徑字型](../public/media/foldline/foldline-tc.woff2)

## M06 版頭繪製

果時沿用鎖版 Shaders standalone 及自製 WGSL。盤面、果凍與銀匙的著色結果可在 GPU 紋理中保留，移動時只重畫受影響的區域；停留時仍按表面材質更新細微反光。摺徑以原生 WebGPU 畫出相連的硬折板，水面、船身與最終合成分開繪製，船身保留四倍多重取樣的斜邊。[果時](../src/works/sorbet-hour/pose-cache.js) · [摺徑](../src/works/foldline/gpu.js)

疊印將固定印床、三套墨版和有透明邊緣的刮刀上傳為同源紋理。WebGPU 以同一個刮刀座標決定落墨邊界，並將整張海報畫在同一塊畫布上。[刮印程式](../src/works/afterimage-press/press.wgsl)

## M05 繁中字型與渲染

繁中每頁先載入本件需要的同源字型。字型就緒、請求失敗或達 850 ms 的截止時間時，啟動腳本就讓頁面排版。關閉 JavaScript 時 HTML 會直接顯示。英文沿用各品牌的字體設計。

| 作品 | 中文正文、標題與標記 |
|---|---|
| V007 布邊 | 布樣冊的說明用無襯線，主標與布樣單標題用襯線。兩份變動字重檔各涵蓋本次 404 個字碼。 |
| V008 果時 | 使用這一版果凍禮盒的 359 字無襯線子集。粗黑主標、口味標籤與輔助文字保留原設計的字重和間距。 |
| V009 疊印 | 使用作品的 Press TC 子集。海報的大型英文圖案用 Barlow Condensed，規格標記用 IBM Plex Mono。 |
| V010 摺徑 | 沿用作者的 Foldline 中文子集。英文品牌與型號用 Barlow Condensed，尺寸、載重與刻度用 IBM Plex Mono。漢字由本件的內文字型補足。 |
| V011 食刻 | 沿用作者的無襯線正文，增加涵蓋同一組 402 字碼的襯線主標與節目標題。拉丁刻度使用 IBM Plex Mono。 |

布邊、果時與食刻新增的字型使用 Google Fonts commit `869789e84da92782c144d83d69b64cec54905b5f` 的 Noto Sans TC 與 Noto Serif TC。上游原始 TTF 的 SHA-256 分別為 `864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f`、`0077e18f57c6908f4a000969880940bdb0dad057c0e8d98b49dc364c3d1b09c6`。OFL 與原始版權欄位隨檔保留。[上游固定版本](https://github.com/google/fonts/tree/869789e84da92782c144d83d69b64cec54905b5f/ofl) · [Sans OFL](../public/fonts/studio-text-tc-OFL.txt) · [Serif OFL](../public/fonts/studio-serif-tc-OFL.txt)

每份 `public/fonts/m05-<slug>-unicode.txt` 為該作建置時的完整字碼清單，包含繁中內文、表單與可及性標籤、商品操作文案、標點與可列印 ASCII。使用 fontTools 4.59.2 與 Brotli 1.1.0 搭配對應的上游 TTF 執行以下命令，可重建對應 WOFF2。使用新文案時須重新核對 cmap，全頁動態文字也必須有相應字形。

```sh
python -m fontTools.subset "$SOURCE_TTF" --unicodes-file="$UNICODE_FILE" --flavor=woff2 --no-recalc-timestamp --name-IDs=0,1,2,3,4,5,6,13,14,16,17,25,256,257,258 '--name-languages=*' --output-file="$OUTPUT_WOFF2"
```

V009 疊印與 V011 食刻在固定版 `shaders@4.0.7` standalone 中註冊作品的 WGSL。V010 摺徑則直接以原生 WebGPU mesh 畫出剛性摺板；水面使用獨立的繪製管線，船體摺板以 `depth24plus` 深度緩衝判定前後遮擋，使轉動後的板件能正確交疊。兩條路徑都採單一活動畫布，接受相同的隔離 GPU 取證、實際畫面提交間隔、隱私、暫停、離屏停止、裝置遺失和無 GPU 備援檢查。[摺徑繪製程式](../src/works/foldline/gpu.js)

## M04 繁中字型

M04 繁中作品使用自託管 Noto Sans TC（100–900）及 Noto Serif TC（200–900）變動字重。來源為 [Google Fonts 固定版本](https://github.com/google/fonts/tree/869789e84da92782c144d83d69b64cec54905b5f/ofl)，以三件頁面與操作提示用到的字碼製作 WOFF2 子集。繁中頁的內文、拉丁產品編號及表單控制使用自託管字型，潮間帶和布邊的標題使用襯線字；英文頁延用各品牌原有字體。[Sans 授權](../public/fonts/studio-text-tc-OFL.txt) 和 [Serif 授權](../public/fonts/studio-serif-tc-OFL.txt) 隨站附上。

- Repo: https://github.com/shader-effects-inc/shaders
- 固定 commit: `1f71d113ee17c23d77e95ee46a98c3f4fcbef75a`
- Skill: `.agents/skills/shaders/SKILL.md`（由官方 skill-installer helper 的 download 模式安裝；未執行 upstream CLI）
- Package: `shaders@4.0.7`，npm gitHead 對應上述 commit；實作時 lockfile 固定 integrity。
- Docs: https://shaders.com/docs ，逐個 component 精確查 props，不憑名字猜 API。
- Upstream license: MIT，見 licenses/shaders-MIT.txt。官方編輯器、Pro presets/sections 不當成 MIT 附贈；此作品庫僅自行組合免費元件。

## 經評估的專案例外

官方 skill 建議先 `npx shaders connect`，它會連遠端專案和登入；使用者不需要這些功能。我們直接用 `shaders/js` standalone API，遵循 skill 的層次組合、props、效能與 fallback 方法，保留原 skill 內容，**不執行登入/MCP配置/Pro安裝流程**。

Upstream 預設遙測為開。每次 `createShader(canvas, tree, options)` 必須設第三參數 `disableTelemetry: true`。別把它放進 component props，或只靠 CSP 擋錯誤。`createPreview` 可能遠端取材，首批不用。先檢查固定版 lifecycle/types，包含初始化失敗回傳值、getFailureReason、renderer controls；不要只複製 README 的極簡範例。

Skill 更新是獨立依賴變更，先讀差異/授權與新網路行為，重新驗證再更新 SHA。安裝到專案 `.agents/skills`；新 turn 可發現，若 tool catalog 尚未出現則新對話明確讀這個檔即可，不要求重啟使用者電腦。

## 獨立技術覆核的具體發現

`shaders@4.0.7` standalone `dist/js/bundle.js` 的 npm 原始產物為 2,594,656 bytes，SHA-256 `2f88fd951debc56d84689d7567a1f382ec4d715d36bd1b2faf2c6de6cf32f37c`。npm tar integrity：`sha512-v/EQv2U6TQccRuoWX0D5lhkJsIizigCRVadsavY8olKLwb4uhHFi+JlIREEMYD4pvywjLnwVpMNpTtJgzR/FwQ==`。若經 Vite 重打包，不能要求輸出同 hash；應保留原依賴 integrity 與新 build manifest。

Upstream build 會刪除法律註解；發佈時收集實際 lockfile 所含依賴 license。此版 standalone bundle 內涉及 colorjs.io@0.5.2、typegpu@0.12.3、tinyest@0.3.2、typed-binary@4.3.3（MIT）及 tsover-runtime@0.0.7（Apache-2.0）。不要只複製頂層 LICENSE 就認為所有 bundled code 都有完整 notices。

`onReady` 首個合成畫面後才顯示 canvas；`onError` 也可能表示可恢復 device loss，需看 `getFailureReason()`。重建後可能重新啟動 renderer，因此在新的 onReady 重套現在的 pause 與參數狀態。採 observeElement:false 時自行觀察外容器尺寸/visibility；resize 會寫 canvas inline尺寸，不能以canvas自己尺寸反推容器而循環擴大。pause 停連續動畫，但更新參數/resize仍可能單幀。dispose時destroy晚到的過期初始化，清除自有observer。這些都需要實作測試，不能把技術審查寫成runtime PASS。

固定 source 參考：`packages/js/src/createShader.ts`、`packages/js/src/types.ts`、`packages/core/src/gpu/index.ts`、`packages/core/src/telemetry/`。首批不用 Text/ImageTexture/VideoTexture/WebcamTexture，避免帶出遠端字型/媒體來源。

初始化前先判斷 reduced-motion/hidden/offscreen。createShader 是非同步且會自動啟動，尚未有 instance 時不能用 pause 取消初始化；途中失去資格要 invalidate generation 並 destroy 晚到結果。這可保證不持續渲染，但不應聲稱能完全防止底層在過期初始化完成時短暫啟動。固定版核心 DPR 預設手機1.5/桌機2，API無調整選項；文件中的節能目標不是已達成的性能宣告。

## M03 暫停影格修正

固定版 `pause()` 只停止連續迴圈；使用指標的 Particles 仍會由 mousemove/touch 觸發 `requestRender()`，使暫停或離開視窗後產生單幀更新。`scripts/shaders-csp.mjs` 的建置轉換以完整 SHA-256 鎖定 `dist/core/index.js` 與 `dist/js/createShader.js`，沿用既有 frame lock 關閉連續與待執行的指標影格。新增 `preserveTimeline` 選項保留動畫時間；一般離線 deterministic frame lock 的原本歸零行為維持不變。resume 先解鎖並重設前次影格的時間戳，避免把停頓時長加入 simulation delta。

這是輸出建置的相容修正，沒有改寫 node_modules 或放寬 CSP。原始 npm 檔案雜湊仍保持完整；雜湊改變時建置直接失敗，須重新檢查來源。此修正用於 `npm run build` 的正式與候選輸出；未打包的開發伺服器不作暫停驗收證據。單元測試檢查主／額外動畫時間保留、待執行影格取消、解鎖順序與雜湊失配；實際 GPU 與指標停止行為仍須隔離瀏覽器驗證。

時間保留只適用仍有效的 renderer。GPU device loss 會重新初始化場景／粒子；`createMotion` 在暫停中失去 device 時銷毀失效實例，顯示 fallback，待允許續播後重新建立。這不是跨 device 的時間線或模擬狀態保存。獨立來源覆核確認 pointer gate 有效，並明列此重建界線；續播畫面的視覺連續性仍需實際原始影格評估。

## V005 Particles 深度配色

AERIFORM 的 `particle-depth.mjs` 對固定 Shaders 4.0.7 的 `splatVolume` 動態亮度和色階做建置期處理，分別以粒子在相機前後的 z 和 y 做亮度加權，以粒子位置、速度共同驅動現有暗到亮色階。位置、速度、力場、SDF、投影及緩衝區都沿用官方元件。這是透明粒子加權合成，沒有硬遮擋或深度排序。TypeGPU 同一段 CPU 表達式及 GPU AST 一起更新。原始模組 SHA-256 固定，失配會中止建置，CSP 仍停用 JIT。只在收錄 AERIFORM 的建置開啟。該元件目前只有 V005 使用，未來若新增使用 `Particles` 的作品，須重新審查這個建置期調整的作用範圍。
