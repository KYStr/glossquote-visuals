# FORME 物形｜V002 商業網站候選

指派規格見 [V002-commercial.md](../../briefs/V002-commercial.md)。品牌為不鏽鋼家飾概念。商品規格與新臺幣售價為示意，網站的交付規劃需要由承接商家確認。

## 商品與畫面

全寬燭台情境照以炭黑、冷石灰與深青灰定調，品牌主張與主行動疊在畫面左側。系列有折光燭台、凝露花器和雙弧書擋。鏡面亮光與拉絲霧面共有六張對應商品圖，切換時同步更新圖像、商品資料、材質反射和示意單價。唯一 WebGPU 畫布裁在情境照中的鋼環表面，讓兩種反光沿著首屏商品變化。照片提供形體、落影與空間，動態層只改變鋼環的反光。

OpenAI 內建 ImageGen 原創素材提示與用途如下。素材已轉為本地 WebP，另有社群分享 JPG。

- 情境主圖為暖灰灰泥、煙燻木、側面斜射日光和窄邊反射，主體是帶平底座與短象牙色蠟燭的拋光不鏽鋼環。
- 拉絲情境照以上述鏡面照片為編輯參考，只修改鋼環與燭杯的表面處理，保留構圖、商品輪廓、燭火與背景。
- 商品組圖要求同一暖灰檯面、三欄兩列、相同造型和攝影角度。左為環形燭台，中為有窄口和平底的球形花器，右為一對支撐兩本深色書的弧形書擋。上列鏡面、下列拉絲霧面，裁為六張商品照片。
- 工藝近照用定向暖光呈現弧面鋼材的平行拉絲與細亮拋光邊緣。

英文 Geist 從 [固定 Google Fonts 版本](https://github.com/google/fonts/tree/2e5fa2e951237b6ae65f705693d12ca76a7f78c8/ofl/geist) 隨站提供，OFL 文件在字型旁。中文依裝置可用的繁中字型顯示。

## 詢問與材質

可新增、合併同款同表面、修改數量、移除及下載雙語純文字摘要。單列接受 1 到 99 的整數。有無效輸入時，該列小計與總計以破折號呈現，修正後可下載。書擋以組為單位，每組兩件，其他商品以件計。摘要列示材質、尺寸、使用規格、單價、數量、小計與合計。清單合計及摘要皆標示未含運費。清單在該頁記憶體中運作，重新載入或切換語言會清空。無 JavaScript 時仍可展開三款規格、表面價格與保養。

固定 `shaders@4.0.7` 的 [Chrome](https://github.com/shader-effects-inc/shaders/blob/1f71d113ee17c23d77e95ee46a98c3f4fcbef75a/packages/core/src/shaders/Chrome/index.ts) 和 [BrushedMetal](https://github.com/shader-effects-inc/shaders/blob/1f71d113ee17c23d77e95ee46a98c3f4fcbef75a/packages/core/src/shaders/BrushedMetal/index.ts) 共用一張 canvas，只有所選表面繪製。首屏鋼環進入視窗且允許動態時才載入 WebGPU。切換商品表面時會同步切換首屏燭台的底圖及反射；遮罩由兩張對位情境照的鋼環輪廓繪製。無 GPU、減少動態或暫停時顯示目前所選表面的情境照。字型為預期的同源靜態資源，候選瀏覽器測試對其要求固定路徑。

## 取證

既有 Verify visual candidate 工作流程使用 GitHub-hosted Windows Server 2025 與 D3D11 WARP。執行記錄及截圖位於候選提交的 workflow artifact，其中 `results.json` 記錄 SHA、量測與已驗證項目。獨立審查分數、實體 GPU 裝置、讀屏全程及正式上線待主責驗收。
