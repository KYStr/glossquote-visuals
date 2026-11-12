import { resolve, relative } from "node:path";
import { defineConfig } from "vite";
import { base, catalog, isPublished, languages, origin, repository, root, routesFor, worksFor } from "./scripts/site-map.mjs";
import { shaderContentPolicy } from "./scripts/shaders-csp.mjs";

const escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const copy = {
  "zh-Hant": { preview: "候選", published: "已發布", open: "進入作品", try: "預覽作品", empty: "目前尚無正式展出作品。" },
  en: { preview: "Candidate", published: "Published", open: "View exhibition", try: "Preview exhibition", empty: "There are no published exhibitions yet." },
};
const policy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
].join("; ");

function exhibitionIndex(lang, works) {
  const labels = copy[lang];
  if (!works.length) return `<p>${labels.empty}</p>`;
  const cards = works.map((work) => {
    const entry = catalog[work.slug];
    const title = escape(entry[lang].title);
    const path = `${base}${languages[lang]}works/${work.slug}/`;
    const published = isPublished(work);
    return `<li><a class="exhibition-card" href="${path}">
      <img src="${base}${entry.image}" width="${entry.width}" height="${entry.height}" alt="">
      <div class="exhibition-copy">
        <p class="exhibition-status">${work.id} · ${published ? labels.published : labels.preview}</p>
        <h3>${title}</h3>
        <p>${escape(entry[lang].description)}</p>
        <span class="exhibition-open">${published ? labels.open : labels.try} <span aria-hidden="true">↗</span></span>
      </div>
    </a></li>`;
  });
  return `<ul class="exhibition-list">${cards.join("\n")}</ul>`;
}

export default defineConfig(({ mode, command }) => {
  const works = worksFor(mode);
  const routes = routesFor(mode);
  const input = [...routes.map(({ route }) => resolve(root, route, "index.html")), resolve(root, "404.html")];
  const isRelease = mode === "release" && works.length > 0;
  return {
    base,
    appType: "mpa",
    build: { manifest: true, modulePreload: false, assetsInlineLimit: 0, rolldownOptions: { input } },
    plugins: [shaderContentPolicy(), {
      name: "glossquote-exhibition-pages",
      transformIndexHtml: {
        order: "pre",
        handler(html, { filename }) {
          const path = relative(root, filename).replaceAll("\\", "/");
          const page = routes.find(({ route }) => `${route}index.html` === path);
          const work = works.find(({ slug }) => slug === page?.slug);
          const robots = isRelease && page ? "index, follow" : "noindex, nofollow";
          const csp = command === "build" ? `<meta http-equiv="Content-Security-Policy" content="${policy}">\n  ` : "";
          const sourceRef = isPublished(work ?? {}) ? work.deployedCommit : work?.branch;
          return html
            .replace("<!-- discoverability -->", `${csp}<meta name="robots" content="${robots}">`)
            .replace("<!-- exhibition-index -->", page ? exhibitionIndex(page.lang, works) : "")
            .replace("<!-- work-source -->", sourceRef ? `${repository}/tree/${sourceRef}` : repository);
        },
      },
      generateBundle() {
        const sitemap = (isRelease ? routes : []).map(({ route }) =>
          `  <url><loc>${origin}${base}${route}</loc></url>`).join("\n");
        this.emitFile({
          type: "asset", fileName: "sitemap.xml",
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`,
        });
        this.emitFile({
          type: "asset", fileName: "robots.txt",
          source: isRelease ? `User-agent: *\nAllow: ${base}\nSitemap: ${origin}${base}sitemap.xml\n` : "User-agent: *\nDisallow: /\n",
        });
        this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
      },
    }],
  };
});
