// Chinese pages call this before body content is parsed. The flag exists only
// when this file actually runs, so blocked scripts leave the HTML visible.
(() => {
  if (!document.fonts?.load) return;
  const root = document.documentElement;
  const families = ["Studio TC Text"];
  if (document.currentScript.hasAttribute("data-serif")) families.push("Studio TC Serif");
  root.setAttribute("data-type-pending", "");

  function reveal() {
    root.removeAttribute("data-type-pending");
    clearTimeout(deadline);
  }

  const deadline = setTimeout(reveal, 850);
  // The preceding same-origin stylesheet registers these faces before this
  // parser-blocking script runs. Never wait indefinitely for a font request.
  Promise.all(families.map(name => document.fonts.load('400 16px "' + name + '"', '中文字123')))
    .then(reveal, reveal);
})();
