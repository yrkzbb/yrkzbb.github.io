'use strict';

const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('after_generate', function () {
  const assets = [
    ['node_modules/turndown/dist/turndown.js', 'public/js/vendor/turndown.js'],
    ['node_modules/turndown-plugin-gfm/dist/turndown-plugin-gfm.js', 'public/js/vendor/turndown-plugin-gfm.js']
  ];

  for (const [source, destination] of assets) {
    const from = path.join(hexo.base_dir, source);
    const to = path.join(hexo.base_dir, destination);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
});
