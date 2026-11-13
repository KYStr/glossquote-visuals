# V004 PRISM Materials／折光材料室

- 製作設定由主責指派為 gpt-6.1-sol／high，後端模型識別未獨立驗證。
- 首屏左欄以 Archivo Black 大字、單一鈷藍行動與右欄剖面構圖配對。手機把主行動放在試片前面，保留完整輪廓。型錄將表面、厚度、樣板尺寸與使用情境放進可閱讀的 HTML。下載內容從同一組產品規格產生。
- pinned 4.0.7 的 Glass 與 Crystal 都接受 3D shape。其 `shapedSurface` 把形狀傳入面部材質，Glass 使用 `applyGlassEffect` 讀取子圖層，Crystal 也用變形後 UV 從 `childTexture` 取色。本案需要獨立的非平行前後界面、明確的切角平面，以及固定在世界座標的後方格線，所以使用官方 [自訂元件 API](https://shaders.com/docs/guide/custom-shaders) 的 `defineShader`、`wgsl` 和 `registerShader`。仍經共享 standalone 初始化與同一份 CSP。
- 22 個平面求交得出輪廓、窄倒角、入射與出射法線。斜楔厚度約為邊長的一成，是光學示意。三個色頻分別追蹤至同一固定背景，最多計入一次內反射，色散集中在細邊。側面依出射方向取樣同一環境，表面反射依 Fresnel 權重合成。柔霧面以解析式散射展寬透射格線與色帶，直紋面以物件座標改變法線。觀察角以 0° 為預設，三軸往返使用 12 秒 shader 時計。
- 所有玻璃視覺為本作品原創。三種靜態試片和型錄裁切由同一組幾何和折射運算離線生成，`src/works/prism-materials/render-posters.py` 可用 NumPy 2.4.4 和 Pillow 12.0.0 再生。分享圖以清透試片裁切排版。畫廊向量圖、品牌標誌及空間剖面為原創 SVG。
- Archivo Black Regular 與 IBM Plex Mono Regular 字型使用 [Google Fonts 固定來源](https://github.com/google/fonts/tree/0fb1bdc740dd9d495e639a160778db34c28807b7/ofl)，以 SIL OFL 授權，原始授權檔與字型同放 `public/fonts`。瀏覽器從本站讀取兩個字型。中文使用系統字型。
- 候選由 `Verify PRISM candidate` 在 Windows Server 2025 的 GitHub-hosted VM 驗證。相同 SHA 的 artifact 含 Chromium 合成器輸出的 PNG、實際雙語下載與結果 JSON。檔名標示採樣目標，JSON 提供相對導覽與首張動態影格的實際時間，及 GPU 畫布取樣次數。WARP 的合成時間與 shader 時計分開記錄。獨立美術審查、實體 GPU、真機耗能及完整讀屏體驗由各自驗收紀錄判定。
