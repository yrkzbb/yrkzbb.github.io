# 博客在线写作台

后台地址：`https://yrkzbb.github.io/admin/`

## 第一次使用

1. 打开 GitHub 的 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. 将 **Repository access** 设为 **Only select repositories**，只选择 `yrkzbb.github.io`。
3. 在 **Repository permissions** 中把 **Contents** 设为 **Read and write**，其他权限保持默认。
4. 建议把有效期设为 30～90 天。创建后复制 Token，在后台登录页粘贴。

Token 只写入浏览器的 `sessionStorage`，不会进入博客源码，也不会发送给 GitHub 以外的服务。关闭该标签页或点击“退出”后会清除。

## 发布流程

写作台保存文章时，会通过 GitHub Contents API 修改 `source` 分支中的 `source/_posts/*.md`。随后 `.github/workflows/publish.yml` 自动运行 Hexo，将生成结果发布到 `main` 分支。

如果首次发布失败，请检查仓库 **Settings → Actions → General → Workflow permissions**，确认允许工作流拥有读写权限。GitHub Pages 的发布来源继续使用 `main` 分支根目录。

## 安全建议

- 不要把 Token 写进 Markdown、截图、聊天或仓库文件。
- 不要创建 classic token；Fine-grained token 可以把权限严格限制在当前仓库。
- Token 丢失或不再使用时，立即在 GitHub 设置中撤销。
- 后台地址对外可访问，但没有具有仓库写权限的 Token 就无法读取或修改文章。
