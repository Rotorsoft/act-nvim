// src/server/relay.ts
import { readFile as readFile2 } from "fs/promises";
import { createServer as createHttpServer } from "http";
import { createServer as createTcpServer } from "net";
import { extname, join as join2, resolve } from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

// src/server/watcher.ts
import { watch } from "fs";
import { readFile, readdir, stat } from "fs/promises";
import { join, relative } from "path";
var EXCLUDE_DIRS = /* @__PURE__ */ new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  ".turbo"
]);
var isTs = (name) => name.endsWith(".ts") && !name.endsWith(".d.ts");
async function scanDir(root) {
  const files = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) await walk(join(dir, entry.name));
      } else if (entry.isFile() && isTs(entry.name)) {
        const abs = join(dir, entry.name);
        const content = await readFile(abs, "utf-8");
        files.push({ path: relative(root, abs), content });
      }
    }
  }
  await walk(root);
  return files;
}
function watchDir(root, onChange) {
  const timers = /* @__PURE__ */ new Map();
  const watcher = watch(root, { recursive: true }, (_eventType, filename) => {
    if (!filename || !isTs(filename)) return;
    if (filename.split("/").some((seg) => EXCLUDE_DIRS.has(seg))) return;
    const existing = timers.get(filename);
    if (existing) clearTimeout(existing);
    timers.set(
      filename,
      setTimeout(async () => {
        timers.delete(filename);
        const abs = join(root, filename);
        try {
          await stat(abs);
          const content = await readFile(abs, "utf-8");
          onChange({ type: "fileChanged", path: filename, content });
        } catch {
          onChange({ type: "fileDeleted", path: filename });
        }
      }, 100)
    );
  });
  return watcher;
}

// src/server/relay.ts
process.title = "act-nvim-relay";
var HTTP_PORT = parseInt(process.env.ACT_NVIM_HTTP_PORT ?? "4010", 10);
var TCP_PORT = parseInt(process.env.ACT_NVIM_TCP_PORT ?? "4011", 10);
var __dirname = fileURLToPath(new URL(".", import.meta.url));
var PACKAGE_ROOT = __dirname.includes("/dist/") ? join2(__dirname, "..", "..") : join2(__dirname, "..", "..");
var CLIENT_DIR = join2(PACKAGE_ROOT, "dist", "client");
var MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json"
};
var nvimSocket = null;
var nvimBuffer = "";
var fsWatcher = null;
var lastFiles = null;
var browserEverConnected = false;
function sendToNvim(msg) {
  if (nvimSocket?.writable) {
    nvimSocket.write(JSON.stringify(msg) + "\n");
  }
}
function sendToBrowser(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}
var httpServer = createHttpServer(async (req, res) => {
  const rawUrl = req.url?.split("?")[0] ?? "/";
  const url = rawUrl === "/" ? "/index.html" : rawUrl;
  const filePath = resolve(CLIENT_DIR, "." + url);
  if (!filePath.startsWith(resolve(CLIENT_DIR))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await readFile2(filePath);
    const ext = extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
});
var wss = new WebSocketServer({ server: httpServer, path: "/ws" });
wss.on("connection", (ws) => {
  console.log("[relay] browser connected");
  browserEverConnected = true;
  if (lastFiles) {
    ws.send(JSON.stringify(lastFiles));
  }
  sendToNvim({ type: "browserConnected" });
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "navigate") {
        sendToNvim(msg);
      }
    } catch (e) {
      console.error("[relay] bad WS message:", e);
    }
  });
  ws.on("close", () => {
    console.log("[relay] browser disconnected");
  });
});
var tcpServer = createTcpServer((socket) => {
  console.log("[relay] neovim connected");
  nvimSocket = socket;
  nvimBuffer = "";
  const hasBrowser = browserEverConnected || wss.clients.size > 0;
  socket.write(
    JSON.stringify({ type: "status", browserConnected: hasBrowser }) + "\n"
  );
  socket.on("data", (chunk) => {
    nvimBuffer += chunk.toString();
    const lines = nvimBuffer.split("\n");
    nvimBuffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        void handleNvimMessage(msg);
      } catch (e) {
        console.error("[relay] bad TCP message:", e);
      }
    }
  });
  socket.on("close", () => {
    console.log("[relay] neovim disconnected");
    if (nvimSocket === socket) nvimSocket = null;
  });
  socket.on("error", (e) => {
    console.error("[relay] TCP error:", e.message);
  });
});
async function handleNvimMessage(msg) {
  switch (msg.type) {
    case "init": {
      const root = msg.root;
      console.log(`[relay] init: scanning ${root}`);
      if (fsWatcher) {
        fsWatcher.close();
        fsWatcher = null;
      }
      try {
        const files = await scanDir(root);
        console.log(`[relay] found ${files.length} TypeScript files`);
        const projectName = root.split("/").pop() ?? "project";
        lastFiles = { type: "files", files };
        sendToBrowser(lastFiles);
        sendToBrowser({ type: "projectName", name: projectName });
        fsWatcher = watchDir(root, (event) => {
          console.log(`[relay] ${event.type}: ${event.path}`);
          sendToBrowser(event);
        });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        console.error(`[relay] scan failed: ${err}`);
        sendToNvim({ type: "error", message: `scan failed: ${err}` });
      }
      break;
    }
    case "fileChanged": {
      sendToBrowser(msg);
      break;
    }
    case "diagnostics": {
      sendToBrowser(msg);
      break;
    }
  }
}
httpServer.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`[relay] port ${HTTP_PORT} already in use \u2014 exiting`);
    process.exit(1);
  }
  throw e;
});
tcpServer.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`[relay] port ${TCP_PORT} already in use \u2014 exiting`);
    process.exit(1);
  }
  throw e;
});
httpServer.listen(HTTP_PORT, () => {
  console.log(`[relay] HTTP + WS on http://localhost:${HTTP_PORT}`);
});
tcpServer.listen(TCP_PORT, () => {
  console.log(`[relay] TCP on port ${TCP_PORT}`);
});
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
function shutdown() {
  console.log("[relay] shutting down");
  fsWatcher?.close();
  wss.close();
  httpServer.close();
  tcpServer.close();
  process.exit(0);
}
//# sourceMappingURL=relay.js.map