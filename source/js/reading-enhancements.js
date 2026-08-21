(function () {
  'use strict';

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    var input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    var copied = document.execCommand('copy');
    input.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error('Copy failed'));
  }

  function registerSearchShortcut() {
    var modal = document.getElementById('modalSearch');
    if (!modal) return;

    document.addEventListener('keydown', function (event) {
      var target = event.target;
      var editing = target && (target.matches('input, textarea, select') || target.isContentEditable);
      var shortcut = event.key === '/' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k');

      if (!editing && shortcut && window.jQuery) {
        event.preventDefault();
        window.jQuery(modal).modal('show');
      }
    });

    var input = document.getElementById('local-search-input');
    var result = document.getElementById('local-search-result');
    if (!input || !result) return;

    input.setAttribute('aria-label', '搜索关键词');
    input.setAttribute('aria-controls', 'local-search-result');

    input.addEventListener('keydown', function (event) {
      var items = Array.prototype.slice.call(result.querySelectorAll('a.list-group-item'));
      if (!items.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;

      var active = result.querySelector('.search-result-active');
      var index = items.indexOf(active);
      if (event.key === 'Enter') {
        if (active) {
          event.preventDefault();
          active.click();
        }
        return;
      }

      event.preventDefault();
      index = event.key === 'ArrowDown' ? (index + 1) % items.length : (index <= 0 ? items.length - 1 : index - 1);
      items.forEach(function (item) {
        item.classList.remove('search-result-active');
        item.removeAttribute('aria-selected');
      });
      items[index].classList.add('search-result-active');
      items[index].setAttribute('aria-selected', 'true');
      items[index].scrollIntoView({ block: 'nearest' });
    });

    input.addEventListener('input', function () {
      var active = result.querySelector('.search-result-active');
      if (active) active.classList.remove('search-result-active');
    });
  }

  function registerMobileToc() {
    var source = document.getElementById('toc-body');
    if (!source) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-toc-button';
    button.setAttribute('aria-label', '打开文章目录');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = '☰';

    var panel = document.createElement('div');
    panel.className = 'mobile-toc-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<div class="mobile-toc-card"><div class="mobile-toc-header"><strong>文章目录</strong><button type="button" aria-label="关闭文章目录">×</button></div><nav class="mobile-toc-content"></nav></div>';
    document.body.appendChild(button);
    document.body.appendChild(panel);

    var content = panel.querySelector('.mobile-toc-content');
    function syncToc() {
      content.innerHTML = source.innerHTML;
      button.hidden = !content.querySelector('.toc-list-item');
    }
    new MutationObserver(syncToc).observe(source, { childList: true, subtree: true, attributes: true });
    syncToc();

    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      button.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('mobile-toc-open', open);
    }
    button.addEventListener('click', function () { setOpen(true); });
    panel.querySelector('.mobile-toc-header button').addEventListener('click', function () { setOpen(false); });
    panel.addEventListener('click', function (event) {
      if (event.target === panel || event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false);
    });
  }

  function registerReadingTools() {
    var article = document.querySelector('.post-content');
    if (!article) return;

    var progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', '文章阅读进度');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    progress.innerHTML = '<span></span>';
    document.body.appendChild(progress);

    var totalMinutes = Math.max(1, Math.ceil(article.textContent.replace(/\s+/g, '').length / 500));
    var indicator = document.createElement('div');
    indicator.className = 'reading-indicator';
    indicator.setAttribute('aria-live', 'polite');
    document.body.appendChild(indicator);

    function updateProgress() {
      var distance = Math.max(1, article.offsetHeight - window.innerHeight);
      var percent = Math.min(100, Math.max(0, ((window.scrollY - article.offsetTop) / distance) * 100));
      progress.firstElementChild.style.width = percent + '%';
      progress.setAttribute('aria-valuenow', Math.round(percent));
      indicator.textContent = percent >= 99 ? '已读完' : '约 ' + Math.ceil(totalMinutes * (1 - percent / 100)) + ' 分钟';
      indicator.classList.toggle('is-visible', percent > 1 && percent < 99);
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();

    var shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.className = 'article-share-button';
    shareButton.setAttribute('aria-label', '分享这篇文章');
    shareButton.setAttribute('title', '分享文章');
    shareButton.textContent = '↗';
    shareButton.addEventListener('click', function () {
      var shareData = { title: document.title, url: window.location.href };
      var action = navigator.share ? navigator.share(shareData) : copyText(shareData.url);
      action
        .then(function () {
          shareButton.textContent = '✓';
          shareButton.setAttribute('title', navigator.share ? '分享成功' : '链接已复制');
          window.setTimeout(function () {
            shareButton.textContent = '↗';
            shareButton.setAttribute('title', '分享文章');
          }, 1600);
        })
        .catch(function () {});
    });
    document.body.appendChild(shareButton);
  }

  document.addEventListener('DOMContentLoaded', function () {
    registerSearchShortcut();
    registerReadingTools();
    registerMobileToc();
  });
})();
