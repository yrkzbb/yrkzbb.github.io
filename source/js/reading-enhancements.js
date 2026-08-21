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
  });
})();
