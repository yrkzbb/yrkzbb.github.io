# yrk's Blog

这是基于 [Hexo](https://hexo.io/) 与 Fluid 主题构建的个人博客。源码维护在 `source` 分支，GitHub Actions 校验并生成静态站点后，将产物发布到 `main` 分支。

站点地址：<https://yrkzbb.github.io/>

## 技术栈

- Node.js 22
- Hexo 7
- Fluid 主题
- GitHub Actions 与 GitHub Pages

## 本地开发

```bash
npm ci
npm run server
```

默认可通过 `http://localhost:4000/` 预览站点。修改配置或模板后如遇缓存问题，可先运行：

```bash
npm run clean
npm run server
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run new -- "文章标题"` | 创建文章草稿 |
| `npm run server` | 启动本地预览 |
| `npm run admin` | 启动带在线编辑入口的本地预览 |
| `npm run build` | 生成静态站点到 `public/` |
| `npm test` | 校验文章、链接和脚本语法 |
| `npm run verify` | 执行测试、构建、产物链接检查和站点审计 |
| `npm run lighthouse` | 执行 Lighthouse 质量检查 |
| `npm run check:markdown` | 检查中英文空格、列表及 Markdown 排版 |
| `npm run format:markdown` | 自动修正常见 Markdown 排版问题 |
| `npm run publish` | 本地生成并部署到配置的 Git 仓库 |

## 目录结构

```text
.
├── source/
│   ├── _posts/       # Markdown 文章
│   ├── admin/        # 在线写作台
│   ├── css/          # 站点自定义样式
│   ├── img/          # 图片资源
│   └── js/           # 站点交互脚本
├── scripts/          # Hexo 扩展与内容校验
├── themes/fluid/     # Fluid 主题及定制模板
├── tools/            # 链接、产物和性能检查工具
├── _config.yml       # Hexo 主配置
└── _config.fluid.yml # Fluid 主题配置
```

## 写作约定

文章放在 `source/_posts/`，并包含 Hexo Front Matter：

```yaml
---
title: 示例标题
date: 2026-01-01 12:00:00
categories:
  - 分类
tags:
  - 标签
---
```

文章固定链接由 `abbrlink` 生成。重命名 Markdown 文件不会改变已有文章地址，但请保留原 `abbrlink`。图片放在 `source/img/`，文章中以 `/img/...` 的站点绝对路径引用。

## 校验与发布

提交前运行：

```bash
npm run verify
```

推送到 `source` 分支后，[发布工作流](.github/workflows/publish.yml)会执行依赖安装、完整校验和 Lighthouse 检查。全部通过后，生成的 `public/` 内容会自动发布到 `main` 分支，GitHub Pages 随后更新线上站点。

在线写作台的使用和 Token 安全说明见 [ADMIN.md](ADMIN.md)。

## 阅读功能

文章页提供标题锚点复制、图片灯箱、专注阅读、章节进度、表格与代码工具、移动端工具栏、个人笔记及导出、表情反馈、段落勘误、主题配色和分享卡片。笔记、阅读反馈与配色均仅保存在访问者的浏览器中。

站点还会根据文章标签生成 `/knowledge-graph/` 知识图谱。GitHub Discussions 评论使用 Giscus；启用仓库 Discussions 并在 `_config.fluid.yml` 填写 `repo-id`、`category` 与 `category-id` 后即可嵌入评论区。
