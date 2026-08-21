"use strict";

const fs = require("fs");
const path = require("path");

hexo.extend.filter.register("after_generate", function () {
  const assets = process.env.HEXO_ADMIN === "true" ? [
    ["node_modules/turndown/dist/turndown.js", "public/js/vendor/turndown.js"],
    [
      "node_modules/turndown-plugin-gfm/dist/turndown-plugin-gfm.js",
      "public/js/vendor/turndown-plugin-gfm.js",
    ],
  ] : [];

  for (const [source, destination] of assets) {
    const from = path.join(hexo.base_dir, source);
    const to = path.join(hexo.base_dir, destination);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }

  const katexFrom = path.join(hexo.base_dir, "node_modules/katex/dist");
  const katexTo = path.join(hexo.base_dir, "public/vendor/katex");
  fs.cpSync(katexFrom, katexTo, { recursive: true });
});
