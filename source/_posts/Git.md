---
title: Git
abbrlink: 25246
date: 2026-08-25 20:16:54
categories:
  - 开发工具
tags:
  - Git
---

## Git 基础

### 1\. Git 有哪几个工作区域？它们之间是怎么流转的？

Git 本地主要有三个区域：**工作区、暂存区和本地仓库**；在团队协作中通常还会把远程仓库作为第四个区域来理解。

-   **工作区（Working Tree）**：实际编辑文件的目录；
-   **暂存区（Index）**：记录下一次提交准备包含的内容；
-   **本地仓库（Repository）**：`.git` 中保存的提交、分支和对象；
-   **远程仓库（Remote Repository）**：用于共享和协作的仓库，例如 GitHub 上的仓库。

常见流转过程是：

```text
工作区 --git add--> 暂存区 --git commit--> 本地仓库 --git push--> 远程仓库
工作区 <--git restore-- 暂存区
暂存区 <--git restore --staged-- HEAD
本地仓库 <--git fetch-- 远程仓库
```

### 2\. 什么是 `HEAD`？什么是游离 `HEAD`？

`HEAD` 表示当前检出的提交。正常情况下，`HEAD` 间接指向当前分支，分支再指向某个提交；创建新提交时，当前分支会向前移动。

游离 `HEAD`（detached HEAD）是指 `HEAD` 直接指向某个具体提交，而不是某个本地分支，例如：

```bash
git switch --detach <commit>
```

此时可以查看、修改和提交，但新提交不属于任何分支。如果之后切换到其他分支，新提交可能变得难以找到。需要保留时，应及时创建分支：

```bash
git switch -c new-branch
```

游离 `HEAD` 本身不是错误，适合临时查看历史版本、测试旧提交或构建指定版本。

### 3\. `git checkout`、`git switch`、`git restore` 有什么关系？

`git checkout` 是较早的多用途命令，既能切换分支，也能恢复文件；`git switch` 和 `git restore` 把这两类职责拆开，使意图更明确。

-   `git switch branch`：切换分支；
-   `git switch -c feature`：创建并切换分支；
-   `git restore file`：丢弃工作区中该文件的未暂存修改；
-   `git restore --staged file`：把文件移出暂存区，但保留工作区修改；
-   `git checkout branch`：传统的分支切换写法；

## 分支与提交整合

### 1\. `git rebase` 和 `merge` 有什么区别？

两者都能整合分支，但历史形态不同：**`merge` 保留真实的分叉关系，`rebase` 通过重放提交生成更线性的历史。**

假设 `feature` 和 `main` 都有新提交：

-   在 `feature` 上执行 `git rebase main`，会把 `feature` 的提交逐个重放到 `main` 最新提交之后。这些提交会得到新的哈希值。
-   在 `main` 上执行 `git merge feature`，如果不能 Fast-Forward，通常会创建一个合并提交，同时保留两条开发线。

`rebase` 便于整理本地功能分支，但会改写历史，不应随意变基已经共享、其他人正在依赖的提交。`merge` 不改写已有提交，更适合整合公共分支。实际选择应服从团队的分支和提交历史规范。

`merge` 会通过合并提交连接两条分支历史，不会改变原有提交，适合公共分支；`rebase` 会把当前分支的提交重新应用到目标分支之上，使历史更线性，但会改变提交哈希。因此共享历史通常用 merge，本地未共享的提交可以用 rebase 整理。  

### 2\. 如何使用 Git 命令合并两个分支？发生冲突如何解决？

如果要把 `feature` 合并到 `main`，我会先更新目标分支，再执行合并：

```bash
git switch main
git pull --ff-only
git merge feature
```

发生冲突后，Git 会暂停合并。我会按以下顺序处理：

```bash
git status                 # 查看冲突文件
# 编辑文件，处理 <<<<<<<、=======、>>>>>>> 标记
git add <已解决的文件>
git merge --continue       # 或在解决并暂存后执行 git commit
```

如果发现合并方向错误或暂时不应处理，可以执行 `git merge --abort` 回到合并前。推送前还应使用 `git diff --check`、`git log --graph` 等命令检查结果。

合并时先切换到目标分支，例如 `git switch main`，然后执行 `git merge test`。如果发生冲突，通过 `git status` 找到冲突文件，手动删除冲突标记并保留正确内容，再执行 `git add` 和 `git commit` 完成合并。如果不想继续，可以使用 `git merge --abort` 撤销本次合并。  

### 3\. 什么是 Fast-Forward 合并？它和普通 `merge` 有什么区别？

Fast-Forward 合并发生在目标分支没有产生新分叉时。Git 不需要创建合并提交，只需把目标分支指针向前移动到被合并分支的位置。

```bash
git merge feature          # 条件满足时默认可以 Fast-Forward
git merge --ff-only feature
git merge --no-ff feature  # 即使能快进也创建合并提交
```

### 4\. `git pull` 和 `git pull --rebase` 有什么区别？

`git pull` 本质上先执行 `fetch`，再整合远程跟踪分支。没有额外配置时通常通过 `merge` 整合；`git pull --rebase` 则把当前分支尚未推送的本地提交重放到远程最新提交之后。

### 5\. `git cherry-pick` 是做什么的？什么场景使用？

`git cherry-pick` 用于把一个或多个已有提交的变更应用到当前分支，并生成新的提交。

```bash
git switch release
git cherry-pick <commit>
```

它适合把某个独立 Bug 修复从开发分支同步到发布分支，或者取回误提交到错误分支的少量提交。发生冲突时，解决后执行 `git add` 和 `git cherry-pick --continue`；放弃则执行 `git cherry-pick --abort`。

### 6\. 如何删除本地分支和远程分支？

删除本地分支可以使用：

```bash
git branch -d feature
git branch -D feature
```

`-d` 会检查分支是否已合并，相对安全；`-D` 会强制删除，即使提交尚未合并。不能删除当前所在分支，需要先切换到其他分支。

删除远程分支使用：

```bash
git push origin --delete feature
```

其他人的本地仓库可能仍保留对应的远程跟踪引用，可以执行 `git fetch --prune` 清理。删除分支只是删除引用，只要提交仍能通过其他引用或 `reflog` 找到，数据不一定立即消失；操作前仍应确认分支是否需要保留。

## 远程仓库与团队协作

### 1\. `git pull` 和 `git fetch` 有什么区别？

-   `git fetch`：只把远程仓库的最新 commit 拉到本地的远程跟踪分支（比如 `origin/main`），**不会改动当前工作区和本地分支**，相当于只“下载”。拉下来之后你可以先用 `git log origin/main` 看看远程都改了什么，再决定要不要合并。
-   `git pull`：等价于 `git fetch + git merge FETCH_HEAD`，先拉取远程更新，然后立刻合并到当前分支。

日常开发中推荐先 `git fetch` 看一眼，再手动选择 `merge` 还是 `rebase`，这样可以避免被意外的远程改动拉出 merge commit 或冲突。

```bash

```

### 2\. 常见的 Git 工作流有哪些？

业界主流有四种：

-   **Git Flow**：有 `master`、`develop`、`feature/*`、`release/*`、`hotfix/*` 多种长期和临时分支，规则严谨，适合版本化发布的产品（比如客户端 App、大型企业产品）。缺点是流程太重，对快速迭代不友好。
-   **GitHub Flow**：只有 `main` 一个长期分支 + 多个短生命周期的 `feature` 分支，全部通过 Pull Request 合并。简单、灵活，适合持续部署的 Web 应用。
-   **GitLab Flow**：介于两者之间，在 GitHub Flow 的基础上加入了 `production`、`pre-production` 等环境分支，适合需要明确发布环境的场景。
-   **Trunk-Based Development（主干开发）**：所有人直接在 `main` 上开发，配合 feature flag 控制功能开关，长分支寿命不超过一两天。需要成熟的 CI/CD 和测试体系，是 Google、Facebook 等大厂主推的模式。

实际上中小团队用得最多的是 **GitHub Flow** 或者 Trunk-Based 的变体，Git Flow 现在已经被很多团队认为过时。

### 3\. Fork、Clone、Pull Request 在 GitHub 协作中分别是什么？

三者处于不同层次：

-   **Fork**：在 GitHub 服务端把他人的仓库复制到自己的账号下，形成独立仓库，常用于没有上游写权限的协作。
-   **Clone**：把某个远程仓库下载到本地，得到完整的 Git 仓库和工作区。
-   **Pull Request**：向目标仓库提出合并请求，用于展示差异、讨论、自动检查和代码评审；它是 GitHub 的协作功能，不是 Git 自身命令。

典型流程是 Fork 上游仓库，Clone 自己的 Fork，在功能分支提交并 Push，然后创建 Pull Request。为了同步上游更新，通常还会把原仓库配置为 `upstream` 远程地址。

## 差异与历史定位

### 1\. `git diff` 有哪些常见用法？

`git diff` 用于比较 Git 中不同状态或提交的内容，常见用法有：

```bash
git diff                       # 工作区与暂存区
git diff --staged              # 暂存区与 HEAD
git diff HEAD                  # 工作区整体与 HEAD
git diff <commit1> <commit2>   # 两个提交的快照
git diff main..feature         # 两个分支尖端的快照
git diff main...feature        # feature 与两者合并基点的差异
git diff --stat                # 只看文件和行数统计
git diff --name-only           # 只看文件名
git diff --check               # 检查空白错误和冲突标记
```

双点在 `diff` 中主要表示比较两个端点的快照，三点则以两者的 merge base 为起点，常用于查看功能分支相对主分支引入了哪些变化。它们与 `git log` 中双点、三点的集合语义不能简单混为一谈。

### 2\. `git log` 常用参数有哪些？

常用参数包括：

```bash
git log --oneline
git log --graph --decorate --all --oneline
git log -n 10
git log --author='Alice' --since='2026-01-01'
git log -- path/to/file
git log -p
git log --stat
git log -S '关键字符串'
git log -G '正则表达式'
```

`--oneline` 用于紧凑展示，`--graph` 显示分支拓扑，`--decorate` 显示分支和标签，`-p` 展示补丁，`--stat` 展示变更统计。`-S` 查找某个字符串出现次数发生变化的提交，`-G` 查找补丁文本匹配正则的提交，适合定位某段代码何时被引入或修改。

### 3\. `git tag` 有什么用？轻量标签和附注标签有什么区别？

`git tag` 用于给某个提交设置稳定名称，通常用于标记发布版本，例如 `v1.2.0`。

-   **轻量标签**只是指向提交的引用，创建方式是 `git tag v1.2.0`；
-   **附注标签**是独立的 Git 对象，包含标签作者、时间和说明，还可以签名，创建方式是 `git tag -a v1.2.0 -m 'release v1.2.0'`。

正式发布通常更适合附注标签，因为元数据更完整。标签默认不会随普通 `git push` 自动全部上传，可以执行：

```bash
git push origin v1.2.0
git push origin --tags
```

已经公开的标签应尽量保持不可变，避免删除后重新指向其他提交，否则不同使用者可能得到不一致的版本。

### 4\. `git blame` 和 `git bisect` 分别是做什么的？

`git blame` 用于查看文件每一行最后由哪个提交、作者在什么时候修改，适合找到相关变更背景：

```bash
git blame -L 20,40 path/to/file
```

它不能证明某个人应为问题负责，因为代码移动、重构和后续上下文变化都会影响结果，更合理的用途是找到提交后继续阅读评审和设计背景。

`git bisect` 使用二分查找在“已知正常”和“已知异常”的提交之间定位第一个坏提交：

```bash
git bisect start
git bisect bad
git bisect good <good-commit>
# 每轮测试后执行 git bisect good 或 git bisect bad
git bisect reset
```

如果有稳定的自动化测试，还可以使用 `git bisect run <test-command>` 自动定位。测试必须能可靠地区分好坏，否则结果会失真。

## 撤销、临时保存与安全

### 1\. `git reset` 的 `--soft`、`--mixed`、`--hard` 三种模式有什么区别？

三种模式都会移动当前分支指向，区别是是否同时重置暂存区和工作区：

| 模式 | 移动 `HEAD` | 重置暂存区 | 重置工作区 |
| --- | --- | --- | --- |
| `--soft` | 是 | 否 | 否 |
| `--mixed` | 是 | 是 | 否 |
| `--hard` | 是 | 是 | 是 |

-   `git reset --soft HEAD~1`：撤销最后一次提交，但修改仍保持暂存，适合重新组织提交；
-   `git reset --mixed HEAD~1`：默认模式，撤销提交并取消暂存，但保留工作区修改；
-   `git reset --hard HEAD~1`：让提交、暂存区和已跟踪文件的工作区内容都回到目标提交，可能丢失未提交修改。

`--hard` 通常不会删除普通未跟踪文件，但如果未跟踪文件阻碍写入目标路径，仍可能被删除。执行前应使用 `git status`、`git diff` 确认范围。已经推送并共享的提交不宜随意 `reset` 后强推。

### 2\. `git reset` 和 `git revert` 的区别是什么？

`reset` 通过移动分支指针改写当前分支历史，`revert` 则创建一个新提交来反向撤销指定提交的变更。

-   尚未共享的本地提交，可以使用 `reset` 整理或回退；
-   已经推送到公共分支的提交，通常优先使用 `revert`，因为它保留原历史，不要求其他协作者重写本地分支；
-   `revert` 可能发生冲突，尤其是后续提交继续修改了相同代码时。

```bash
git revert <commit>
git reset --mixed HEAD~1
```

两者都不是数据库意义上的“恢复任意现场”。操作后的实际内容还取决于目标提交、后续修改和冲突解决结果。

### 3\. `git commit --amend` 是做什么的？什么时候使用？

`git commit --amend` 用于用一个新提交替换当前分支的最后一次提交，可以修改提交说明，也可以把遗漏的暂存内容补进去。

```bash
git add forgotten-file
git commit --amend

git commit --amend --no-edit
```

`--no-edit` 表示沿用原提交说明。即使只修改说明，amend 后的提交哈希也会变化，因此它适合修正尚未共享的本地提交。已经推送且其他人可能基于它开发时，应避免随意 amend 后强推；如果确需修改，要与协作者协调，并优先使用 `--force-with-lease` 而不是无条件 `--force`。

### 4\. `git stash` 是做什么用的？常用命令有哪些？

`git stash` 用于临时保存尚未提交的工作区和暂存区修改，让工作区恢复到可切换或处理其他任务的状态。

```bash
git stash push -m '临时保存说明'
git stash push -u -m '包含未跟踪文件'
git stash list
git stash show -p stash@{0}
git stash apply stash@{0}
git stash pop
git stash drop stash@{0}
git stash branch recover-work stash@{0}
```

默认通常不包含未跟踪和被忽略文件；`-u` 包含未跟踪文件，`-a` 还包含被忽略文件。`apply` 应用后保留 stash，`pop` 成功应用后尝试删除它。Stash 适合短期上下文切换，不应替代有明确意义的提交；长期保存的重要工作更适合创建临时分支并提交。

### 5\. 不小心把敏感信息提交到 Git 怎么办？

第一步不是删文件，而是**立即撤销或轮换已经泄露的密码、密钥和令牌**。一旦进入提交或远程仓库，就应按已经泄露处理，因为删除历史也无法保证其他人的 Clone、Fork、缓存和日志中不存在副本。

处理流程通常是：

1.  立即在对应平台禁用旧凭据并生成新凭据，检查是否有异常使用；
2.  从当前版本删除敏感信息，改用环境变量或密钥管理服务，并更新 `.gitignore`；
3.  使用 `git filter-repo` 等工具从所有受影响的历史中清除内容；
4.  与团队协调后更新远程历史，要求协作者重新克隆或按指定方式清理旧对象；
5.  开启密钥扫描、提交前检查和最小权限策略，防止再次发生。

如果只是从最新提交删除文件，旧提交中仍然能找到敏感信息。历史重写会改变大量提交哈希，也无法撤回已经被第三方获取的数据，因此轮换凭据始终是最关键的动作。

### 6\. `.gitignore` 里加了文件为什么不生效？

最常见原因是文件已经被 Git 跟踪。`.gitignore` 只影响尚未跟踪的文件，不会让已提交或已暂存的文件自动停止跟踪。

可以在确认文件仍需保留在本地后执行：

```bash
git rm --cached path/to/file
git commit -m '停止跟踪本地配置文件'
```

如果要处理一个目录，可以使用 `git rm -r --cached directory`。还可以通过下面的命令检查是哪条规则生效：

```bash
git check-ignore -v path/to/file
```

其他常见原因包括规则路径写错、前导 `/` 的作用域不符合预期、后面的否定规则 `!` 覆盖了前面的规则，以及 `.git/info/exclude` 或全局 ignore 配置产生影响。文件若含敏感信息，仅停止跟踪还不够，仍需轮换凭据并处理历史。
