// Match the studio's bounded cold-start treatment using this work's subset.
(() => {
  if (!document.fonts?.load) return;
  const root = document.documentElement;
  root.setAttribute("data-type-pending", "");
  const deadline = setTimeout(reveal, 850);
  function reveal() {
    root.removeAttribute("data-type-pending");
    clearTimeout(deadline);
  }
  document.fonts.load('400 16px "Press TC"', "疊印海報123").then(reveal, reveal);
})();
