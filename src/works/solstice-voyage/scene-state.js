export const CYCLE_SECONDS = 18;
export const CHAPTER_SECONDS = 6;

export const CHAPTERS = [
  {
    file: "sahara",
    key: "sahara",
    coord: "31°09'N 03°59'W · ERG CHEBBI",
    hour: "18:42 UTC+1",
    altZh: "日落時分的撒哈拉沙漠沙丘，琥珀色斜陽照亮銳利沙脊。",
    altEn: "Sahara sand dunes at golden dusk with low amber sunlight carving sharp ridges.",
  },
  {
    file: "fjord",
    key: "fjord",
    coord: "68°14'N 14°33'E · LOFOTEN",
    hour: "23:55 UTC+2",
    altZh: "午夜陽光懸於挪威羅浮敦峽灣海面，金銅色餘暉映照陡峭花崗岩山壁。",
    altEn: "Midnight sun skimming a Lofoten fjord between steep granite peaks and golden sea reflections.",
  },
  {
    file: "alpenglow",
    key: "alpenglow",
    coord: "46°29'N 09°50'E · ENGADIN",
    hour: "05:28 UTC+2",
    altZh: "黎明初陽染紅阿爾卑斯雪峰稜線，柔和雲海覆蓋下方山谷。",
    altEn: "First alpine alpenglow warming high Engadin snow peaks above a quiet sea of valley clouds.",
  },
];

export function sceneIndexFromElapsed(elapsedSeconds) {
  const cyc = ((elapsedSeconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  return Math.floor(cyc / CHAPTER_SECONDS) % CHAPTERS.length;
}
