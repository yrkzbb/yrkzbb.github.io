document.addEventListener('DOMContentLoaded', function () {
  var article = document.querySelector('article.markdown-body');
  if (!article) return;
  var title = document.querySelector('.post-title');
  var source = document.querySelector('meta[name="hexo-source"]');
  var path = source && source.content;
  if (!path) return;
  var link = document.createElement('a');
  link.href = '/admin/?path=' + encodeURIComponent(path);
  link.className = 'blog-edit-link';
  link.textContent = '✎ 编辑文章';
  link.title = '在博客写作台中编辑';
  (title || article).appendChild(link);
});
