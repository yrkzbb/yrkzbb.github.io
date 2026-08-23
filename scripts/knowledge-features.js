"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const moment = require("moment");

const SERIES = [
  { key: "mysql", name: "MySQL", titles: ["sql基础", "存储引擎", "索引", "事务", "锁", "日志", "性能调优", "架构"] },
  { key: "redis", name: "Redis", titles: ["场景", "数据结构", "线程模型", "redis事务", "缓存淘汰和过期删除", "集群"] },
  { key: "network", name: "计算机网络", titles: ["网络模型", "应用层", "运输层", "网络IO", "网络场景", "网络攻击"] },
  { key: "os", name: "操作系统", titles: ["用户态和内核态", "进程管理", "中断", "内存管理", "锁"] },
];

function names(collection) {
  return collection && collection.toArray ? collection.toArray().map((item) => item.name) : [];
}

function seriesFor(post, posts) {
  const tags = names(post.tags);
  const categories = names(post.categories);
  let definition;
  if (tags.includes("MySQL")) definition = SERIES[0];
  else if (tags.includes("Redis")) definition = SERIES[1];
  else if (categories.includes("计算机网络")) definition = SERIES[2];
  else if (categories.includes("操作系统")) definition = SERIES[3];
  if (!definition) return null;

  const candidates = posts.toArray ? posts.toArray() : posts;
  const items = definition.titles.map((title) => candidates.find((item) => {
    if (item.title !== title) return false;
    const itemTags = names(item.tags);
    if (definition.key === "mysql") return itemTags.includes("MySQL");
    if (definition.key === "redis") return itemTags.includes("Redis");
    return names(item.categories).includes(definition.name);
  })).filter(Boolean);
  const index = items.findIndex((item) => item.path === post.path);
  return index < 0 ? null : { key: definition.key, name: definition.name, items, index, progress: Math.round(((index + 1) / items.length) * 100) };
}

hexo.extend.helper.register("knowledge_series", function (post) {
  return seriesFor(post, this.site.posts);
});

hexo.extend.helper.register("publication_position", function (post) {
  const posts = this.site.posts.toArray().slice().sort((a, b) => {
    const dateDifference = a.date.valueOf() - b.date.valueOf();
    return dateDifference || String(a.path).localeCompare(String(b.path));
  });
  const index = posts.findIndex((item) => item.path === post.path);
  if (index < 0) return null;
  return {
    current: index + 1,
    total: posts.length,
    progress: Math.round(((index + 1) / posts.length) * 100),
  };
});

hexo.extend.helper.register("related_posts", function (post, limit = 5) {
  const postTags = new Set(names(post.tags));
  const postCategories = new Set(names(post.categories));
  return this.site.posts.toArray().filter((item) => item.path !== post.path).map((item) => {
    const score = names(item.tags).filter((tag) => postTags.has(tag)).length * 3 + names(item.categories).filter((category) => postCategories.has(category)).length;
    return { item, score };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || b.item.date - a.item.date).slice(0, limit).map((entry) => entry.item);
});

hexo.extend.helper.register("post_changelog", function (post, limit = 4) {
  if (!post.source) return [];
  try {
    const output = execFileSync("git", ["log", "--follow", `--max-count=${limit}`, "--date=short", "--format=%ad%x09%s", "--", path.join("source", post.source)], { cwd: hexo.base_dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return output.trim().split("\n").filter(Boolean).map((line) => {
      const [date, ...message] = line.split("\t");
      return { date, message: message.join(" ") };
    });
  } catch (_) { return []; }
});

function escapeXml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function stripHtml(value) {
  return String(value || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cdata(value) {
  return `<![CDATA[${String(value || "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

hexo.extend.generator.register("knowledge_outputs", function (locals) {
  const posts = locals.posts.sort("date", -1).toArray();
  const absolute = (target) => new URL(String(target || "").replace(/^\//, ""), this.config.url.replace(/\/?$/, "/")).href;
  const manifest = posts.map((post) => ({ title: post.title, url: absolute(post.path), path: "/" + post.path, date: post.date.toISOString(), categories: names(post.categories), tags: names(post.tags), excerpt: stripHtml(post.description || post.excerpt || post.content).slice(0, 140) }));
  const categories = {};
  const updates = {};
  const today = moment().startOf("day");
  for (let offset = 6; offset >= 0; offset -= 1) updates[today.clone().subtract(offset, "days").format("YYYY-MM-DD")] = 0;
  let words = 0;
  posts.forEach((post) => {
    const text = stripHtml(post.content || "").replace(/\s+/g, "");
    words += text.length;
    names(post.categories).forEach((name) => { categories[name] = (categories[name] || 0) + 1; });
    // Keep the dashboard consistent with the archive: Hexo falls back to a
    // source file's mtime when `updated` is absent, which can make a bulk edit
    // look as if every article was published on the same day.
    const updateDay = post.date.format("YYYY-MM-DD");
    if (Object.prototype.hasOwnProperty.call(updates, updateDay)) updates[updateDay] += 1;
  });

  const items = posts.map((post) => {
    const url = absolute(post.path);
    const image = post.index_img || this.theme.config.post.banner_img;
    return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${post.date.toDate().toUTCString()}</pubDate>${names(post.categories).concat(names(post.tags)).map((name) => `<category>${escapeXml(name)}</category>`).join("")}<description>${cdata(stripHtml(post.description || post.excerpt || post.content).slice(0, 300))}</description><content:encoded>${cdata(post.content)}</content:encoded>${image ? `<media:content url="${escapeXml(absolute(image))}" medium="image"/>` : ""}</item>`;
  }).join("");
  const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${escapeXml(this.config.title)}</title><link>${escapeXml(this.config.url)}</link><description>${escapeXml(this.config.description)}</description><language>${escapeXml(this.config.language)}</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;

  return [
    { path: "data/posts.json", data: JSON.stringify(manifest) },
    { path: "rss.xml", data: rss },
    { path: "insights/index.html", layout: "insights", data: { title: "站内数据", layout: "page", dashboard: { posts: posts.length, words, categories, updates, latest: posts.slice(0, 5) } } },
  ];
});
