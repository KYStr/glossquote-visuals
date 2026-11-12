# V003 夜航訊號商業候選

設計依據見 [V003 商業 brief](../../../briefs/V003-commercial.md)。這是雙語原創電子音樂活動提案。高雄、2026 年 11 月 21 日、兩種票價與站席安排是本案採用的示意設定。交通連結只提供真實站點的區域參考。第一次選單場票時，節目表的選擇會帶入場次。之後以選票表單的場次為準。下載的 UTF-8 文字檔包含日期、場地、場次、單價、總額及概念提案揭露。

## 視覺與素材

- 海報使用深藍底、奶黃標題和橫跨畫面的振幅線。原創 `night-wave-poster.svg` 保留清晰靜態構圖。WebGPU 依三段節目在同一個 canvas 疊加 Beam 和兩道 SineWave，切換光束方向、振幅與色相。無 GPU 或減少動態時仍切換靜態海報色調。
- `night-venue.webp` 以內建 ImageGen 生成，再裁配為本地 WebP。畫面是空的概念場地，未使用真實藝人肖像或場館影像。
- `night-signal-share.jpg` 及 `night-mark.svg` 由作者以活動色彩與波形製作。原展示圖由作品集既有設定使用。
- Barlow Condensed ExtraBold 於本地提供。授權副本為 `public/fonts/night-barlow-OFL.txt`。字型來自 Google Fonts 固定提交 `89f5431ff0db41bd2fe3f7ba21a723a01622428b`。[字型來源](https://github.com/google/fonts/tree/89f5431ff0db41bd2fe3f7ba21a723a01622428b/ofl/barlowcondensed)
- 交通資訊以官方 C13 站資料及首末班車頁為參考。[高雄輕軌 C13](https://www.krtc.com.tw/KLRT/station_info?n=C13)

場地圖的 ImageGen prompt

> Use case: photorealistic-natural. Website editorial venue image for a fictional independent electronic music night called Night Signal. Wide landscape 3:2 candid interior photograph looking diagonally across a small raw concrete and corrugated-steel waterfront warehouse converted into a listening room, from near floor level. A real-looking waist-high unoccupied DJ booth and compact sound system stand at the far end, rows of industrial black roof trusses, bare concrete with gritty tonal detail. One strong warm acid-yellow light beam diagonally cuts left to right through a light haze, with restrained cold midnight-indigo fill. Sophisticated late-night analog film still, controlled blacks, crisp architecture and visible interior floor, light film grain. Empty room before doors open. No people, no text, no logos, no signage, no collage, no decorative framing.

## 驗證與讀取

- 執行 `npm ci --ignore-scripts --no-audit --no-fund`、`npm run check`、`npm test` 和 `npm run build`。建置同時檢查候選禁止索引、雙語 metadata、CSP 與本地素材。主程式延後載入固定版本 WebGPU 套件。
- 實際瀏覽器驗證由 `Verify visual candidate` 的 GitHub-hosted Windows Server 2025 runner 執行。PR 的 workflow run 連結可下載 `visual-candidate-<SHA>-Windows`。下載後以 `results.json` 的 `commit` 和 PR head SHA 核對版本。
- `signal-*-1440-webgpu.png`、`signal-*-390-webgpu.png` 為全頁。另有首屏、三段節目 canvas 與 `signal-*-selection.png`、`signal-*-complete.png`。另有 `signal-en-320-200-percent.png` 和 `signal-zh-Hant-768-still.png`。JSON 記錄支援 WebGPU 的實際 frame readback、互動及 fallback。
- 測試使用 GitHub-hosted VM 的 D3D11 WARP 軟體渲染。實體手機、GPU 效能、讀屏器人工測試、獨立美術評分及正式站發布驗收交由後續作業。
- 作品集卡片、registry、合併與發布由工作室主責處理。候選的作品集來源錨點仍依現有 registry 解析上一版已發布提交。PR 是這次候選的固定來源。
