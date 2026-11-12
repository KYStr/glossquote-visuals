import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { base, root } from "../../scripts/site-map.mjs";

const directory = resolve(root, "dist");
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
};

export async function serveDist() {
  const server = createServer(async (request, response) => {
    try {
      const { pathname } = new URL(request.url, "http://localhost");
      const route = decodeURIComponent(pathname.slice(base.length));
      const asset = resolve(directory, pathname.endsWith("/") ? route + "index.html" : route);
      if (!pathname.startsWith(base) || !asset.startsWith(directory + sep)) {
        throw new Error("Route outside the built site");
      }
      const content = await readFile(asset);
      response.writeHead(200, { "Content-Type": types[extname(asset)] ?? "application/octet-stream" }).end(content);
    } catch {
      response.writeHead(404, { "Content-Type": types[".html"] }).end(await readFile(resolve(directory, "404.html")));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
