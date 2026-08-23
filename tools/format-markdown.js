"use strict";

const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "source", "_posts");
const fix = process.argv.includes("--fix");
const files = fs.readdirSync(root).filter((file) => file.endsWith(".md"));
let issueCount = 0;
let changedCount = 0;

function normalize(content) {
  return content
    .replace(/[ \t]+$/gm, "")
    .replace(/^(\s*\d+\.) {2,}/gm, "$1 ")
    .replace(/^(\s*[-*+]) {2,}/gm, "$1 ")
    .replace(/\\\*\\\*([^\n]+?)：\\\*\\\*/g, "**$1：**")
    .replace(/([^\s`\w])([A-Za-z][A-Za-z0-9.+#/-]*)/g, "$1 $2")
    .replace(/([A-Za-z0-9)])([\u3400-\u9fff])/g, "$1 $2")
    .replace(/\n{3,}/g, "\n\n");
}

for (const file of files) {
  const target = path.join(root, file);
  const original = fs.readFileSync(target, "utf8");
  const formatted = normalize(original);
  if (formatted === original) continue;
  issueCount++;
  if (fix) {
    fs.writeFileSync(target, formatted);
    changedCount++;
  } else {
    console.log(`${file}: 可自动修正排版`);
  }
}

if (fix) console.log(`Markdown 自动排版完成：修改 ${changedCount} 篇文章`);
else
  console.log(
    `Markdown 排版检查完成：${issueCount} 篇文章可优化（运行 npm run format:markdown 自动修正）`,
  );
