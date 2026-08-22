(() => {
  "use strict";

  const config = {
    owner: "yrkzbb",
    repo: "yrkzbb.github.io",
    branch: "source",
    postsPath: "source/_posts",
    imagesPath: "source/img/posts",
  };
  const $ = (id) => document.getElementById(id);
  const state = {
    token: sessionStorage.getItem("yrk_blog_token") || "",
    posts: [],
    current: null,
    dirty: false,
    unknownFrontMatter: [],
  };

  const els = {
    loginView: $("loginView"),
    appView: $("appView"),
    loginForm: $("loginForm"),
    token: $("token"),
    loginError: $("loginError"),
    postList: $("postList"),
    search: $("searchInput"),
    empty: $("emptyView"),
    editor: $("editorView"),
    title: $("titleInput"),
    slug: $("slugInput"),
    date: $("dateInput"),
    categories: $("categoriesInput"),
    tags: $("tagsInput"),
    body: $("bodyInput"),
    preview: $("previewPane"),
    save: $("saveButton"),
    saveState: $("saveState"),
    dialog: $("confirmDialog"),
    image: $("imageInput"),
  };

  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
  function base64ToUtf8(text) {
    const binary = atob(text.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function esc(text = "") {
    return text.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function slugify(text) {
    return (
      text
        .trim()
        .replace(/[\\/:*?"<>|#%]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "") || "untitled"
    );
  }
  function nowForInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function setDirty(value) {
    state.dirty = value;
    els.saveState.textContent = value ? "有未保存的修改" : "已保存";
  }

  async function api(path, options = {}) {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}${path}`,
      {
        ...options,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${state.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(options.headers || {}),
        },
      },
    );
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || `GitHub 请求失败 (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  }

  function parseFrontMatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) return { data: {}, body: content, unknown: [] };
    const lines = match[1].split("\n");
    const data = {};
    const unknown = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^([\w-]+):\s*(.*)$/);
      if (!m) {
        unknown.push(lines[i]);
        continue;
      }
      const key = m[1];
      let value = m[2].replace(/^['"]|['"]$/g, "");
      if (["categories", "tags"].includes(key)) {
        const values = [];
        if (value)
          values.push(
            value
              .replace(/^\[|\]$/g, "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          );
        while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1]))
          values.push(lines[++i].replace(/^\s+-\s+/, "").trim());
        data[key] = values.flat();
      } else if (["title", "date"].includes(key)) data[key] = value;
      else {
        unknown.push(lines[i]);
        while (i + 1 < lines.length && /^\s+/.test(lines[i + 1]))
          unknown.push(lines[++i]);
      }
    }
    return { data, body: match[2], unknown };
  }

  function yamlText(value) {
    return /[:#\[\]{},&*!|>'"%@`]/.test(value) ? JSON.stringify(value) : value;
  }
  function buildDocument() {
    const lines = [
      "---",
      `title: ${yamlText(els.title.value.trim() || "未命名文章")}`,
    ];
    const list = (key, text) => {
      const values = text
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length) {
        lines.push(`${key}:`);
        values.forEach((v) => lines.push(`  - ${yamlText(v)}`));
      }
    };
    list("categories", els.categories.value);
    list("tags", els.tags.value);
    state.unknownFrontMatter
      .filter(Boolean)
      .forEach((line) => lines.push(line));
    const date = els.date.value
      ? els.date.value.replace("T", " ") + ":00"
      : nowForInput().replace("T", " ") + ":00";
    if (!state.unknownFrontMatter.some((line) => /^date:/.test(line)))
      lines.push(`date: ${date}`);
    lines.push("---", "", els.body.value.replace(/^\n+/, ""));
    return lines.join("\n").replace(/\s*$/, "") + "\n";
  }

  function markdown(text) {
    let html = esc(text);
    html = html
      .replace(
        /^```([^\n]*)\n([\s\S]*?)^```$/gm,
        (_, lang, code) =>
          `<pre><code data-lang="${esc(lang)}">${code}</code></pre>`,
      )
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>',
      )
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n+/g, "</p><p>")
      .replace(/\n/g, "<br>");
    return `<p>${html}</p>`;
  }

  async function loadPosts() {
    const files = await api(
      `/contents/${config.postsPath}?ref=${encodeURIComponent(config.branch)}`,
    );
    state.posts = files
      .filter((f) => f.type === "file" && f.name.endsWith(".md"))
      .map((f) => ({
        name: f.name,
        path: f.path,
        sha: f.sha,
        title: f.name.replace(/\.md$/, ""),
      }));
    renderPosts();
    const requested = new URLSearchParams(location.search).get("path");
    if (requested) {
      const post = state.posts.find(
        (p) => p.path === requested || p.name === requested.split("/").pop(),
      );
      if (post) await openPost(post);
    }
  }

  function renderPosts() {
    const q = els.search.value.trim().toLowerCase();
    els.postList.innerHTML = "";
    state.posts
      .filter((p) => `${p.title} ${p.name}`.toLowerCase().includes(q))
      .forEach((post) => {
        const item = document.createElement("div");
        item.className = `post-item${state.current?.path === post.path ? " active" : ""}`;
        item.innerHTML = `<strong>${esc(post.title)}</strong><small>${esc(post.name)}</small>`;
        item.onclick = () => openPost(post);
        els.postList.appendChild(item);
      });
  }

  async function openPost(post) {
    if (state.dirty && !confirm("当前修改尚未保存，确定离开吗？")) return;
    try {
      const file = await api(
        `/contents/${post.path}?ref=${encodeURIComponent(config.branch)}`,
      );
      const parsed = parseFrontMatter(base64ToUtf8(file.content));
      state.current = { ...post, sha: file.sha };
      state.unknownFrontMatter = parsed.unknown;
      post.title = parsed.data.title || post.title;
      els.title.value = post.title;
      els.slug.value = post.name.replace(/\.md$/, "");
      els.date.value = (parsed.data.date || "").replace(" ", "T").slice(0, 16);
      els.categories.value = (parsed.data.categories || []).join(", ");
      els.tags.value = (parsed.data.tags || []).join(", ");
      els.body.value = parsed.body;
      showEditor();
      setDirty(false);
      renderPosts();
    } catch (error) {
      toast(error.message);
    }
  }

  function showEditor() {
    els.empty.hidden = true;
    els.editor.hidden = false;
  }
  function newPost() {
    if (state.dirty && !confirm("当前修改尚未保存，确定新建吗？")) return;
    state.current = null;
    state.unknownFrontMatter = [];
    els.title.value = "";
    els.slug.value = "";
    els.date.value = nowForInput();
    els.categories.value = "";
    els.tags.value = "";
    els.body.value = "";
    showEditor();
    setDirty(true);
    renderPosts();
    els.title.focus();
  }

  async function savePost() {
    const slug = slugify(els.slug.value || els.title.value);
    const path = `${config.postsPath}/${slug}.md`;
    const old = state.current;
    const payload = {
      message: `${old ? "docs: update" : "docs: add"} ${els.title.value.trim() || slug}`,
      content: utf8ToBase64(buildDocument()),
      branch: config.branch,
    };
    if (old && old.path === path) payload.sha = old.sha;
    els.save.disabled = true;
    els.save.textContent = "正在保存…";
    try {
      if (old && old.path !== path) {
        const created = await api(`/contents/${path}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        await api(`/contents/${old.path}`, {
          method: "DELETE",
          body: JSON.stringify({
            message: `docs: rename ${old.name}`,
            sha: old.sha,
            branch: config.branch,
          }),
        });
        state.current = {
          name: `${slug}.md`,
          path,
          sha: created.content.sha,
          title: els.title.value.trim(),
        };
      } else {
        const saved = await api(`/contents/${path}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        state.current = {
          name: `${slug}.md`,
          path,
          sha: saved.content.sha,
          title: els.title.value.trim(),
        };
      }
      setDirty(false);
      toast("已提交，网站正在自动发布");
      await loadPosts();
      history.replaceState(
        null,
        "",
        `/admin/?path=${encodeURIComponent(path)}`,
      );
    } catch (error) {
      toast(error.message);
    } finally {
      els.save.disabled = false;
      els.save.textContent = "保存并发布";
    }
  }

  async function deletePost() {
    if (!state.current) return;
    els.dialog.showModal();
    const result = await new Promise((resolve) =>
      els.dialog.addEventListener(
        "close",
        () => resolve(els.dialog.returnValue),
        { once: true },
      ),
    );
    if (result !== "confirm") return;
    try {
      await api(`/contents/${state.current.path}`, {
        method: "DELETE",
        body: JSON.stringify({
          message: `docs: delete ${state.current.name}`,
          sha: state.current.sha,
          branch: config.branch,
        }),
      });
      state.current = null;
      state.dirty = false;
      els.editor.hidden = true;
      els.empty.hidden = false;
      toast("文章已删除并提交");
      await loadPosts();
    } catch (error) {
      toast(error.message);
    }
  }

  async function uploadImage(file) {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const name = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    try {
      await api(`/contents/${config.imagesPath}/${name}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `assets: add ${name}`,
          content: btoa(binary),
          branch: config.branch,
        }),
      });
      const snippet = `![${file.name}](/img/posts/${name})`;
      const start = els.body.selectionStart;
      els.body.setRangeText(snippet, start, els.body.selectionEnd, "end");
      setDirty(true);
      toast("图片已上传并插入文章");
    } catch (error) {
      toast(error.message);
    }
  }

  async function login(token) {
    state.token = token.trim();
    els.loginError.textContent = "";
    try {
      await api(
        `/contents/${config.postsPath}?ref=${encodeURIComponent(config.branch)}`,
      );
      sessionStorage.setItem("yrk_blog_token", state.token);
      const returnUrl = new URLSearchParams(location.search).get("return");
      if (returnUrl) {
        const target = new URL(returnUrl, location.origin);
        if (target.origin === location.origin) {
          location.href = target.href;
          return;
        }
      }
      els.loginView.hidden = true;
      els.appView.hidden = false;
      await loadPosts();
    } catch (error) {
      state.token = "";
      els.loginError.textContent = `连接失败：${error.message}`;
    }
  }

  els.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    login(els.token.value);
  });
  $("logoutButton").onclick = () => {
    sessionStorage.removeItem("yrk_blog_token");
    location.reload();
  };
  $("newButton").onclick = newPost;
  els.save.onclick = savePost;
  $("deleteButton").onclick = deletePost;
  els.search.oninput = renderPosts;
  els.image.onchange = () => uploadImage(els.image.files[0]);
  [els.title, els.slug, els.date, els.categories, els.tags, els.body].forEach(
    (el) => el.addEventListener("input", () => setDirty(true)),
  );
  document.querySelectorAll(".tab").forEach(
    (tab) =>
      (tab.onclick = () => {
        document
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.toggle("active", t === tab));
        const preview = tab.dataset.pane === "preview";
        els.body.hidden = preview;
        els.preview.hidden = !preview;
        if (preview) els.preview.innerHTML = markdown(els.body.value);
      }),
  );
  $("previewButton").onclick = () => {
    els.preview.innerHTML = markdown(els.body.value);
    els.body.hidden = true;
    els.preview.hidden = false;
    document
      .querySelectorAll(".tab")
      .forEach((t) =>
        t.classList.toggle("active", t.dataset.pane === "preview"),
      );
  };
  window.addEventListener("beforeunload", (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  if (state.token) login(state.token);
})();
