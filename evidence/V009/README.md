# V009 疊印 AFTERIMAGE PRESS · M07

## 核准稿與製作來源

- 來源為工作室的 `2026-11-22-Key-Visuals/02-Afterimage-Press.png`。原圖 1536 × 1024，SHA-256 `3e05a476275573869051058d8a00f38603b3eb8abf648e4b1b45a975449c399b`。
- 在 repo 根目錄執行 `python src/works/afterimage-press/separate-poster.py <核准原圖>`。需要 Pillow、NumPy、resvg-py。程式從核准稿分離鈷藍與朱紅的墨量、取樣暖素紙底紋，產生 `ink-plates.webp`、三張降級校樣、印床、封面與 AP–01 型錄樣張。`bake-art.py` 則可重做另兩張型錄海報與刮刀材質。
- `press.wgsl` 在原有的單一不透明 WebGPU 畫布上合成兩色。墨量彼此獨立，濕墨邊和受壓彎曲的刃口共用位置，已印好的字與麥克風網罩固定在紙面上。完工後刮刀完全退出，保留完整的 FEEDBACK ASSEMBLY 海報。雙語商流仍可選款式、尺寸、紙色和印量並下載製作單，墨色規格更新為朱紅。

## 複驗

- 正常動態從藍版開啟，朱紅隨刃口約 3.75 秒印完。以「重印第二版」重播，或切換鈷藍／朱紅單版。暫停仍停止 GPU 提交並保留原畫布，無 GPU 與減少動態則使用同一組分版的靜態校樣。
- 保留 `setMaterial`、`testFlow`、`testHeroInteraction`、`testPrintStroke`。`testApprovedHero(page,input,capture)` 另支援 mouse／touch，依序擷取 `blue`、`overprinting`、`composite`、`red`，並在中段使用既有暫停與續播。
- 作者端使用 RTX 3060／Vulkan 的 wgpu CLI 渲染實際 WGSL，檢視 900 × 649 桌機與 350 × 252 手機尺寸。像素比對驗證中段刃口下方未落紅墨，離屏紋理停止寫入時逐位元組全等。實際瀏覽器首屏、互動、逐像素暫停與提交間隔由主責使用隔離瀏覽器驗收。
