(function () {
  'use strict';

  var GLOSSARY = {
    'MVCC': '多版本并发控制：通过不同数据版本减少读写之间的阻塞。',
    'B+ 树': '一种多路平衡搜索树，数据集中在叶子节点，适合数据库索引与范围查询。',
    'AOF': 'Redis 追加文件持久化：记录写命令，并在重启时重放。',
    'RDB': 'Redis 数据快照：在指定时刻把内存数据保存到磁盘。',
    'InnoDB': 'MySQL 默认事务型存储引擎，支持事务、行锁、崩溃恢复和外键。',
    'binlog': 'MySQL Server 层的逻辑变更日志，常用于复制和时间点恢复。',
    'redo log': 'InnoDB 重做日志，用于保证已提交事务的持久性和崩溃恢复。',
    'undo log': '保存数据旧版本的信息，用于事务回滚和 MVCC。',
    'epoll': 'Linux 的 I/O 多路复用机制，适合同时管理大量文件描述符。',
    'TCP': '面向连接、可靠、有序的传输层协议。',
    'HTTP': '用于客户端与服务器交换超文本和 API 数据的应用层协议。'
  };

  function registerHomeFilter() {
    var toolbar = document.querySelector('.home-filter');
    if (!toolbar) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card[data-categories]'));
    var filters = Array.prototype.slice.call(toolbar.querySelectorAll('button[data-filter]')).map(function (button) { return button.dataset.filter; });
    var statuses = Array.prototype.slice.call(toolbar.querySelectorAll('button[data-status]')).map(function (button) { return button.dataset.status; });
    var count = toolbar.querySelector('.home-filter-count');
    var pagination = document.querySelector('.home-pagination');
    var pageSize = 8;
    var currentFilter = 'all';
    var currentStatus = 'all';
    var currentPage = 1;

    function masteryFor(card) {
      try {
        var mastery = JSON.parse(localStorage.getItem('yrk_article_mastery') || '{}');
        return mastery[card.dataset.postPath] || 'unread';
      } catch (_) { return 'unread'; }
    }

    function matchingCards(filter, status) {
      return cards.filter(function (card) {
        var categories = card.dataset.categories.split(/\s+/).filter(Boolean);
        var categoryMatches = filter === 'all' || categories.includes(filter);
        var statusMatches = status === 'all' || masteryFor(card) === status;
        return categoryMatches && statusMatches;
      });
    }

    function updateAddress() {
      if (currentFilter === 'all' && currentStatus === 'all' && currentPage === 1) {
        history.replaceState(null, '', location.pathname + location.search);
        return;
      }
      var parameters = new URLSearchParams();
      if (currentFilter !== 'all') parameters.set('category', currentFilter);
      if (currentStatus !== 'all') parameters.set('status', currentStatus);
      if (currentPage > 1) parameters.set('page', String(currentPage));
      history.replaceState(null, '', '#' + parameters.toString());
    }

    function renderPagination(totalPages) {
      if (!pagination) return;
      pagination.innerHTML = '';
      if (totalPages <= 1) {
        pagination.hidden = true;
        return;
      }
      pagination.hidden = false;
      var labels = [];
      labels.push({ page: currentPage - 1, label: '‹', disabled: currentPage === 1, aria: '上一页' });
      for (var page = 1; page <= totalPages; page++) labels.push({ page: page, label: String(page), current: page === currentPage, aria: '第 ' + page + ' 页' });
      labels.push({ page: currentPage + 1, label: '›', disabled: currentPage === totalPages, aria: '下一页' });
      labels.forEach(function (item) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.disabled = item.disabled;
        button.dataset.page = item.page;
        button.setAttribute('aria-label', item.aria);
        if (item.current) {
          button.className = 'active';
          button.setAttribute('aria-current', 'page');
        }
        pagination.appendChild(button);
      });
    }

    function apply(filter, status, requestedPage) {
      currentFilter = filter;
      currentStatus = status;
      var matched = matchingCards(filter, status);
      var totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
      currentPage = Math.min(Math.max(Number(requestedPage) || 1, 1), totalPages);
      var first = (currentPage - 1) * pageSize;
      var visibleCards = matched.slice(first, first + pageSize);
      cards.forEach(function (card) { card.hidden = !visibleCards.includes(card); });
      toolbar.querySelectorAll('button[data-filter], button[data-status]').forEach(function (button) {
        var active = button.dataset.filter === filter || button.dataset.status === status;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      count.textContent = matched.length + ' 篇 · ' + currentPage + ' / ' + totalPages + ' 页';
      renderPagination(totalPages);
      updateAddress();
    }
    toolbar.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-filter]');
      var statusButton = event.target.closest('button[data-status]');
      if (button) apply(button.dataset.filter, currentStatus, 1);
      if (statusButton) apply(currentFilter, statusButton.dataset.status, 1);
    });
    if (pagination) pagination.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-page]');
      if (!button || button.disabled) return;
      apply(currentFilter, currentStatus, Number(button.dataset.page));
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var initialParameters = new URLSearchParams(location.hash.slice(1));
    var initial = initialParameters.get('category') || 'all';
    var initialStatus = initialParameters.get('status') || 'all';
    apply(filters.includes(initial) ? initial : 'all', statuses.includes(initialStatus) ? initialStatus : 'all', initialParameters.get('page'));
  }

  function registerGlossary() {
    var article = document.querySelector('.markdown-body');
    if (!article) return;
    var terms = Object.keys(GLOSSARY).sort(function (a, b) { return b.length - a.length; });
    var expression = new RegExp('(' + terms.map(function (term) { return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g');
    var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (!node.parentElement.closest('a, code, pre, h1, h2, h3, h4, abbr, script, style') && expression.test(node.nodeValue)) nodes.push(node);
      expression.lastIndex = 0;
    }
    var added = 0;
    nodes.forEach(function (node) {
      if (added >= 36) return;
      var fragment = document.createDocumentFragment();
      var last = 0;
      node.nodeValue.replace(expression, function (term, _, offset) {
        fragment.appendChild(document.createTextNode(node.nodeValue.slice(last, offset)));
        var tip = document.createElement('abbr');
        tip.className = 'term-tip';
        tip.tabIndex = 0;
        tip.textContent = term;
        tip.setAttribute('data-definition', GLOSSARY[term]);
        tip.setAttribute('aria-label', term + '：' + GLOSSARY[term]);
        fragment.appendChild(tip);
        last = offset + term.length;
        added++;
        return term;
      });
      fragment.appendChild(document.createTextNode(node.nodeValue.slice(last)));
      node.replaceWith(fragment);
    });
  }

  function registerDiscovery() {
    var article = document.querySelector('.post-content');
    if (article) {
      var current = { path: location.pathname, title: document.querySelector('#seo-header') ? document.querySelector('#seo-header').textContent.trim() : document.title };
      try {
        var saved = JSON.parse(localStorage.getItem('yrk_current_read') || 'null');
        if (saved && saved.path !== current.path) localStorage.setItem('yrk_previous_read', JSON.stringify(saved));
        localStorage.setItem('yrk_current_read', JSON.stringify(current));
      } catch (_) {}
    }

    document.addEventListener('click', function (event) {
      var randomButton = event.target.closest('[data-random-post]');
      var continueButton = event.target.closest('[data-continue-reading]');
      if (!randomButton && !continueButton) return;
      if (continueButton) {
        try {
          var previous = JSON.parse(localStorage.getItem('yrk_previous_read') || 'null');
          location.href = previous && previous.path ? previous.path : '/archives/';
        } catch (_) { location.href = '/archives/'; }
        return;
      }
      randomButton.disabled = true;
      fetch('/data/posts.json').then(function (response) { return response.json(); }).then(function (posts) {
        var choices = posts.filter(function (post) { return post.path !== location.pathname; });
        location.href = choices[Math.floor(Math.random() * choices.length)].path;
      }).catch(function () { location.href = '/archives/'; });
    });
  }

  function registerExcerpts() {
    var article = document.querySelector('.markdown-body');
    var libraryButton = document.querySelector('[data-all-excerpts]');
    var articleButton = document.querySelector('[data-article-excerpts]');
    if (!article && !libraryButton && !articleButton) return;
    var storageKey = 'yrk_article_excerpts';

    function loadExcerpts() {
      try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
      catch (_) { return {}; }
    }

    function saveExcerpts(value) {
      try { localStorage.setItem(storageKey, JSON.stringify(value)); }
      catch (_) {}
    }

    function excerptTotal(map) {
      return Object.keys(map).reduce(function (total, path) {
        return total + (Array.isArray(map[path]) ? map[path].length : 0);
      }, 0);
    }

    function updateLibraryCount() {
      var map = loadExcerpts();
      var count = document.querySelector('[data-all-excerpt-count]');
      var articleCount = document.querySelector('[data-article-excerpt-count]');
      if (count) count.textContent = excerptTotal(map);
      if (articleCount) articleCount.textContent = Array.isArray(map[location.pathname]) ? map[location.pathname].length : 0;
    }

    function createLibraryDialog() {
      var dialog = document.createElement('dialog');
      dialog.className = 'knowledge-local-dialog excerpt-library-dialog';
      var heading = document.createElement('div');
      heading.className = 'knowledge-dialog-head';
      var title = document.createElement('h3');
      title.textContent = '我的摘录';
      var close = document.createElement('button');
      close.type = 'button';
      close.textContent = '×';
      close.setAttribute('aria-label', '关闭');
      close.onclick = function () { dialog.close(); };
      heading.append(title, close);
      dialog.appendChild(heading);
      dialog.addEventListener('close', function () { dialog.remove(); });
      document.body.appendChild(dialog);
      return dialog;
    }

    function sourceTitle(path, entries) {
      var titled = entries.find(function (entry) { return entry.title; });
      if (titled) return titled.title;
      if (path === location.pathname) {
        var heading = document.querySelector('#seo-header');
        if (heading) return heading.textContent.trim();
      }
      return '原文';
    }

    function openLibrary(onlyPath) {
      var map = loadExcerpts();
      var dialog = createLibraryDialog();
      var paths = Object.keys(map).filter(function (path) { return Array.isArray(map[path]) && map[path].length; });
      if (onlyPath) paths = paths.filter(function (path) { return path === onlyPath; });
      dialog.querySelector('h3').textContent = onlyPath ? '本篇摘录' : '我的摘录';
      if (!paths.length) {
        var empty = document.createElement('div');
        empty.className = 'excerpt-library-empty';
        empty.innerHTML = '<strong>还没有摘录</strong><span>在文章正文中选中文字，就能收藏到这里。</span>';
        dialog.appendChild(empty);
      }
      paths.forEach(function (path) {
        var entries = map[path];
        var articleTitle = sourceTitle(path, entries);
        var group = document.createElement('section');
        group.className = 'excerpt-library-group';
        var link = document.createElement('a');
        link.href = path;
        link.textContent = articleTitle;
        link.className = 'excerpt-library-title';
        group.appendChild(link);
        entries.forEach(function (entry, index) {
          var item = document.createElement('blockquote');
          var origin = document.createElement('small');
          origin.className = 'excerpt-library-source';
          origin.textContent = '来自《' + articleTitle + '》';
          var text = document.createElement('p');
          text.textContent = entry.text;
          var actions = document.createElement('div');
          var source = document.createElement('a');
          source.href = path;
          source.textContent = '回到原文';
          var remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = '删除';
          remove.onclick = function () {
            map[path].splice(index, 1);
            if (!map[path].length) delete map[path];
            saveExcerpts(map);
            dialog.close();
            updateLibraryCount();
            openLibrary(onlyPath);
          };
          actions.append(source, remove);
          item.append(origin, text, actions);
          group.appendChild(item);
        });
        dialog.appendChild(group);
      });
      dialog.showModal();
    }

    if (libraryButton) libraryButton.addEventListener('click', function () { openLibrary(); });
    if (articleButton) articleButton.addEventListener('click', function () { openLibrary(location.pathname); });
    if (article) document.addEventListener('mouseup', function () {
      var selection = window.getSelection();
      var selectedText = selection ? selection.toString().trim().replace(/\s+/g, ' ') : '';
      var old = document.querySelector('.excerpt-capture-button');
      if (old) old.remove();
      if (!selection || !selection.rangeCount || !selectedText || selectedText.length < 6 || selectedText.length > 500 || !article.contains(selection.anchorNode)) return;
      var rect = selection.getRangeAt(0).getBoundingClientRect();
      var capture = document.createElement('button');
      capture.type = 'button';
      capture.className = 'excerpt-capture-button';
      capture.textContent = '收藏摘录';
      capture.style.left = Math.min(window.innerWidth - 100, Math.max(8, rect.left + rect.width / 2 - 38)) + 'px';
      capture.style.top = Math.max(8, rect.top - 38) + 'px';
      capture.onmousedown = function (event) { event.preventDefault(); };
      capture.onclick = function () {
        var map = loadExcerpts();
        var path = location.pathname;
        var values = Array.isArray(map[path]) ? map[path] : [];
        if (!values.some(function (entry) { return entry.text === selectedText; })) {
          var heading = document.querySelector('#seo-header');
          values.push({ text: selectedText, title: heading ? heading.textContent.trim() : document.title, savedAt: Date.now() });
        }
        map[path] = values.slice(-30);
        saveExcerpts(map);
        updateLibraryCount();
        capture.textContent = '已收藏';
        setTimeout(function () { capture.remove(); }, 650);
        selection.removeAllRanges();
      };
      document.body.appendChild(capture);
    });
    updateLibraryCount();
  }

  function registerRailTools() {
    var rail = document.querySelector('.series-rail');
    if (!rail) return;
    var mastery = document.querySelector('[data-mastery]');
    var feedback = document.querySelector('.series-rail-feedback');
    var article = document.querySelector('.markdown-body');
    var path = location.pathname;

    function loadMap(key) {
      try { return JSON.parse(localStorage.getItem(key) || '{}'); }
      catch (_) { return {}; }
    }

    function saveMap(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (_) { return false; }
    }

    function showFeedback(message) {
      if (!feedback) return;
      feedback.textContent = message;
      clearTimeout(showFeedback.timer);
      showFeedback.timer = setTimeout(function () { feedback.textContent = ''; }, 1800);
    }

    function makeDialog(title) {
      var dialog = document.createElement('dialog');
      dialog.className = 'knowledge-local-dialog';
      var heading = document.createElement('div');
      heading.className = 'knowledge-dialog-head';
      var name = document.createElement('h3');
      name.textContent = title;
      var close = document.createElement('button');
      close.type = 'button';
      close.textContent = '×';
      close.setAttribute('aria-label', '关闭');
      close.onclick = function () { dialog.close(); };
      heading.append(name, close);
      dialog.appendChild(heading);
      dialog.addEventListener('close', function () { dialog.remove(); });
      document.body.appendChild(dialog);
      return dialog;
    }

    // 当前文章术语
    var termBox = document.querySelector('[data-article-terms]');
    var termSection = termBox && termBox.closest('.rail-terms');
    if (termBox && article) {
      var uniqueTerms = [];
      Array.prototype.forEach.call(article.querySelectorAll('.term-tip'), function (tip) {
        if (!uniqueTerms.some(function (entry) { return entry.name === tip.textContent; })) uniqueTerms.push({ name: tip.textContent, node: tip });
      });
      uniqueTerms.slice(0, 5).forEach(function (entry) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = entry.name;
        button.title = entry.node.dataset.definition || '';
        button.onclick = function () { entry.node.scrollIntoView({ behavior: 'smooth', block: 'center' }); entry.node.focus(); };
        termBox.appendChild(button);
      });
      if (termSection) termSection.hidden = uniqueTerms.length === 0;
    }

    // 掌握度
    var masteryMap = loadMap('yrk_article_mastery');
    if (mastery) {
      mastery.value = masteryMap[path] || 'unread';
      mastery.addEventListener('change', function () {
        masteryMap[path] = mastery.value;
        saveMap('yrk_article_mastery', masteryMap);
        showFeedback('掌握度已保存');
      });
    }

  }

  document.addEventListener('DOMContentLoaded', function () {
    registerHomeFilter();
    registerGlossary();
    registerDiscovery();
    registerExcerpts();
    registerRailTools();
  });
})();
