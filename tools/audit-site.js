"use strict";

const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "public");
const failures = [];
let bytes = 0;
let htmlCount = 0;
let structuredPosts = 0;
let articleImages = 0;
let optimizedImages = 0;
const externalHosts = new Set();

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

if (fs.existsSync(path.join(root, "admin"))) failures.push("生产产物仍包含 /admin/");
if (fs.existsSync(path.join(root, "js", "post-editor-link.js"))) failures.push("生产产物仍包含编辑脚本");
for (const required of ["rss.xml", "data/posts.json", "insights/index.html", "404.html"]) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`缺少功能产物：${required}`);
}

for (const file of walk(root)) {
  bytes += fs.statSync(file).size;
  if (!file.endsWith(".html")) continue;
  htmlCount++;
  const html = fs.readFileSync(file, "utf8");
  if (file.includes(`${path.sep}posts${path.sep}`) && html.includes('"@type":"BlogPosting"')) structuredPosts++;
  if (file.includes(`${path.sep}posts${path.sep}`)) {
    const articleStart = html.indexOf('class="markdown-body"');
    const articleEnd = html.indexOf("<hr", articleStart);
    const article = articleStart >= 0 ? html.slice(articleStart, articleEnd >= 0 ? articleEnd : undefined) : "";
    for (const image of article.matchAll(/<img\b[^>]*>/gi)) {
      articleImages++;
      if (/loading="lazy"/.test(image[0]) && /decoding="async"/.test(image[0]) && /\swidth="\d+"/.test(image[0])) optimizedImages++;
    }
  }
  for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']https?:\/\/([^/"']+)/gi)) externalHosts.add(match[1]);
}

if (!structuredPosts) failures.push("文章缺少 BlogPosting 结构化数据");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!home.includes('class="home-filter"')) failures.push("首页缺少主题筛选");
const samplePost = walk(path.join(root, "posts")).find((file) => file.endsWith("index.html"));
const sampleHtml = samplePost ? fs.readFileSync(samplePost, "utf8") : "";
if (!sampleHtml.includes('class="knowledge-series"')) failures.push("文章缺少系列导航");
if (!sampleHtml.includes('class="related-posts"')) failures.push("文章缺少相关推荐");
console.log(`产物审计：${htmlCount} 个 HTML，${(bytes / 1024 / 1024).toFixed(1)} MiB`);
console.log(`结构化文章：${structuredPosts}；外部资源主机：${[...externalHosts].join(", ") || "无"}`);
console.log(`文章图片属性：${optimizedImages}/${articleImages} 已补充懒加载与尺寸`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
