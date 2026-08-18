(function () {
  "use strict";
  var article = document.querySelector(".post-content .markdown-body");
  var sourceMeta = document.querySelector('meta[name="hexo-source"]');
  if (!article || !sourceMeta || !sourceMeta.content) return;
  var config = { owner: "yrkzbb", repo: "yrkzbb.github.io", branch: "source" };
  var sourcePath = "source/" + sourceMeta.content.replace(/^\/+/, "");
  var tokenKey = "yrk_blog_token";
  var editing = false;
  var originalHtml = "";
  var originalBody = "";
  var sourceFile = null;
  var frontMatter = "";
  function api(path, options) {
    options = options || {};
    return fetch(
      "https://api.github.com/repos/" + config.owner + "/" + config.repo + path,
      {
        method: options.method || "GET",
        body: options.body,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + (sessionStorage.getItem(tokenKey) || ""),
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    ).then(async function (response) {
      if (!response.ok) {
        var detail = await response.json().catch(function () {
          return {};
        });
        var error = new Error(
          response.status === 401
            ? "登录已过期，请重新验证 GitHub Token"
            : response.status === 403
              ? "Token 权限不足，请确认 Contents 为 Read and write"
              : detail.message || "GitHub 请求失败 (" + response.status + ")",
        );
        error.status = response.status;
        throw error;
      }
      return response.json();
    });
  }
  function decodeBase64(value) {
    var binary = atob(value.replace(/\n/g, ""));
    return new TextDecoder().decode(
      Uint8Array.from(binary, function (c) {
        return c.charCodeAt(0);
      }),
    );
  }
  function encodeBase64(value) {
    var bytes = new TextEncoder().encode(value);
    var binary = "";
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  function notify(message, type) {
    var old = document.querySelector(".inline-edit-toast");
    if (old) old.remove();
    var toast = document.createElement("div");
    toast.className = "inline-edit-toast " + (type || "");
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        toast.remove();
      }, 250);
    }, 2600);
  }
  function publishNotice(message, type, finished) {
    var toast = document.querySelector(".inline-edit-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "inline-edit-toast";
      document.body.appendChild(toast);
    }
    toast.className = "inline-edit-toast show " + (type || "publishing");
    toast.textContent = message;
    if (finished)
      setTimeout(function () {
        toast.classList.remove("show");
        setTimeout(function () {
          toast.remove();
        }, 250);
      }, 5000);
  }
  async function waitForPublish(previousMainSha) {
    publishNotice("✓ 修改已提交，正在自动发布…", "publishing", false);
    for (var attempt = 0; attempt < 30; attempt++) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 4000);
      });
      try {
        var latestMain = await api("/commits/main");
        if (latestMain.sha !== previousMainSha) {
          publishNotice(
            "✓ 发布成功，刷新页面即可看到最新内容",
            "success",
            true,
          );
          return;
        }
      } catch (_) {}
    }
    publishNotice("修改已提交，发布仍在后台进行", "publishing", true);
  }
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  async function ensureConverter() {
    await loadScript("/js/vendor/turndown.js", "TurndownService");
    await loadScript("/js/vendor/turndown-plugin-gfm.js", "turndownPluginGfm");
  }
  function htmlToMarkdown() {
    var clone = article.cloneNode(true);
    clone
      .querySelectorAll(
        '.headerlink, .copy-btn, .code-widget, h1 a[href^="#"], h2 a[href^="#"], h3 a[href^="#"], h4 a[href^="#"], h5 a[href^="#"], h6 a[href^="#"]',
      )
      .forEach(function (node) {
        node.remove();
      });
    var service = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });
    if (window.turndownPluginGfm) service.use(turndownPluginGfm.gfm);
    service.addRule("hexoHighlight", {
      filter: function (node) {
        return (
          node.nodeName === "FIGURE" && node.classList.contains("highlight")
        );
      },
      replacement: function (_, node) {
        var language =
          Array.from(node.classList).filter(function (name) {
            return name !== "highlight";
          })[0] || "";
        var code =
          node.querySelector(".code code") ||
          node.querySelector(".code pre") ||
          node.querySelector("pre") ||
          node;
        var holder = document.createElement("div");
        holder.innerHTML = code.innerHTML.replace(/<br\s*\/?\s*>/gi, "\n");
        var codeText = holder.textContent || "";
        return (
          "\n\n```" +
          language +
          "\n" +
          codeText.replace(/\n$/, "") +
          "\n```\n\n"
        );
      },
    });
    return (
      service
        .turndown(clone.innerHTML)
        .replace(/\n{3,}/g, "\n\n")
        .trim() + "\n"
    );
  }
  function yamlList(key) {
    var lines = frontMatter.split("\n");
    var values = [];
    for (var i = 0; i < lines.length; i++) {
      var match = lines[i].match(new RegExp("^" + key + ":\\s*(.*)$"));
      if (!match) continue;
      if (match[1])
        values = match[1]
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map(function (value) {
            return value.trim().replace(/^['"]|['"]$/g, "");
          })
          .filter(Boolean);
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1]))
        values.push(
          lines[++i]
            .replace(/^\s+-\s+/, "")
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        );
      break;
    }
    return values;
  }
  function setYamlList(text, key, values) {
    var lines = text.split("\n");
    var output = [];
    for (var i = 0; i < lines.length; i++) {
      if (new RegExp("^" + key + ":").test(lines[i])) {
        while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) i++;
        continue;
      }
      output.push(lines[i]);
    }
    var close = output.lastIndexOf("---");
    var additions = [];
    if (values.length) {
      additions.push(key + ":");
      values.forEach(function (value) {
        additions.push("  - " + value.replace(/[\r\n]/g, " "));
      });
    }
    output.splice.apply(output, [close, 0].concat(additions));
    return output.join("\n");
  }
  function updateFrontMatter() {
    var categories = document
      .querySelector('[data-meta="categories"]')
      .value.split(",")
      .map(function (v) {
        return v.trim();
      })
      .filter(Boolean);
    var tags = document
      .querySelector('[data-meta="tags"]')
      .value.split(",")
      .map(function (v) {
        return v.trim();
      })
      .filter(Boolean);
    frontMatter = setYamlList(frontMatter, "categories", categories);
    frontMatter = setYamlList(frontMatter, "tags", tags);
    if (!/\n$/.test(frontMatter)) frontMatter += "\n";
  }
  function validateMarkdown(markdown) {
    var errors = [];
    var warnings = [];
    var fences = (markdown.match(/^```/gm) || []).length;
    var originalFences = (originalBody.match(/^```/gm) || []).length;
    if (fences % 2 !== 0) errors.push("代码围栏 ``` 没有成对闭合");
    if (/\[\]\(#[^)]+\)/.test(markdown))
      errors.push("检测到由页面锚点产生的空链接");
    if (
      originalBody.length > 200 &&
      markdown.length < originalBody.length * 0.65
    )
      errors.push("正文长度异常减少超过 35%");
    if (fences !== originalFences) warnings.push("代码块数量发生变化");
    return { errors: errors, warnings: warnings };
  }
  function reviewMarkdown(markdown, warnings) {
    return new Promise(function (resolve) {
      var dialog = document.createElement("dialog");
      dialog.className = "inline-review-dialog";
      dialog.innerHTML =
        '<form method="dialog"><h3>保存前确认</h3><p class="inline-review-summary">请确认 Markdown 变化符合预期。</p><div class="inline-review-columns"><label>保存前<textarea readonly></textarea></label><label>保存后<textarea readonly></textarea></label></div><div class="inline-review-actions"><button value="cancel">返回修改</button><button value="confirm" class="confirm">确认保存并发布</button></div></form>';
      if (warnings.length)
        dialog.querySelector(".inline-review-summary").textContent =
          "注意：" + warnings.join("；");
      var areas = dialog.querySelectorAll("textarea");
      areas[0].value = originalBody;
      areas[1].value = markdown;
      document.body.appendChild(dialog);
      dialog.addEventListener(
        "close",
        function () {
          var confirmed = dialog.returnValue === "confirm";
          dialog.remove();
          resolve(confirmed);
        },
        { once: true },
      );
      dialog.showModal();
    });
  }
  async function restoreVersion(commitSha, dialog) {
    if (!confirm("确定恢复这个历史版本吗？当前版本仍可从 Git 历史中找回。"))
      return;
    var button = dialog.querySelector('[data-restore="' + commitSha + '"]');
    button.disabled = true;
    button.textContent = "正在恢复…";
    try {
      var previousMain = await api("/commits/main");
      var version = await api(
        "/contents/" + encodeURI(sourcePath) + "?ref=" + commitSha,
      );
      var latest = await api(
        "/contents/" + encodeURI(sourcePath) + "?ref=" + config.branch,
      );
      await api("/contents/" + encodeURI(sourcePath), {
        method: "PUT",
        body: JSON.stringify({
          message: "docs: restore article version " + commitSha.slice(0, 7),
          content: version.content.replace(/\n/g, ""),
          sha: latest.sha,
          branch: config.branch,
        }),
      });
      dialog.close();
      publishNotice("✓ 历史版本已恢复，正在自动发布…", "publishing", false);
      waitForPublish(previousMain.sha);
    } catch (error) {
      button.disabled = false;
      button.textContent = "恢复此版本";
      notify("恢复失败：" + error.message, "error");
    }
  }
  async function showHistory() {
    var dialog = document.createElement("dialog");
    dialog.className = "inline-history-dialog";
    dialog.innerHTML =
      '<div class="inline-history-head"><div><h3>文章历史版本</h3><p>最近 10 次修改，可选择任一版本恢复。</p></div><button type="button" data-close aria-label="关闭">×</button></div><div class="inline-history-list"><div class="inline-history-loading">正在加载历史…</div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector("[data-close]").onclick = function () {
      dialog.close();
    };
    dialog.addEventListener(
      "close",
      function () {
        dialog.remove();
      },
      { once: true },
    );
    dialog.showModal();
    try {
      var commits = await api(
        "/commits?path=" +
          encodeURIComponent(sourcePath) +
          "&sha=" +
          config.branch +
          "&per_page=10",
      );
      var list = dialog.querySelector(".inline-history-list");
      list.innerHTML = "";
      commits.forEach(function (commit, index) {
        var item = document.createElement("div");
        item.className = "inline-history-item";
        var date = new Date(commit.commit.author.date).toLocaleString("zh-CN", {
          hour12: false,
        });
        item.innerHTML =
          "<div><strong>" +
          (index === 0 ? "当前版本 · " : "") +
          commit.sha.slice(0, 7) +
          "</strong><span></span><small></small></div>" +
          (index === 0
            ? ""
            : '<button type="button" data-restore="' +
              commit.sha +
              '">恢复此版本</button>');
        item.querySelector("span").textContent = commit.commit.message;
        item.querySelector("small").textContent =
          date + " · " + commit.commit.author.name;
        var restore = item.querySelector("[data-restore]");
        if (restore)
          restore.onclick = function () {
            restoreVersion(commit.sha, dialog);
          };
        list.appendChild(item);
      });
      if (!commits.length)
        list.innerHTML =
          '<div class="inline-history-loading">暂无历史版本</div>';
    } catch (error) {
      dialog.querySelector(".inline-history-list").innerHTML =
        '<div class="inline-history-loading">加载失败：' +
        error.message.replace(/[<>]/g, "") +
        "</div>";
    }
  }
  function makeToolbar() {
    var toolbar = document.createElement("div");
    toolbar.className = "inline-edit-toolbar";
    toolbar.innerHTML =
      '<div class="inline-edit-meta" hidden><label>分类<input data-meta="categories" placeholder="多个分类用逗号分隔"></label><label>标签<input data-meta="tags" placeholder="多个标签用逗号分隔"></label></div><div class="inline-edit-status"><span class="inline-edit-dot"></span>正在原位编辑</div><div><button type="button" data-action="history">历史版本</button><button type="button" data-action="meta">分类与标签</button><button type="button" data-action="cancel">取消</button><button type="button" class="save" data-action="save">保存并发布</button></div>';
    toolbar.querySelector('[data-meta="categories"]').value =
      yamlList("categories").join(", ");
    toolbar.querySelector('[data-meta="tags"]').value =
      yamlList("tags").join(", ");
    toolbar.querySelector('[data-action="history"]').onclick = showHistory;
    toolbar.querySelector('[data-action="meta"]').onclick = function () {
      var panel = toolbar.querySelector(".inline-edit-meta");
      panel.hidden = !panel.hidden;
    };
    toolbar.querySelector('[data-action="cancel"]').onclick = cancelEditing;
    toolbar.querySelector('[data-action="save"]').onclick = saveEditing;
    document.body.appendChild(toolbar);
  }
  async function startEditing() {
    if (editing) return;
    if (!sessionStorage.getItem(tokenKey)) {
      location.href = "/admin/?return=" + encodeURIComponent(location.href);
      return;
    }
    editLink.classList.add("loading");
    editLink.textContent = "正在载入…";
    try {
      sourceFile = await api(
        "/contents/" +
          encodeURI(sourcePath) +
          "?ref=" +
          encodeURIComponent(config.branch),
      );
      var documentText = decodeBase64(sourceFile.content);
      var match = documentText.match(
        /^(---\s*\n[\s\S]*?\n---\s*\n?)([\s\S]*)$/,
      );
      frontMatter = match ? match[1] : "";
      originalBody = match ? match[2] : documentText;
      originalHtml = article.innerHTML;
      editing = true;
      article.querySelectorAll(".headerlink").forEach(function (node) {
        node.setAttribute("contenteditable", "false");
      });
      article.contentEditable = "true";
      article.classList.add("inline-editing");
      article.focus();
      editLink.hidden = true;
      makeToolbar();
      notify("现在可以直接点击正文进行修改");
    } catch (error) {
      if (/Bad credentials|401/.test(error.message))
        sessionStorage.removeItem(tokenKey);
      notify("无法进入编辑：" + error.message, "error");
      editLink.classList.remove("loading");
      editLink.textContent = "✎ 直接编辑";
    }
  }
  function cancelEditing() {
    if (!editing || confirm("放弃当前未保存的修改吗？")) {
      article.innerHTML = originalHtml;
      article.contentEditable = "false";
      article.classList.remove("inline-editing");
      var toolbar = document.querySelector(".inline-edit-toolbar");
      if (toolbar) toolbar.remove();
      editLink.hidden = false;
      editLink.classList.remove("loading");
      editLink.textContent = "✎ 直接编辑";
      editing = false;
    }
  }
  async function saveEditing() {
    var button = document.querySelector(".inline-edit-toolbar .save");
    button.disabled = true;
    button.textContent = "正在检查…";
    try {
      await ensureConverter();
      var markdown = htmlToMarkdown();
      var validation = validateMarkdown(markdown);
      if (validation.errors.length)
        throw new Error("安全检查未通过：" + validation.errors.join("；"));
      var confirmed = await reviewMarkdown(markdown, validation.warnings);
      if (!confirmed) {
        button.disabled = false;
        button.textContent = "保存并发布";
        return;
      }
      button.textContent = "正在保存…";
      updateFrontMatter();
      var previousMain = await api("/commits/main");
      await api("/contents/" + encodeURI(sourcePath), {
        method: "PUT",
        body: JSON.stringify({
          message: "docs: update article inline",
          content: encodeBase64(frontMatter + markdown),
          sha: sourceFile.sha,
          branch: config.branch,
        }),
      });
      article.contentEditable = "false";
      article.classList.remove("inline-editing");
      var toolbar = document.querySelector(".inline-edit-toolbar");
      if (toolbar) toolbar.remove();
      editLink.hidden = false;
      editLink.classList.remove("loading");
      editLink.textContent = "✎ 直接编辑";
      editing = false;
      originalHtml = article.innerHTML;
      originalBody = markdown;
      waitForPublish(previousMain.sha);
    } catch (error) {
      notify("保存失败：" + error.message, "error");
      button.disabled = false;
      button.textContent = "保存并发布";
    }
  }
  var editLink = document.createElement("button");
  editLink.type = "button";
  editLink.className = "blog-edit-link";
  editLink.textContent = sessionStorage.getItem(tokenKey)
    ? "✎ 直接编辑"
    : "管理员登录 · 编辑";
  editLink.title = "在当前页面直接编辑正文";
  editLink.onclick = startEditing;
  article.parentNode.insertBefore(editLink, article);
  window.addEventListener("beforeunload", function (event) {
    if (editing) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
