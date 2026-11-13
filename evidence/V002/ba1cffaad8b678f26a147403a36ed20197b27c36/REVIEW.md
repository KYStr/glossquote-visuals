# 物形 / FORME Objects — M03 independent review

Candidate: ba1cffaad8b678f26a147403a36ed20197b27c36

Non-author reviewer: /root/v001_review. Author: 01a1d0b2-3cc2-7600-bf46-2cab8dda6039.

[Eight-lane verification](https://github.com/KYStr/glossquote-visuals/actions/runs/43384882948) · [Acceptance](acceptance.json)

| Category | Score |
|---|---:|
| artDirection | 9.1 |
| uiDesign | 9.2 |
| commercialCompleteness | 9.4 |

Scores are subjective commercial-v1 judgments, not measured conversion.

## artDirection

| Criterion | Score | Observation |
|---|---:|---|
| brandIdentity | 1.8 | 深灰綠、銀色、Geist 與成套暖灰產品影像一致。首屏燭台的鋼環與系列商品照的輪廓相符，程序場景仍有較簡潔的展示室質感。 |
| heroComposition | 1.9 | 桌面全幅畫面以文字和大型鋼環分居左右，手機改為文字、燭台、操作垂直順序。兩種尺寸的輪廓、內孔及腳座完整，CTA 清楚。 |
| typography | 1.8 | 雙語標題、產品名、價格及規格層級明確。英文首屏字距較緊，手機次要標籤較小。 |
| materialImagery | 1.8 | 鏡面窄亮帶和拉絲柔光、細紋可區分，光移動時沿鋼環和內孔曲面變化，腳座的接觸暗部與投影保持連續。高對比外緣和腳座仍有細小階梯，程序場景的光影較商品照簡潔。 |
| pageRhythm | 1.8 | 深色首屏與工藝區交替淺色商品和詢問區。390px 可循三款、設定、工藝、FAQ 到清單，商品在系列與設定區重複出現使窄版流程較長。 |

## uiDesign

| Criterion | Score | Observation |
|---|---:|---|
| informationHierarchy | 1.9 | 主視覺導向系列，商品比較再進入選款、規格和詢問清單，資訊順序清楚。 |
| navigationActions | 1.8 | 系列、工藝及詢問清單入口清楚，品項直達設定，完成後可以下載或回到系列。手機次要連結及控制標籤較緊湊。 |
| formsStates | 1.9 | 商品、表面、件／組、數量、單價與合計有明確狀態，報告覆蓋無效數量與合併。 |
| responsiveAccessibility | 1.8 | 實看中英 1440/390、商品表單與清單。四寬 320/390/768/1440、200%、鍵盤、觸控與無 JS/GPU 依本 SHA 斷言，抽測對比 6.87:1。部分次要文字在手機偏小。 |
| interactionConsistency | 1.8 | 商品與表面選擇同步更新照片、規格、價格及清單；首屏固定以 Halo 展示表面，切換到花器仍需看首屏標籤才能辨識兩處角色。兩語下載與清單一致。 |

## commercialCompleteness

| Criterion | Score | Observation |
|---|---:|---|
| positioningValue | 1.9 | 首屏明確定位不鏽鋼家飾，三款商品對應餐桌、窗邊與書架。商品照、工藝近照與可操控燭台呈現兩種表面的用途和差異。 |
| decisionInformation | 1.9 | 材質、尺寸、用途、兩表面、單價與組件數足以作選擇；書擋每組兩件與單件尺寸明確。 |
| truthfulTrust | 1.9 | 概念品牌、示意價、未含運費與未送出詢問／訂單，均在雙語頁面及真正下載內容中明示。 |
| customerJourney | 1.9 | 雙語商品與表面選擇、合併和分列、清單修改、移除、清空及真實下載均有本 SHA 證據。 |
| completionRecovery | 1.8 | 清單與兩份實際 TXT 合計一致，NT$8,640＋2,280＋6,760＝17,680。數量錯誤可修正，移除有焦點回復；清單只存在此頁，需下載才可留存。 |

## Motion and material

- desktop: 桌面鏡面窄光沿鋼環內外輪廓移動，拉絲較柔的高光仍保留暗側與線紋。0°→180° 隨光改變投影方向，腳座與接觸區保持固定。兩材質的 12 秒原始取樣、固定角度與原 CSS 合成支持同一幾何上的反光。
- mobile: 手機原圖完整保留燭杯、內孔與腳座。鏡面亮帶與較寬的拉絲反射都沿曲面移動，陰影留在底面。兩材質暫停前、立即與保持逐像素相同；兩個續播取樣時點都重新出現光影變化。

## Limits

- 兩尺寸各有鏡面和拉絲的自然 GPU texture 原圖與實際 readback 請求時間。未量測逐張 GPU 提交或顯示時刻；固定角度、原 CSS A/A/B/A、暫停和續播另有可見合成原 PNG。
- Native 續播依實際請求時間取樣，四組各兩個取樣都超過原可見變化門檻並有新 GPU acquisition。共用測試續播保留固定角度，原圖可相同。
- 實體 GPU、手機真機、完整人工讀屏及顯示 FPS 為 NOT_RUN。正式 HTTPS、交付 ZIP 及外部複核待主責確認。
