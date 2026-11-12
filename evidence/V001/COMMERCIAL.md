# V001 · 紙與光 / Paper & Light

商業候選採暖白紙面、朱紅和近距離印製攝影。弧形盲壓從品牌標記延伸至首屏、名片和紙樣。正文使用系統 sans，英文字標及展示標題使用 Georgia／Times New Roman，繁中標題使用系統 CJK 字型堆疊。所有素材由網站自行提供。

## 顧客路徑

由「紙品系列」選擇名片、婚禮邀請或禮盒紙品。切換系列時會同步示意尺寸、組成與數量單位。紙材及加工跟隨系列建議，已自訂的選擇會保留並標示。填寫用途後可確認、回編或下載 UTF-8 文字摘要。摘要包含校稿後參考交期，數量超過 200 件或同時印刷與盲壓時各以獨立一行標示另行估算。表單沒有聯絡欄位，下載只使用當頁 Blob，概念站不接單。

## 光線與限制

固定 shaders 4.0.7 組合 LinearGradient、Beam 和 SimplexNoise，將緩慢變化的光疊在棉紙盲壓照片上。指標和觸控改變光線角度，摺疊的控制提供鍵盤等效操作。共用生命週期負責暫停、離開視窗與裝置恢復。減少動態、暫停或無 WebGPU 時，照片保留可調整的 CSS 燈光。有圖像、服務內容及啟用提示的雙語無 JS HTML 由伺服器直接提供。

實體 GPU 的續航、真實商家轉換率與完整讀屏器測試沒有納入作者的遠端測試。候選版沿用共用畫廊及正式歷史來源連結，來源與畫廊資料隨整合版由主責更新。

## 影像來源

內建 ImageGen 生成原創紙品示意影像。以下是生成提示及正式使用檔名。

- `paper-hero.webp`、`paper-commercial-share.jpg`。Product photography for a premium independent stationery studio homepage. Horizontal 3:2, full-bleed close-up with strong 3D scale. One enormous diagonally placed ivory uncoated cotton paper invitation with an elegant blind-debossed graphic of four parallel curved concentric arches, a thick curved fold forming a sculptural soft shadow along the bottom right. A muted brick-red paper insert shows at the lower right edge. Tactile actual paper grain, directional raking warm sunlight from upper left, shadows olive-charcoal. The deboss and fold are centered and still look excellent when center-cropped vertically. Neutral cream and rust, sophisticated Japanese and Taiwanese print editorial product art direction, crisp detail, real photo. No hands, letters, logo, type, decorations or watermark.
- `paper-cards.webp`、`paper-invites.webp`、`paper-gifts.webp`。Premium Paper & Light stationery studio product photography triptych in ONE WIDE 3:1 landscape image, three separate square equal panels of three physically separate arrangements with hard straight seams at exactly one-third and two-thirds and no margins, to be cut into three separate images. Left third top-down small stack of clean ivory textured business cards, blind debossed semicircle and restrained rust mark, warm sand tabletop. Center third cream wedding folded invitation and rust envelope with warm ivory insert and delicate type-like markings, on dusty pink clay table. Right third pale recycled paper rigid gift box, warm ivory printed band and brick red paper hangtag on brown-grey table. Consistent sunlit studio photographs with gentle raking shadows and tactile paper surface. Each subject centered well inside its square panel. Full object silhouettes. No legible typography or logos, no border, no watermark.
- `paper-stock-cotton.webp`、`paper-stock-smooth.webp`、`paper-stock-recycled.webp`。Product-mockup photograph for a bespoke stationery studio's paper selection guide, one wide 3:2 comparison plate. EXACTLY THREE equal vertical photographic panels, crisp straight boundaries at exactly one-third and two-thirds for later cropping, no gutters. Across all three use the same deep terracotta matte tabletop, fixed scale and direction of raking studio light. In each panel show just ONE angled thick paper stock sample occupying most of the image, with its near lower diagonal edge, corner, shadow and surface clearly visible. LEFT panel: ivory cotton 350gsm, soft felted matte weave of cotton fiber, one crisp sculptural blind-debossed curved arc, straight clean-cut slightly fibrous edge. CENTER panel: warm white 300gsm print stock, distinctly extremely smooth, even eggshell surface with no visible fibers, crisp very straight sharp square guillotine-cut corner and edge, one thin printed terracotta ink line to show fine ink definition. RIGHT panel: gray brown oatmeal 300gsm recycled stock, visibly darker, distinctly mottled speckled surface with many small darker recycled fiber flecks and inclusions, clean straight cut but exposed compressed paper fibers on the edge, no emboss. The three different materials should be distinguishable immediately even at a small thumbnail. Clean sophisticated macro editorial print-studio product photography. No deckled torn edges, no overlapping stacks, no hands, no typography, no watermark.
