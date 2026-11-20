# V009 疊印 AFTERIMAGE PRESS

## 來源

- 兩語頁面位於 `works/afterimage-press/` 和 `en/works/afterimage-press/`。限量海報與活動為虛構案例。
- `press.wgsl` 在同一個 WebGPU 繪製中使用兩份印版遮罩與四區油墨覆蓋率。8 秒週期，從 34.6% 版寬的相對錯位起步，約 1.2 秒套準，留在對位區間至約 3.4 秒，再緩慢退開。墨色依靜態校樣的 sRGB 值合成，再轉線性 RGB 交給 WebGPU 呈現。切版順序是雙版、鈷藍、螢橘。
- `bake-art.py` 使用 Pillow 與 NumPy，在 repo root 產生網頁靜態校樣、三款海報與 1200 × 800 封面。圖案及字排為本件製作。校樣沿用 GPU 的版面座標和油墨色階。
- 繁中以本件 WOFF2 及 850 ms 上限的首次排版載入方式處理。字型來自 Google Fonts 固定版本 `869789e84da92782c144d83d69b64cec54905b5f` 的 Noto Sans TC 變動字型，涵蓋繁中 HTML、執行期字串及 ASCII。OFL 隨檔。拉丁海報字沿用 repo 內的 Barlow Condensed，規格標記使用 IBM Plex Mono。
- `flow.mjs` 提供候選審查器的色版控制和商業流程介面。計價測試涵蓋 25、150、151、250 張、空白、超出範圍及小數，並核對回改後的 UTF-8 製作單。

## 作者檢查

- `npm ci --ignore-scripts --no-audit --no-fund`、`npm run check`、`npm test`（23 項）及兩語 scoped Vite build 完成。Scoped build 使用專案 Vite 設定與 Shaders CSP 轉換，只覆寫 HTML inputs 和輸出位置。
- 兩語輸出檔案與站內素材引用均可解析。計入 lazy shader、雙色備用校樣及三張案例的 gzip 合計約繁中 1.18 MiB、英文 1.10 MiB。封面尺寸與繁中字型碼位覆蓋已檢查。
- 390 × 195 靜態版形模型以相同的位移曲線產生 0、0.4、0.8、1.5、3 秒校樣。距深紫基準色的 RGB 向量差小於 38 的像素覆蓋率從 4.1% 擴大至約 15–16%。
- 瀏覽器操作、實際 GPU 影格與效能、裝置遺失和版面、無 GPU 及 no-JS 情境的畫面驗收交由主責在隔離 Windows 環境執行。作者端未啟動瀏覽器。
