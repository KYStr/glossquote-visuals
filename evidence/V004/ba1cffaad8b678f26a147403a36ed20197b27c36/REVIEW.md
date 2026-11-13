# 折光材料室 / PRISM Materials — M03 independent review

Candidate: ba1cffaad8b678f26a147403a36ed20197b27c36

Non-author reviewer: /root/signal_review. Author: 01a1d302-21ef-7052-92d8-1ca5a415af0a.

[Eight-lane verification](https://github.com/KYStr/glossquote-visuals/actions/runs/43384882948) · [Acceptance](acceptance.json)

| Category | Score |
|---|---:|
| artDirection | 9.2 |
| uiDesign | 9.3 |
| commercialCompleteness | 9.4 |

Scores are subjective commercial-v1 judgments, not measured conversion.

## artDirection

| Criterion | Score | Observation |
|---|---:|---|
| brandIdentity | 1.9 | 鈷藍光帶、建築格線、截面標誌與 PRISM 名稱在首屏、產品與空間示意中形成一致的玻璃材料品牌；保留為概念品牌而非宣稱真實廠商。 |
| heroComposition | 1.9 | 桌面大字與玻璃試片構成清楚雙焦點，CTA 接到選樣；手機先說明用途再展示試片，文字與材質不互相遮蔽。 |
| typography | 1.8 | 大字、正文與等寬規格的正常尺寸層級清楚，中英文維持一致視覺方向；320px／200% 英文 section 仍斷詞，保留排版扣分。本候選重新查看的選樣規格能完整上下重排，未回歸逐字直排。 |
| materialImagery | 1.7 | 同候選原圖的玻璃切面反射具有位置相關明暗，clear、satin、ribbed 透射與光帶切割可辨識；角度往返和完整週期未出現材質崩解。仍屬風格化光學示意，細邊與反射精細度保留扣分。 |
| pageRhythm | 1.9 | 首屏、三款材料、選樣工作區、空間情境、製作流程與 FAQ 有明確節奏；手機順序完整，圖像與資訊區塊仍維持同一品牌語言。 |

## uiDesign

| Criterion | Score | Observation |
|---|---:|---|
| informationHierarchy | 1.9 | 首屏定位、材料差異、規格與選樣入口依顧客決策順序排列；材料控制、表單與結果清單各有清楚標籤。 |
| navigationActions | 1.9 | 頁首導覽、主 CTA、商品選入與情境段落 CTA 導向一致；報告已執行商品預填、鍵盤 Enter、touch 與焦點返回。 |
| formsStates | 1.9 | 空清單、選樣、數量、修改、取消、移除與下載狀態均有清楚呈現；報告驗證空值、0、小數、超過 20 及累加上限，不只以成功截圖推斷錯誤狀態。 |
| responsiveAccessibility | 1.8 | 已獨立重看本 SHA 雙語 320px／200% 的 top／sampling／footer 原始分段圖：縮圖改在規格上方，dt/dd 全寬上下重排，Surface／Double-polished、150 × 150 mm、12 mm 及 Optic Clear 選值完整可讀。這解決 646a2c6 的唯一 UI 阻擋；正常尺寸整頁未見退步。報告另涵蓋 320／390／768／1440、鍵盤、touch 與 44px 控制；真實裝置與讀屏仍未驗。 |
| interactionConsistency | 1.8 | 本候選桌面／手機的材質名稱、選中狀態與玻璃圖像一致；固定試片 region 的差值排除 radio 樣式。專屬 native held 原圖穩定；shared 桌面 1100×850 與手機 390×844 controlled quartet 的 before→pause→1 秒後均完全同像素、零 queue submission，恢復才繼續動。 |

## commercialCompleteness

| Criterion | Score | Observation |
|---|---:|---|
| positioningValue | 1.9 | 開場明確說明建築玻璃選樣及三種表面如何改變透視與光影，情境圖與現場比較指引連接使用目的。 |
| decisionInformation | 1.9 | 每款有表面處理、150×150 mm 樣板尺寸、示意厚度與適用場景；三款並列比較並可選入需求摘要。 |
| truthfulTrust | 1.9 | 頁尾、FAQ、清單與實際下載均標明概念選樣，下載不等於送出需求或安排寄送；厚度為示意，最終製作需與製作者確認。 |
| customerJourney | 1.9 | 材料理解→選款／數量→修改／移除→下載可帶給製作者的摘要，形成完整而準確的概念商業流程；兩語實際 UTF-8 檔包含選定 ST–02 三片、RB–03 一片及規格。 |
| completionRecovery | 1.8 | 完成狀態提示瀏覽器下載位置與未送單；錯誤數量、上限、取消修改、移除後焦點及空清單已測。重新整理或換語言會清空選擇，已有事前說明，仍因此保留扣分。 |

## Motion and material

- desktop: 已實看本候選自然合成原幀，自首次可見 GPU 幀歸零至 26.473 秒，presentation hook 累積 shader 時間 13.655 秒，涵蓋完整 12 秒週期；透射、薄側邊與反射變化連貫。審查序列只收不同實測時間的原幀，沒有把重複命中的排程點當新幀。最小／中間／最大／返回角度及三種材質已檢視。另以本 SHA shared 的 1100×850 controlled quartet 驗證 before→pause→1 秒後原解析度像素完全一致、零 GPU 提交，恢復後再動。專屬 native-clock held 只作補充，未拿跨時間 before→click 代替同幀。
- mobile: 已實看本候選自然合成原幀，自首次可見 GPU 幀歸零至 15.133 秒，presentation hook 累積 shader 時間 13.437 秒，涵蓋完整 12 秒週期；透射、薄側邊與反射變化連貫。審查序列只收不同實測時間的原幀，沒有把重複命中的排程點當新幀。最小／中間／最大／返回角度及三種材質已檢視。另以本 SHA shared 的 390×844 controlled quartet 驗證 before→pause→1 秒後原解析度像素完全一致、零 GPU 提交，恢復後再動。專屬 native-clock held 只作補充，未拿跨時間 before→click 代替同幀。

## Limits

- {'status': 'NOT_RUN', 'scope': 'physical-devices-and-screen-reader', 'reason': '證據環境為 Microsoft Basic Render Driver；未作實體手機、消費級 GPU 或讀屏驗證。'}
- {'status': 'NOT_RUN', 'scope': 'live-deployment', 'reason': '本件為固定候選的遠端測試與原始產物審查；正式部署後的網址尚未由本次審查驗證。'}
- {'status': 'LIMITATION', 'scope': 'temporal-clock', 'reason': '自然動畫 seconds 採 compositor 幀的實測 wall-clock，以第一個可見 GPU 幀歸零，沒有把檔名 targetMs 當實際時間。shaderElapsedSeconds 是 presentation hook 的累積 delta；軟體 GPU 的 wall-clock 週期較長，不能宣稱 12 秒 wall-clock 正好閉合或實機效能通過。'}
- {'status': 'LIMITATION', 'scope': 'recovery', 'reason': '正常 renderer 的 pause 保留當前畫面；device loss 後可 fallback 並重建，不宣稱跨 device loss 保存 simulation 時間。'}
- {'status': 'LIMITATION', 'scope': 'independent-readback-timing', 'reason': 'shared 控制 sample 的 GPU submittedAt 在 100ms 區間前端，composite 在區間後截圖；按控制狀態配對，不宣稱是同一 submission。正式 pause 四圖只比較 controlled clock 下的 composite；desktop pause 為 1100×850，natural desktop 為 1440×960，mobile 兩者均 390×844。'}
