"use strict";

const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "..", "source", "_posts");
const files = fs.readdirSync(postsDir).filter((name) => name.endsWith(".md"));
const errors = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(postsDir, file), "utf8");
  if (!/^---\s*\n[\s\S]*?\n---\s*\n/.test(content))
    errors.push(`${file}: Front Matter 缺失或未闭合`);
  if (/\[\]\(#[^)]+\)/.test(content))
    errors.push(`${file}: 包含异常空锚点链接`);
  const fences = (content.match(/^```/gm) || []).length;
  if (fences % 2 !== 0) errors.push(`${file}: 代码围栏未成对闭合`);
  const frontMatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontMatter && !/^title:\s*.+$/m.test(frontMatter[1]))
    errors.push(`${file}: 缺少标题`);
  for (const image of content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    if (!image[1].trim()) errors.push(`${file}: 图片缺少替代文本 ${image[2]}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`内容校验通过：${files.length} 篇文章`);
