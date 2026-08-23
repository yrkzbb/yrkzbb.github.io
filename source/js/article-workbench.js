(function () {
  "use strict";
  var article = document.querySelector(".markdown-body");
  if (!article) return;
  var path = location.pathname;

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text);
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return Promise.resolve();
  }

  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }
  function load(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (_) {
      return fallback;
    }
  }
  function toast(message) {
    var node =
      document.querySelector(".workbench-toast") ||
      document.createElement("div");
    node.className = "workbench-toast";
    node.textContent = message;
    if (!node.parentNode) document.body.appendChild(node);
    requestAnimationFrame(function () {
      node.classList.add("is-visible");
    });
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      node.classList.remove("is-visible");
    }, 1600);
  }
  function dialog(title, content) {
    var node = document.createElement("dialog");
    node.className = "article-tool-dialog";
    node.innerHTML =
      '<header><strong></strong><button type="button" aria-label="关闭">×</button></header><div class="article-tool-body"></div>';
    node.querySelector("strong").textContent = title;
    node.querySelector(".article-tool-body").appendChild(content);
    node.querySelector("button").onclick = function () {
      node.close();
    };
    node.addEventListener("close", function () {
      node.remove();
    });
    document.body.appendChild(node);
    node.showModal();
    return node;
  }

  // 标题锚点复制和章节进度
  var headings = Array.prototype.slice.call(article.querySelectorAll("h2, h3"));
  var sectionBar = document.createElement("div");
  sectionBar.className = "section-progress";
  sectionBar.innerHTML = "<span></span><small>正文开始</small>";
  document.body.appendChild(sectionBar);
  headings.forEach(function (heading) {
    if (!heading.id)
      heading.id = heading.textContent.trim().replace(/\s+/g, "-");
    var anchor = document.createElement("button");
    anchor.type = "button";
    anchor.className = "heading-anchor-copy";
    anchor.textContent = "#";
    anchor.setAttribute(
      "aria-label",
      "复制“" + heading.textContent.trim() + "”的链接",
    );
    anchor.onclick = function () {
      copyText(location.origin + location.pathname + "#" + heading.id).then(
        function () {
          toast("段落链接已复制");
        },
      );
    };
    heading.appendChild(anchor);
  });
  function updateSection() {
    var current = -1;
    headings.forEach(function (heading, index) {
      if (heading.getBoundingClientRect().top <= 120) current = index;
    });
    var percent = headings.length
      ? Math.max(0, ((current + 1) / headings.length) * 100)
      : 0;
    sectionBar.querySelector("span").style.width = percent + "%";
    sectionBar.querySelector("small").textContent =
      current >= 0
        ? headings[current].childNodes[0].textContent.trim() +
          " · " +
          Math.round(percent) +
          "%"
        : "正文开始";
    document
      .querySelectorAll("#toc a, .mobile-toc-content a")
      .forEach(function (link) {
        link.classList.toggle(
          "workbench-active",
          current >= 0 &&
            link.getAttribute("href") === "#" + headings[current].id,
        );
      });
  }
  window.addEventListener("scroll", updateSection, { passive: true });
  updateSection();

  // 图片灯箱
  var lightbox = document.createElement("dialog");
  lightbox.className = "article-lightbox";
  lightbox.innerHTML =
    '<button type="button" aria-label="关闭图片">×</button><figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(lightbox);
  lightbox.querySelector("button").onclick = function () {
    lightbox.close();
  };
  lightbox.onclick = function (event) {
    if (event.target === lightbox) lightbox.close();
  };
  article.querySelectorAll("img").forEach(function (image) {
    image.tabIndex = 0;
    image.classList.add("lightbox-enabled");
    function open(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      lightbox.querySelector("img").src = image.currentSrc || image.src;
      lightbox.querySelector("img").alt = image.alt;
      lightbox.querySelector("figcaption").textContent =
        image.alt || image.title || "";
      lightbox.showModal();
    }
    image.onclick = open;
    image.onkeydown = function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(event);
      }
    };
  });

  // 表格查看、复制和全屏
  article.querySelectorAll("table").forEach(function (table) {
    if (table.closest(".article-table-shell")) return;
    var shell = document.createElement("div");
    shell.className = "article-table-shell";
    var tools = document.createElement("div");
    tools.className = "article-table-tools";
    tools.innerHTML =
      '<button type="button" data-table-copy>复制表格</button><button type="button" data-table-full>全屏查看</button>';
    table.parentNode.insertBefore(shell, table);
    shell.append(tools, table);
    tools.querySelector("[data-table-copy]").onclick = function () {
      var text = Array.prototype.map
        .call(table.rows, function (row) {
          return Array.prototype.map
            .call(row.cells, function (cell) {
              return cell.textContent.trim();
            })
            .join("\t");
        })
        .join("\n");
      copyText(text).then(function () {
        toast("表格已复制");
      });
    };
    tools.querySelector("[data-table-full]").onclick = function () {
      shell.classList.toggle("is-fullscreen");
      document.body.classList.toggle(
        "table-fullscreen-open",
        shell.classList.contains("is-fullscreen"),
      );
      tools.querySelector("[data-table-full]").textContent =
        shell.classList.contains("is-fullscreen") ? "退出全屏" : "全屏查看";
    };
  });

  // 代码行链接与 diff 行强调
  article
    .querySelectorAll("figure.highlight, pre")
    .forEach(function (block, blockIndex) {
      var lines = block.querySelectorAll(".line");
      lines.forEach(function (line, lineIndex) {
        var id = "code-" + (blockIndex + 1) + "-L" + (lineIndex + 1);
        line.id = id;
        line.tabIndex = 0;
        line.setAttribute("title", "点击复制这一行的链接");
        line.onclick = function () {
          history.replaceState(null, "", "#" + id);
          copyText(location.href).then(function () {
            toast("代码行链接已复制");
          });
        };
        var value = line.textContent;
        if (/^\+[^+]/.test(value)) line.classList.add("diff-added");
        if (/^-[^-]/.test(value)) line.classList.add("diff-removed");
      });
    });

  // 专注模式
  function setFocus(enabled) {
    document.body.classList.toggle("focus-reading-mode", enabled);
    localStorage.setItem("yrk_focus_mode", enabled ? "1" : "0");
    document.querySelectorAll("[data-focus-mode]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(enabled));
      button.textContent = enabled ? "退出专注" : "专注阅读";
    });
  }
  function toggleFocus() {
    setFocus(!document.body.classList.contains("focus-reading-mode"));
  }

  // 个人笔记与导出
  function openNotes() {
    var notes = load("yrk_article_notes", {});
    var body = document.createElement("div");
    body.innerHTML =
      '<textarea rows="12" placeholder="记录你的理解、问题或复习要点…"></textarea><div class="article-dialog-actions"><button type="button" data-save>保存笔记</button><button type="button" data-export>导出全部笔记</button></div>';
    body.querySelector("textarea").value = notes[path] || "";
    var modal = dialog("个人笔记", body);
    body.querySelector("[data-save]").onclick = function () {
      notes[path] = body.querySelector("textarea").value.trim();
      if (!notes[path]) delete notes[path];
      store("yrk_article_notes", notes);
      toast("笔记已保存到本机");
      modal.close();
    };
    body.querySelector("[data-export]").onclick = function () {
      var blob = new Blob([JSON.stringify(notes, null, 2)], {
        type: "application/json",
      });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "yrk-blog-notes.json";
      link.click();
      URL.revokeObjectURL(link.href);
    };
  }

  // 表情反馈
  var feedback = document.createElement("section");
  feedback.className = "article-reactions";
  feedback.innerHTML =
    '<strong>这篇文章对你有帮助吗？</strong><div><button type="button" data-reaction="useful">👍 有帮助</button><button type="button" data-reaction="clear">💡 讲清楚了</button><button type="button" data-reaction="review">🤔 需要复习</button></div><small>反馈保存在你的浏览器中。</small>';
  article.parentNode.insertBefore(feedback, article.nextSibling);
  var reactions = load("yrk_article_reactions", {});
  feedback.querySelectorAll("[data-reaction]").forEach(function (button) {
    button.classList.toggle(
      "selected",
      reactions[path] === button.dataset.reaction,
    );
    button.onclick = function () {
      reactions[path] = button.dataset.reaction;
      store("yrk_article_reactions", reactions);
      feedback.querySelectorAll("button").forEach(function (item) {
        item.classList.toggle("selected", item === button);
      });
      toast("感谢你的反馈");
    };
  });

  // 段落勘误
  article.querySelectorAll("p").forEach(function (paragraph, index) {
    if (paragraph.closest("blockquote, .note")) return;
    var report = document.createElement("button");
    report.type = "button";
    report.className = "paragraph-report";
    report.textContent = "勘误";
    report.setAttribute("aria-label", "反馈第 " + (index + 1) + " 段的问题");
    report.onclick = function () {
      var title =
        "文章勘误：" + document.querySelector("#seo-header").textContent.trim();
      var excerpt = paragraph.textContent.trim().slice(0, 160);
      var url =
        "https://github.com/yrkzbb/yrkzbb.github.io/issues/new?title=" +
        encodeURIComponent(title) +
        "&body=" +
        encodeURIComponent(
          "文章：" +
            location.href +
            "\n\n相关段落：\n> " +
            excerpt +
            "\n\n问题描述：\n",
        );
      window.open(url, "_blank", "noopener");
    };
    paragraph.appendChild(report);
  });

  // 配色选择与分享卡片
  var palettes = {
    default: "",
    ocean: "#1677b3",
    violet: "#7557e8",
    forest: "#16856b",
    sunset: "#db5d3b",
  };
  function applyPalette(name) {
    document.documentElement.style.setProperty(
      "--reader-accent",
      palettes[name] || "#29d",
    );
    localStorage.setItem("yrk_reader_palette", name);
  }
  applyPalette(localStorage.getItem("yrk_reader_palette") || "default");
  function openPalette() {
    var body = document.createElement("div");
    body.className = "palette-options";
    Object.keys(palettes).forEach(function (name) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.palette = name;
      button.style.setProperty("--swatch", palettes[name] || "#29d");
      button.textContent = {
        default: "默认",
        ocean: "海洋",
        violet: "紫罗兰",
        forest: "森林",
        sunset: "日落",
      }[name];
      button.onclick = function () {
        applyPalette(name);
        toast("配色已切换");
      };
      body.appendChild(button);
    });
    dialog("主题配色", body);
  }
  function shareCard() {
    var canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    var ctx = canvas.getContext("2d");
    var gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#172033");
    gradient.addColorStop(
      1,
      getComputedStyle(document.documentElement)
        .getPropertyValue("--reader-accent")
        .trim() || "#7557e8",
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 64px sans-serif";
    var title = document.querySelector("#seo-header").textContent.trim();
    var words = title.match(/.{1,14}/g) || [title];
    words.slice(0, 3).forEach(function (line, index) {
      ctx.fillText(line, 90, 210 + index * 82);
    });
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText("yrk's Blog", 90, 525);
    ctx.fillText(location.host, 90, 570);
    var link = document.createElement("a");
    link.download = "article-share-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast("分享卡片已生成");
  }

  // 移动端阅读工具栏
  var toolbar = document.createElement("nav");
  toolbar.className = "mobile-reading-toolbar";
  toolbar.setAttribute("aria-label", "移动端阅读工具");
  toolbar.innerHTML =
    '<button type="button" data-mobile-toc>目录</button><button type="button" data-focus-mode>专注阅读</button><button type="button" data-notes>笔记</button><button type="button" data-palette>配色</button><button type="button" data-card>分享卡片</button>';
  document.body.appendChild(toolbar);
  toolbar.querySelector("[data-mobile-toc]").onclick = function () {
    var toc = document.querySelector(".mobile-toc-button");
    if (toc) toc.click();
  };
  toolbar.querySelector("[data-focus-mode]").onclick = toggleFocus;
  toolbar.querySelector("[data-notes]").onclick = openNotes;
  toolbar.querySelector("[data-palette]").onclick = openPalette;
  toolbar.querySelector("[data-card]").onclick = shareCard;
  // 桌面工具入口
  var desktop = document.createElement("div");
  desktop.className = "desktop-reading-tools";
  desktop.innerHTML =
    '<button type="button" data-focus-mode>专注阅读</button><button type="button" data-notes>个人笔记</button><button type="button" data-palette>配色</button><button type="button" data-card>分享卡片</button>';
  article.parentNode.insertBefore(desktop, article);
  desktop.querySelector("[data-focus-mode]").onclick = toggleFocus;
  desktop.querySelector("[data-notes]").onclick = openNotes;
  desktop.querySelector("[data-palette]").onclick = openPalette;
  desktop.querySelector("[data-card]").onclick = shareCard;
  setFocus(localStorage.getItem("yrk_focus_mode") === "1");
})();
