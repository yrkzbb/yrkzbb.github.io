"use strict";

const fs = require("fs");
const path = require("path");

function imageSize(file) {
  try {
    const data = fs.readFileSync(file);
    if (data.subarray(1, 4).toString() === "PNG")
      return [data.readUInt32BE(16), data.readUInt32BE(20)];
    if (data.subarray(0, 3).toString() === "GIF")
      return [data.readUInt16LE(6), data.readUInt16LE(8)];
    if (data.subarray(0, 2).toString("hex") === "ffd8") {
      let offset = 2;
      while (offset < data.length) {
        const marker = data[offset + 1];
        const length = data.readUInt16BE(offset + 2);
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc9].includes(marker))
          return [data.readUInt16BE(offset + 7), data.readUInt16BE(offset + 5)];
        offset += 2 + length;
      }
    }
  } catch (_) {}
  return null;
}

function addAttribute(tag, name, value) {
  return new RegExp(`\\s${name}=`).test(tag) ? tag : tag.replace(/>$/, ` ${name}="${value}">`);
}

hexo.extend.filter.register("after_render:html", function (html) {
  return html.replace(/<img\b[^>]*>/gi, (original) => {
    let tag = addAttribute(addAttribute(original, "loading", "lazy"), "decoding", "async");
    tag = addAttribute(tag, "sizes", "(max-width: 768px) 100vw, 900px");
    const match = tag.match(/(?:src|data-src)=["']([^"']+)["']/i);
    if (!match || /^(?:https?:|data:|\/\/)/.test(match[1])) return tag;
    const basename = path.basename(match[1].split(/[?#]/)[0]);
    const asset = path.join(hexo.source_dir, "img", basename);
    const size = imageSize(asset);
    if (size) {
      tag = addAttribute(tag, "width", size[0]);
      tag = addAttribute(tag, "height", size[1]);
    }
    if (/\.png$/i.test(asset) && fs.existsSync(asset.replace(/\.png$/i, ".webp"))) {
      const webpUrl = match[1].replace(/\.png(?=([?#]|$))/i, ".webp");
      const hasAvif = fs.existsSync(asset.replace(/\.png$/i, ".avif"));
      const optimizedUrl = hasAvif ? match[1].replace(/\.png(?=([?#]|$))/i, ".avif") : webpUrl;
      tag = tag.replace(match[0], match[0].replace(match[1], optimizedUrl));
      tag = addAttribute(tag, "data-fallback-src", webpUrl);
      tag = addAttribute(tag, "data-original-src", match[1]);
    }
    return tag;
  });
});

hexo.extend.filter.register("after_generate", function () {
  if (process.env.HEXO_ADMIN !== "true") {
    const privateRoutes = [
      "css/admin-entry.css",
      "css/inline-editor.css",
      "js/post-editor-link.js",
      "js/vendor/turndown.js",
      "js/vendor/turndown-plugin-gfm.js",
    ];
    for (const route of hexo.route.list()) {
      if (route.startsWith("admin/") || privateRoutes.includes(route)) hexo.route.remove(route);
    }
  }
}, 20);
