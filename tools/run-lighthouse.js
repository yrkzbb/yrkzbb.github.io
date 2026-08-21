"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const candidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean);
const chrome = candidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) {
  console.error("未找到 Chrome/Chromium，无法执行 Lighthouse 门禁");
  process.exit(1);
}

const binary = path.join(__dirname, "..", "node_modules", ".bin", "lhci");
const result = spawnSync(binary, ["autorun"], {
  stdio: "inherit",
  env: { ...process.env, CHROME_PATH: chrome },
});
process.exit(result.status == null ? 1 : result.status);
