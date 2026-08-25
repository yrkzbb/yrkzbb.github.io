---
title: Docker
abbrlink: 40991
date: 2026-08-25 22:24:27
categories:
tags:
---

## Docker 原理与架构

### 1. Docker 底层依托于 Linux 怎么实现资源隔离的？

核心上，Docker 主要通过 Linux 的 `namespace`、`cgroup` 和联合文件系统实现隔离，再配合 capabilities、`seccomp` 等机制限制权限。

- `namespace` 隔离进程看到的系统资源，例如进程、网络、挂载点、主机名和用户。
- `cgroup` 限制并统计 CPU、内存、I/O、进程数等资源。
- 联合文件系统提供镜像分层和容器可写层。
- capabilities、`seccomp`、SELinux/AppArmor 用于缩小权限和系统调用范围。

容器仍与宿主机共享内核，所以这种隔离通常比虚拟机轻量，但边界也不同于独立内核的虚拟机。

### 2. 讲讲 cgroup v2.0。

`cgroup v2` 是 Linux 的统一资源控制体系。与 v1 可以为不同控制器建立多套层级不同，v2 默认把 CPU、内存、I/O、进程数等控制器组织在一棵统一层级树中，接口和资源分配语义更一致。

常见接口包括 `cpu.max`、`memory.max`、`memory.high`、`io.max` 和 `pids.max`。父 cgroup 通过 `cgroup.subtree_control` 向子层级开放控制器，并遵循“子节点不能突破父节点限制”的层级约束。它还改进了内存压力管理、委派和 PSI 等能力。Docker 设置的 `--cpus`、`--memory`、`--pids-limit` 等参数，最终会由运行时映射到相应的 cgroup 配置。

### 3. Docker 和虚拟机有什么区别？

核心区别是：容器共享宿主机内核，虚拟机通过 Hypervisor 运行完整的 Guest OS 和独立内核。

因此，容器镜像通常更小、启动更快、单位机器密度更高；虚拟机的隔离边界通常更强，并且能运行与宿主机不同的内核。实际使用中两者并不冲突，常见做法是在云虚拟机里运行容器，兼顾基础设施隔离与应用交付效率。

### 4. Docker 有哪几个核心组件？

从使用链路看，主要包括：

- Docker Client：接收 `docker` 命令，通过 API 与服务端交互。
- Docker Daemon（`dockerd`）：管理镜像、容器、网络和卷。
- `containerd`：负责容器生命周期、镜像内容和快照等底层管理。
- OCI Runtime（通常是 `runc`）：按照 OCI 规范创建容器进程并配置 namespace、cgroup。
- Registry：存储和分发镜像，例如 Docker Hub 或企业私有仓库。

Docker Desktop、Compose、BuildKit 属于常用配套能力，但不等同于每次创建容器都必经的运行时组件。

## 镜像与 Dockerfile

### 1. 镜像和容器有什么区别？

镜像是只读的应用交付模板，包含文件系统内容、启动命令和环境变量等元数据；容器是镜像的一次运行实例。

启动容器时，Docker 会在镜像只读层之上增加一个容器可写层。同一镜像可以创建多个相互独立的容器。删除容器后，它的可写层通常也会删除，因此需要长期保存的数据应放在卷或宿主机挂载目录中。

### 2. Docker 镜像的分层原理是什么？

Docker 镜像由多个不可变层叠加组成，每层记录相对上一层的文件变化，并通过内容摘要寻址。不同镜像可以复用相同层，从而减少存储和传输开销。

容器运行时在镜像层上增加可写层；修改下层文件时采用写时复制（Copy-on-Write），先把文件复制到上层再修改。需要注意，在新层里删除上一层的大文件并不会抹掉旧层中的数据，所以优化体积时应在同一个 `RUN` 中完成安装和缓存清理，或使用多阶段构建。

### 3. Dockerfile 常用指令有哪些？

常用指令包括：

- `FROM`：指定基础镜像并开始一个构建阶段。
- `RUN`：在构建过程中执行命令。
- `COPY`、`ADD`：向镜像加入文件。
- `WORKDIR`：设置后续指令的工作目录。
- `ENV`、`ARG`：分别设置运行时环境变量和构建参数。
- `CMD`、`ENTRYPOINT`：定义容器默认启动行为。
- `EXPOSE`：声明应用监听端口，但不会自动发布端口。
- `USER`：指定后续构建指令和容器进程使用的用户。
- `VOLUME`、`HEALTHCHECK`、`LABEL`：声明挂载点、健康检查和元数据。

### 4. Dockerfile 中 `CMD` 和 `ENTRYPOINT` 有什么区别？

`ENTRYPOINT` 更适合定义容器固定执行的程序，`CMD` 更适合提供默认命令或默认参数。

执行 `docker run image other-args` 时，镜像中的 `CMD` 会被命令行参数替换；exec 格式的 `ENTRYPOINT` 通常仍保留，命令行内容会作为它的参数。要替换 `ENTRYPOINT`，需要使用 `--entrypoint`。常见组合是：

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--spring.profiles.active=prod"]
```

两者都建议优先使用 JSON 数组的 exec 格式，让主进程正确接收停止信号。

### 5. Dockerfile 中 `COPY` 和 `ADD` 有什么区别？

普通文件复制优先使用 `COPY`，因为语义更明确。`COPY` 可从构建上下文、其他构建阶段或镜像中复制文件；`ADD` 除了复制，还支持自动解压本地 tar 归档，并可获取 URL 或 Git 仓库等远程源。

如果只是把项目文件放入镜像，使用 `COPY` 更容易预测。需要下载远程文件时，也常用 `RUN curl` 或 `RUN wget`，便于校验、解压和清理在同一层完成。

### 6. 什么是多阶段构建（multi-stage build）？有什么好处？

多阶段构建是在一个 Dockerfile 中使用多个 `FROM`，前面的阶段负责编译或测试，最终阶段只复制运行所需产物。

```dockerfile
FROM golang:1.25 AS builder
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /app

FROM alpine:3.22
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

这样可以避免把编译器、源码和构建缓存带入最终镜像，通常能减小体积和攻击面，同时仍保留可重复的构建过程。

### 7. 如何减小 Docker 镜像体积？

我通常从最终镜像实际需要的内容入手，而不是只看指令数量：

- 使用多阶段构建，只复制运行产物和必要依赖。
- 选择合适的小型基础镜像，但要确认 libc、证书、时区和排障工具是否满足需求。
- 使用 `.dockerignore` 排除 `.git`、日志、测试产物和本地依赖目录。
- 在同一个 `RUN` 中安装依赖并清理包管理器缓存、临时文件。
- 避免先复制整个项目再安装依赖，合理安排层次以复用构建缓存。
- 用 `docker image history` 等工具定位体积较大的层。

并不是基础镜像越小越好，还要综合兼容性、安全更新和可维护性。

### 8. `docker commit` 和 `docker build` 有什么区别？

`docker commit` 是把某个容器当前的可写层和部分配置保存为镜像，适合临时取证、调试或保存现场，但过程难复现，而且挂载卷中的数据不会被提交。

`docker build` 根据 Dockerfile 和构建上下文生成镜像，过程可审查、可版本管理、可重复，更适合开发、测试和生产交付。因此正式镜像通常使用 Dockerfile 构建，而不依赖手工修改容器后再 `commit`。

## 容器存储与网络

### 1. Docker 容器数据持久化有哪些方式？

主要方式是 volume 和 bind mount：

- volume 由 Docker 管理路径和生命周期，迁移、备份及跨容器共享相对规范，通常是生产环境的首选。
- bind mount 把宿主机指定文件或目录挂进容器，路径直观，适合开发时挂载源码或配置，但与宿主机目录结构耦合。
- `tmpfs` 只保存在宿主机内存中，容器停止后数据消失，适合敏感或临时数据，不属于持久化方案。

容器可写层也能保存数据到容器被删除之前，但不适合作为可靠的持久化存储。

### 2. Docker 的网络模式有哪些？

Docker Engine 常见网络驱动有：

- `bridge`：单机容器最常用，用户自定义 bridge 支持容器名 DNS 解析。
- `host`：容器直接共享宿主机网络命名空间，端口发布参数不再起隔离作用。
- `none`：只保留回环接口，不配置外部网络。
- `overlay`：用于多宿主机之间的容器或 Swarm 服务通信。
- `macvlan`：给容器分配独立 MAC，使其像物理网络中的设备。
- `ipvlan`：与 `macvlan` 类似，但共享父接口 MAC，可按二层或三层模式工作。

此外还有仅与其他容器共享网络命名空间的 `container:<容器>` 用法。具体选择取决于是否跨主机、网络隔离、性能和现有网络环境。

### 3. 同一个宿主机上的多个容器之间怎么通信？

推荐把容器连接到同一个用户自定义 bridge 网络，然后通过容器名或网络别名访问，不要依赖可能变化的容器 IP。

```bash
docker network create app-net
docker run -d --name db --network app-net mysql
docker run -d --name api --network app-net my-api
```

此时 `api` 可以用 `db:<容器端口>` 访问数据库。`-p` 是把端口发布给宿主机或外部访问，同一 Docker 网络内的容器通信通常不需要发布端口。若容器不在同一网络，也可以再用 `docker network connect` 接入。

## Docker Compose 与日常运维

### 1. Docker Compose 是什么？什么场景用？

Docker Compose 用一个 YAML 文件声明多容器应用的服务、网络、卷和配置，再通过 `docker compose up`、`down` 等命令统一管理。

它适合本地开发、自动化测试、演示环境以及单机上的多服务部署，例如同时启动 Web、数据库和缓存。它侧重多容器应用的定义与单机管理；涉及大规模跨节点调度、自动扩缩容和故障迁移时，通常使用 Kubernetes 等编排平台。

### 2. Docker 常用命令有哪些？

我常用的命令可以按对象分类：

- 容器：`docker run`、`ps`、`start`、`stop`、`restart`、`rm`、`exec`、`logs`、`inspect`、`stats`。
- 镜像：`docker build`、`pull`、`push`、`images`、`image rm`、`tag`、`history`。
- 网络和存储：`docker network ls/inspect/create`、`docker volume ls/inspect/create`。
- Compose：`docker compose up -d`、`ps`、`logs`、`down`。
- 排查和清理：`docker system df`、`docker system prune`。

实际操作前，我会先用 `ps`、`inspect` 或 `system df` 确认对象和影响范围。

### 3. 如何进入一个运行中的容器？

通常使用 `docker exec` 在运行中的容器里启动一个新进程：

```bash
docker exec -it <container> /bin/bash
```

精简镜像可能没有 Bash，可以改用 `/bin/sh`。`docker attach` 是连接容器原有主进程的标准输入输出，操作可能直接影响主进程，因此排查时一般优先使用 `exec`。

### 4. 容器启动后立刻退出，怎么排查？

容器是否存活取决于主进程，即 PID 1；主进程执行完成、崩溃或收到信号后，容器就会退出。我会按下面顺序排查：

1. 用 `docker ps -a` 查看状态和退出码。
2. 用 `docker logs <container>` 查看应用启动日志。
3. 用 `docker inspect <container>` 检查启动命令、环境变量、挂载、健康状态及 OOM 信息。
4. 核对 `ENTRYPOINT`、`CMD` 是否正确，程序是否以前台方式运行。
5. 检查配置、权限、端口、依赖服务和资源限制；退出码 `137` 常见于 `SIGKILL`，但仍要结合 OOM 状态和宿主机日志判断。

必要时可以覆盖入口命令启动 shell，或用同一镜像创建临时调试容器复现问题。

### 5. `docker run` 的常用参数有哪些？

常用参数包括：

- `-d`：后台运行；`-it`：分配终端并保持交互。
- `--name`：指定容器名；`--rm`：退出后自动删除容器。
- `-p 主机端口:容器端口`：发布端口。
- `-v` 或 `--mount`：挂载 volume、目录或文件，复杂挂载更推荐语义清晰的 `--mount`。
- `-e`、`--env-file`：传入环境变量。
- `--network`：加入指定网络。
- `--restart`：设置重启策略。
- `--cpus`、`--memory`、`--pids-limit`：设置资源限制。
- `--user`、`--read-only`、`--cap-drop`：收紧运行权限。

参数应按应用需求设置，例如数据库通常需要持久化挂载，服务进程通常还要配置资源上限和重启策略。

### 6. 如何清理 Docker 的无用镜像、容器和卷？

应先查看占用和待删除对象，再分类型清理：

```bash
docker system df
docker container prune
docker image prune -a
docker volume prune
docker network prune
```

也可以用 `docker system prune` 综合清理未使用对象；默认不会清理 volume，需要显式添加 `--volumes`。其中 `image prune -a` 会删除未被任何容器使用的镜像，而 `volume prune` 可能删除仍有业务数据但当前未挂载的卷，所以生产环境要先确认、备份，并可使用 `--filter` 缩小范围。

## 容器编排与生态

### 1. Docker 和 Kubernetes 是什么关系？

Docker 主要解决镜像构建、分发和单机容器运行；Kubernetes 负责在集群中声明、调度和管理容器化应用，包括服务发现、滚动更新、自愈和扩缩容。

Kubernetes 运行 Pod 时通过 CRI 对接 `containerd`、CRI-O 等容器运行时，并不要求安装 Docker Engine。Docker 构建出的 OCI 镜像仍然可以由 Kubernetes 使用。因此“移除 dockershim”不是 Kubernetes 不支持 Docker 镜像，而是取消了 kubelet 内置的 Docker Engine 适配层。
