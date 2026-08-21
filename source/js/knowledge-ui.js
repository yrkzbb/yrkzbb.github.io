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
    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card[data-topic]'));
    var count = toolbar.querySelector('.home-filter-count');
    function apply(filter) {
      var visible = 0;
      cards.forEach(function (card) {
        var show = filter === 'all' || card.dataset.topic === filter;
        card.hidden = !show;
        if (show) visible++;
      });
      toolbar.querySelectorAll('button').forEach(function (button) {
        var active = button.dataset.filter === filter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      count.textContent = visible + ' 篇';
      if (filter === 'all') history.replaceState(null, '', location.pathname + location.search);
      else history.replaceState(null, '', '#' + filter);
    }
    toolbar.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-filter]');
      if (button) apply(button.dataset.filter);
    });
    var initial = location.hash.slice(1);
    apply(['mysql', 'redis', 'network', 'os'].includes(initial) ? initial : 'all');
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

  document.addEventListener('DOMContentLoaded', function () {
    registerHomeFilter();
    registerGlossary();
    registerDiscovery();
  });
})();
