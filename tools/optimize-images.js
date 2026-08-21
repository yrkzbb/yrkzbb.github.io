"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const imageDir = path.join(__dirname, "..", "source", "img");

const probe = spawnSync("cwebp", ["-version"], { stdio: "ignore" });
if (probe.status !== 0) {
  console.error("未找到 cwebp；请先安装 WebP 工具后再运行 npm run optimize:images");
  process.exit(1);
}
const avifProbe = spawnSync("magick", ["-version"], { stdio: "ignore" });

let converted = 0;
for (const name of fs.readdirSync(imageDir)) {
  if (!name.endsWith(".png") || ["loading.gif", "police_beian.png"].includes(name)) continue;
  const input = path.join(imageDir, name);
  const output = input.replace(/\.png$/i, ".webp");
  if (fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs) continue;
  const result = spawnSync("cwebp", ["-quiet", "-q", "82", "-m", "6", input, "-o", output]);
  if (result.status !== 0) throw new Error(`转换失败：${name}`);
  converted++;
}
let avifConverted = 0;
if (avifProbe.status === 0) {
  for (const name of fs.readdirSync(imageDir)) {
    if (!name.endsWith(".png") || name === "police_beian.png") continue;
    const input = path.join(imageDir, name);
    const output = input.replace(/\.png$/i, ".avif");
    if (fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs) continue;
    const result = spawnSync("magick", [input, "-quality", "55", output]);
    if (result.status !== 0) throw new Error(`AVIF 转换失败：${name}`);
    avifConverted++;
  }
}
for (const name of fs.readdirSync(imageDir).filter((file) => file.endsWith(".avif"))) {
  const avif = path.join(imageDir, name);
  const webp = avif.replace(/\.avif$/i, ".webp");
  if (fs.existsSync(webp) && fs.statSync(avif).size >= fs.statSync(webp).size) fs.rmSync(avif);
}
console.log(`图片优化完成：生成 ${converted} 个 WebP、${avifConverted} 个 AVIF 文件`);
