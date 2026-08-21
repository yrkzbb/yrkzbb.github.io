"use strict";

const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const errors = [];

function walk(dir, extension, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extension, files);
    else if (full.endsWith(extension)) files.push(full);
  }
  return files;
}

function cleanTarget(value) {
  const target = value.trim().replace(/^<|>$/g, "").split(/\s+["']/)[0].split(/[?#]/)[0];
  try {
    return decodeURI(target);
  } catch (_) {
    return target;
  }
}

function checkSource() {
  const source = path.join(root, "source");
  for (const file of walk(source, ".md")) {
    const text = fs.readFileSync(file, "utf8");
    const links = [...text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)];
    for (const match of links) {
      const target = cleanTarget(match[1]);
      if (!target || /^(?:https?:|mailto:|tel:|#)/.test(target)) continue;
      const resolved = target.startsWith("/") ? path.join(source, target) : path.resolve(path.dirname(file), target);
      if (!fs.existsSync(resolved)) errors.push(`${path.relative(root, file)}: 缺少资源 ${target}`);
    }
  }
}

function checkGenerated() {
  const publicDir = path.join(root, "public");
  for (const file of walk(publicDir, ".html")) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(/(?:href|src|data-src)=["']([^"']+)["']/gi)) {
      const rawTarget = match[1];
      const target = cleanTarget(match[1]);
      if (!target || /^(?:https?:|mailto:|tel:|javascript:|data:|#|\/\/)/.test(target)) continue;
      let resolved = target.startsWith("/") ? path.join(publicDir, target) : path.resolve(path.dirname(file), target);
      if (target.endsWith("/")) resolved = path.join(resolved, "index.html");
      if (!path.extname(resolved) && !fs.existsSync(resolved)) resolved = path.join(resolved, "index.html");
      if (!fs.existsSync(resolved)) {
        errors.push(`${path.relative(publicDir, file)}: 坏链 ${target}`);
        continue;
      }
      const hash = rawTarget.includes("#") ? rawTarget.slice(rawTarget.indexOf("#") + 1) : "";
      if (hash && resolved.endsWith(".html")) {
        let anchor = hash;
        try { anchor = decodeURIComponent(hash); } catch (_) {}
        const targetHtml = resolved === file ? html : fs.readFileSync(resolved, "utf8");
        const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`(?:id|name)=["']${escaped}["']`).test(targetHtml))
          errors.push(`${path.relative(publicDir, file)}: 锚点不存在 ${rawTarget}`);
      }
    }
  }
}

checkSource();
if (!process.argv.includes("--source")) checkGenerated();
if (errors.length) {
  console.error(errors.slice(0, 100).join("\n"));
  console.error(`链接检查失败：${errors.length} 个问题`);
  process.exit(1);
}
console.log(process.argv.includes("--source") ? "源文件链接检查通过" : "生成站点链接检查通过");
