# V009 疊印 AFTERIMAGE PRESS · M06

## 重現

- 以正常動態開啟任一語版。首幀是一張固定在印台上的鈷藍校樣。刮刀向下推進，螢橘只留在刃口經過的地方，交疊處呈深紫。3.75 秒行程結束後，畫面停留在印件，僅裸紙反光有極小變化。
- 「重印第二版」可重新演出。原本的雙版／鈷藍／螢橘三態、鍵盤與觸控、估價與下載保持相容。減少動態或無 GPU 時，可手動切換起點與完整印件，也可檢視單色版。
- `shader.js` 與 `press.wgsl` 使用一個裝置像素對齊的不透明 WebGPU 畫布。單一繪製 pass 合成印床、固定定位線、2000 × 1000 無損墨版、木柄刮刀及接觸影。刃口與上墨前緣由同一個 uniform 控制。畫布在暫停、續播與中途重印間維持原節點。暫停取消後續提交，確認已送出的工作完成後才回報 paused。程式沒有在暫停時讀取畫布、重製快照或切換呈現層。
- `bake-art.py` 使用 Pillow、NumPy 與 resvg-py 產生質材、靜態校樣、型錄與 1200 × 800 封面。無損墨版可直接用於靜態校樣。

## 複驗

- `setMaterial(page, state, input)`、`testFlow(page, lang)` 與舊介面相容。原始 GPU 計數及逐像素比較由共享驗收執行。
- `testPrintStroke(page, input, capture)` 維持 before／passing／after／reset 檢查點。中段會暫停並間隔一秒兩次擷取同一畫布，比較 PNG bytes、刮刀位置及可用的 GPU 計數，再續播至完成。每一站檢查畫布節點、紙張與定位框座標。
- 以 wgpu 頭端 CLI 在 RTX 3060／Vulkan 上編譯並渲染實際 WGSL。966 × 484 的印前、印中、印後及兩個單版均不透明，目視檢視刃口、交色邊和印床。中段停止寫入的離屏紋理兩次讀取全等。Node 驗證暫停停送、尾幀完成及續播維持行程。這不是 Windows 瀏覽器合成器或 PERF-1 實測。
- 既有 `scripts/check-source.mjs` 只列出摺徑可使用原生 WebGPU，其餘作品要求呼叫 `initializeStandalone`，因此新 V009 會觸發該來源結構檢查。整合時需由主責將 V009 明列為原生例外並核對直接 WebGPU、opaque canvas、無 fetch、無 telemetry。共享腳本與瀏覽器驗收由主責維護。
