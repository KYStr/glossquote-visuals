# 官方 Shaders skill 與固定來源

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
