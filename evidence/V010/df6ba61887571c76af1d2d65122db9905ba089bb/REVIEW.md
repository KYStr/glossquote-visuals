# V010 固定候選驗收

候選 df6ba61887571c76af1d2d65122db9905ba089bb。主責 GlossQuote Visuals 工作室主責（獨立於原製作對話）。製作 01a1fa4c-f093-7943-9078-154c5d03d14f。

[隔離環境與來源](CI.json) · [逐條原始證據](acceptance.json) · [Actions run](https://github.com/KYStr/glossquote-visuals/actions/runs/45002487345)

<a id="art-1-pass"></a>

## ART-1　PASS

橘色摺板包及束帶在岩岸上，背後為深青湖面。中英標題、摺疊艇供應項目和配置入口在桌機、手機首屏可辨。

<a id="art-2-pass"></a>

## ART-2　PASS

提把鬆下後，相連板件張開成折尺狀，中段艏艉與側舷仍未閉合；之後側舷翻起、黑色椅背立起，最終整艇停在水面。

<a id="art-3-pass"></a>

## ART-3　PASS

深青湖面、銅橘折板與橫向船體有別於其餘兩件。配備型錄以收折與展開兩種尺幅展示艇型，延續相同扣具與黑座艙。

<a id="gpu-1-pass"></a>

## GPU-1　PASS

中英桌機與手機尺寸皆有單一有效 WebGPU 畫布。原始紋理與合成畫面隨動作改變，檢查使用 Windows 隔離 Chromium 軟體繪圖。

<a id="gpu-2-pass"></a>

## GPU-2　PASS

以鍵盤與觸控切換狀態並返回，暫停後畫面在至少一秒內保持一致，續播後會繼續。另以實際滑鼠和觸控輸入完成本件的操作序列。

<a id="perf-1-pass"></a>

## PERF-1　PASS

暖機後量十秒實際提交間隔。以下依序是中位數／p95／最長毫秒。zh-Hant-desktop 28.3/49.4/129.5、zh-Hant-mobile 19.3/29.8/34.4、en-desktop 26.4/39.4/98.2、en-mobile 20.1/21.2/32.4。

<a id="perf-2-pass"></a>

## PERF-2　PASS

兩語首載含延遲載入的壓縮大小最多 893801 bytes。離屏與隱藏時停止提交，返回仍為單一實例。

<a id="ui-1-pass"></a>

## UI-1　PASS

檢視中英 320、390、768、1440 寬與桌面 200% 放大的實際版型。標題、主要行動、商品控制和結果均可讀，未見水平溢出。

<a id="ui-2-pass"></a>

## UI-2　PASS

檢視操作焦點及 DOM／合成文字對比。兩語五種版型的啟用控制熱區均至少 44×44 CSS px，觸控可完成操作與下載。

<a id="biz-1-pass"></a>

## BIZ-1　PASS

Solo 330/Tandem 370, 110/205 kg, 90 × 36 × 30 / 106 × 41 × 34 cm packed, NT$28,800/36,800. Both languages state intended paddlers, routes and illustrative terms.

<a id="biz-2-pass"></a>

## BIZ-2　PASS

兩語切換船型、套件與配件，測試回改及受限選項，組合清單與下載內容一致。

<a id="fall-1-pass"></a>

## FALL-1　PASS

逐一檢視無 JavaScript、GPU 初始化失敗和減少動態的首屏。產品與下一步可辨，減少動態預設靜止，GPU 不可用時仍可完成商流。

<a id="fall-2-pass"></a>

## FALL-2　PASS

快速暫停／恢復、模擬裝置遺失及離頁回返後仍有可讀產品與正常控制，沒有空白頁或未處理例外。

<a id="ship-1-pass"></a>

## SHIP-1　PASS

鎖版安裝、來源檢查、單元測試與建置通過。候選請求為同源，無額外儲存或遙測，兩語、分享圖、canonical 與畫廊入口均通過檢查。

<a id="silhouette-pass"></a>

## silhouette　PASS

提把上方有清楚的空隙，束帶在疊起的板片前方。手機終態保留艇首、艇尾和黑色座艙開口。

<a id="finish-pass"></a>

## finish　PASS

沿甲板折脊能看到窄亮邊。座艙口的包邊、立起的椅背、艇側下方的碎水痕在終態可分辨。

<a id="material-pass"></a>

## material　PASS

折板轉角的局部高光隨板件改變方向，椅背保留暗色軟墊紋理；下緣與深青色水面及碎反射交接。

<a id="narrative-pass"></a>

## narrative　PASS

初訪從攜行包起，板件逐片展長、翻起側舷，再打開座艙；完整成船停留，重播回到同一包。

<a id="continuity-pass"></a>

## continuity　PASS

追蹤前甲板黑色繫繩與相鄰銅色折脊，可從包追到展長中段和最終船首，座椅也隨船艙打開。

<a id="fidelity-pass"></a>

## fidelity　PASS

與核准圖並排看，湖色、銅橘甲板與黑色座艙一致。實作把鏡頭拉遠，桌機和手機都能從艇首看到艇尾。

## desktop 動態貼合

追蹤前甲板黑色繫繩與相鄰銅色折脊，可從包追到展長中段和最終船首，座椅也隨船艙打開。 折板轉角的局部高光隨板件改變方向，椅背保留暗色軟墊紋理；下緣與深青色水面及碎反射交接。

## mobile 動態貼合

追蹤前甲板黑色繫繩與相鄰銅色折脊，可從包追到展長中段和最終船首，座椅也隨船艙打開。 折板轉角的局部高光隨板件改變方向，椅背保留暗色軟墊紋理；下緣與深青色水面及碎反射交接。

