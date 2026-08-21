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
    var count = toolbar.querySelector('.home-filter-count');
    var pagination = document.querySelector('.home-pagination');
    var pageSize = 8;
    var currentFilter = 'all';
    var currentPage = 1;

    function matchingCards(filter) {
      return cards.filter(function (card) {
        var categories = card.dataset.categories.split(/\s+/).filter(Boolean);
        return filter === 'all' || categories.includes(filter);
      });
    }

    function updateAddress() {
      if (currentFilter === 'all' && currentPage === 1) {
        history.replaceState(null, '', location.pathname + location.search);
        return;
      }
      var parameters = new URLSearchParams();
      if (currentFilter !== 'all') parameters.set('category', currentFilter);
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

    function apply(filter, requestedPage) {
      currentFilter = filter;
      var matched = matchingCards(filter);
      var totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
      currentPage = Math.min(Math.max(Number(requestedPage) || 1, 1), totalPages);
      var first = (currentPage - 1) * pageSize;
      var visibleCards = matched.slice(first, first + pageSize);
      cards.forEach(function (card) { card.hidden = !visibleCards.includes(card); });
      toolbar.querySelectorAll('button').forEach(function (button) {
        var active = button.dataset.filter === filter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      count.textContent = matched.length + ' 篇 · ' + currentPage + ' / ' + totalPages + ' 页';
      renderPagination(totalPages);
      updateAddress();
    }
    toolbar.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-filter]');
      if (button) apply(button.dataset.filter, 1);
    });
    if (pagination) pagination.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-page]');
      if (!button || button.disabled) return;
      apply(currentFilter, Number(button.dataset.page));
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var initialParameters = new URLSearchParams(location.hash.slice(1));
    var initial = initialParameters.get('category') || 'all';
    apply(filters.includes(initial) ? initial : 'all', initialParameters.get('page'));
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

  function registerRailTools() {
    var rail = document.querySelector('.series-rail');
    if (!rail) return;
    var copyButton = document.querySelector('[data-copy-current]');
    var mastery = document.querySelector('[data-mastery]');
    var excerptButton = document.querySelector('[data-view-excerpts]');
    var excerptCount = document.querySelector('[data-excerpt-count]');
    var resumeButton = document.querySelector('[data-resume-reading]');
    var reviewList = document.querySelector('[data-quick-review]');
    var editReview = document.querySelector('[data-edit-review]');
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

    // 快速回顾：默认取前五个二级标题，可本地编辑
    var headings = article ? Array.prototype.slice.call(article.querySelectorAll('h2')).slice(0, 5) : [];
    var defaultReview = headings.map(function (heading) { return heading.textContent.replace(/#$/, '').trim(); });
    var reviewMap = loadMap('yrk_article_reviews');
    function currentReview() { return Array.isArray(reviewMap[path]) ? reviewMap[path] : defaultReview; }
    function renderReview() {
      if (!reviewList) return;
      reviewList.innerHTML = '';
      currentReview().slice(0, 5).forEach(function (text, index) {
        var item = document.createElement('li');
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.onclick = function () { if (headings[index]) headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        item.appendChild(button);
        reviewList.appendChild(item);
      });
    }
    if (editReview) editReview.addEventListener('click', function () {
      var dialog = makeDialog('编辑快速回顾');
      var hint = document.createElement('p');
      hint.textContent = '每行一条，最多保留 5 条；清空后保存可恢复自动生成。';
      var textarea = document.createElement('textarea');
      textarea.value = currentReview().join('\n');
      textarea.rows = 8;
      var actions = document.createElement('div');
      actions.className = 'knowledge-dialog-actions';
      var save = document.createElement('button');
      save.type = 'button';
      save.className = 'primary';
      save.textContent = '保存到本机';
      save.onclick = function () {
        var values = textarea.value.split('\n').map(function (value) { return value.trim(); }).filter(Boolean).slice(0, 5);
        if (values.length) reviewMap[path] = values;
        else delete reviewMap[path];
        saveMap('yrk_article_reviews', reviewMap);
        renderReview();
        dialog.close();
        showFeedback(values.length ? '快速回顾已保存' : '已恢复自动生成');
      };
      actions.appendChild(save);
      dialog.append(hint, textarea, actions);
      dialog.showModal();
      textarea.focus();
    });
    renderReview();

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

    // 本地摘录
    var excerptMap = loadMap('yrk_article_excerpts');
    function excerpts() { return Array.isArray(excerptMap[path]) ? excerptMap[path] : []; }
    function updateExcerptCount() { if (excerptCount) excerptCount.textContent = excerpts().length; }
    function openExcerpts() {
      var dialog = makeDialog('我的本地摘录');
      var list = document.createElement('div');
      list.className = 'knowledge-excerpt-list';
      if (!excerpts().length) {
        var empty = document.createElement('p');
        empty.textContent = '在正文中选中文字，即可收藏到这里。';
        list.appendChild(empty);
      }
      excerpts().forEach(function (entry, index) {
        var item = document.createElement('blockquote');
        var text = document.createElement('p');
        text.textContent = entry.text;
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '删除';
        remove.onclick = function () {
          excerptMap[path].splice(index, 1);
          saveMap('yrk_article_excerpts', excerptMap);
          updateExcerptCount();
          dialog.close();
          openExcerpts();
        };
        item.append(text, remove);
        list.appendChild(item);
      });
      dialog.appendChild(list);
      dialog.showModal();
    }
    if (excerptButton) excerptButton.addEventListener('click', openExcerpts);
    if (article) document.addEventListener('mouseup', function () {
      var selection = window.getSelection();
      var text = selection ? selection.toString().trim().replace(/\s+/g, ' ') : '';
      var old = document.querySelector('.excerpt-capture-button');
      if (old) old.remove();
      if (!text || text.length < 6 || text.length > 500 || !article.contains(selection.anchorNode)) return;
      var rect = selection.getRangeAt(0).getBoundingClientRect();
      var capture = document.createElement('button');
      capture.type = 'button';
      capture.className = 'excerpt-capture-button';
      capture.textContent = '收藏摘录';
      capture.style.left = Math.min(window.innerWidth - 100, Math.max(8, rect.left + rect.width / 2 - 38)) + 'px';
      capture.style.top = Math.max(8, rect.top - 38) + 'px';
      capture.onmousedown = function (event) { event.preventDefault(); };
      capture.onclick = function () {
        var values = excerpts();
        if (!values.some(function (entry) { return entry.text === text; })) values.push({ text: text, savedAt: Date.now() });
        excerptMap[path] = values.slice(-30);
        saveMap('yrk_article_excerpts', excerptMap);
        updateExcerptCount();
        capture.remove();
        selection.removeAllRanges();
        showFeedback('摘录已收藏');
      };
      document.body.appendChild(capture);
    });
    updateExcerptCount();

    // 阅读断点
    var checkpointMap = loadMap('yrk_article_checkpoints');
    var checkpoint = checkpointMap[path];
    if (resumeButton && checkpoint && checkpoint.y > 300) {
      resumeButton.hidden = false;
      resumeButton.textContent = '继续上次位置 ' + checkpoint.percent + '%';
      resumeButton.onclick = function () { window.scrollTo({ top: checkpoint.y, behavior: 'smooth' }); };
    }
    var checkpointTimer;
    function saveCheckpoint() {
      var scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      checkpointMap[path] = { y: Math.round(scrollY), percent: Math.min(100, Math.round(scrollY / scrollable * 100)), savedAt: Date.now() };
      saveMap('yrk_article_checkpoints', checkpointMap);
    }
    window.addEventListener('scroll', function () {
      clearTimeout(checkpointTimer);
      checkpointTimer = setTimeout(saveCheckpoint, 700);
    }, { passive: true });
    window.addEventListener('pagehide', saveCheckpoint);

    if (copyButton) copyButton.addEventListener('click', function () {
      navigator.clipboard.writeText(location.href).then(function () {
        showFeedback('链接已复制');
      }).catch(function () {
        showFeedback('复制失败，请手动复制');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    registerHomeFilter();
    registerGlossary();
    registerDiscovery();
    registerRailTools();
  });
})();
