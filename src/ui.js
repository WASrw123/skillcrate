import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { readLock } from "./lock.js";
import { readPlan } from "./plan.js";
import { color } from "./util.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(here, "..", "ui");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function serveFile(res, file) {
  try {
    const body = readFileSync(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}

export function startUi({ cwd = process.cwd(), port = 4777, host = "127.0.0.1" } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    if (url.pathname === "/api/state") {
      const state = {
        generatedAt: new Date().toISOString(),
        config: loadConfig(cwd),
        lock: readLock(cwd),
        plan: readPlan(cwd),
      };
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(state));
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      serveFile(res, path.join(UI_DIR, "index.html"));
      return;
    }
    const safe = path.normalize(url.pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    serveFile(res, path.join(UI_DIR, safe));
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`${color.green("→")} SkillCrate dashboard`);
    console.log(`  ${color.cyan(url)}`);
    console.log(color.dim("  Ctrl+C to stop"));
  });
  return server;
}
