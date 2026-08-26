---
title: RabbitMQ
abbrlink: rabbitmq-notes
date: 2026-08-26 10:00:00
categories:
  - 消息队列
tags:
  - RabbitMQ
  - AMQP
  - 消息路由
---

### 1\. RabbitMQ 和 AMQP 是什么关系？

AMQP 是消息通信协议规范，RabbitMQ 是实现了 AMQP 的消息 Broker。

RabbitMQ 最常用的是 AMQP 0-9-1，同时也可通过插件等方式支持 AMQP 1.0、MQTT 和 STOMP。可以把 AMQP 理解为通信规则，把 RabbitMQ 理解为遵循这些规则并提供交换机、队列、路由和确认能力的具体产品，两者不是同一个概念。

### 2\. RabbitMQ 核心组件有哪些？

主要组件包括：

-   Producer：发布消息。
-   Exchange：接收消息并根据类型、routing key 和 binding 路由。
-   Queue：存储等待消费的消息。
-   Binding：定义 Exchange 到 Queue 的路由关系。
-   Consumer：订阅队列并处理消息。
-   Connection 和 Channel：TCP 连接及其上的轻量逻辑通道。
-   Virtual Host：隔离交换机、队列、权限等资源的逻辑空间。

消息通常由 Producer 发给 Exchange，再路由到 Queue，而不是直接发送给某个 Consumer。

### 3\. RabbitMQ 有哪几种交换机类型？

常见有四种：

-   `direct`：routing key 与 binding key 精确匹配。
-   `fanout`：忽略 routing key，广播到所有绑定队列。
-   `topic`：按点分隔的 routing key 做通配匹配，`*` 匹配一个单词，`#` 匹配零个或多个单词。
-   `headers`：根据消息头属性匹配，通常不依赖 routing key。

RabbitMQ 还有默认交换机及插件提供的其他类型。选型取决于是一对一路由、广播还是规则订阅。

### 4\. RabbitMQ 的特性你知道哪些？

RabbitMQ 的特点是 AMQP 路由模型灵活、客户端语言丰富，并支持持久化、Publisher Confirm、消费者 ACK、优先级、TTL、死信、流控和管理界面。

集群环境可以使用 quorum queue 提供复制和故障选主，也支持 Streams 处理可回放的大规模数据流。它适合业务消息和复杂路由，但最终吞吐、延迟和可靠性仍取决于队列类型、消息持久化、确认策略、磁盘和集群配置。

### 5\. RabbitMQ 的底层架构是什么？

客户端通常先建立 TCP Connection，再复用多个轻量 Channel。Producer 将消息发到 Exchange，Exchange 根据 Binding 路由到一个或多个 Queue，Consumer 从 Queue 获取消息并 ACK。

单个队列由一个节点上的 Leader 负责处理。经典队列默认不复制；quorum queue 基于 Raft 在多个节点保存副本并进行 Leader 选举。RabbitMQ 集群会同步交换机、绑定和用户等定义，但“加入集群”本身不代表所有队列消息都自动拥有副本，需要选择正确的队列类型和副本配置。

### 6\. 消息中间件 RabbitMQ 的可靠性保障怎么做？

需要覆盖完整链路：

-   Producer 开启 Publisher Confirm，处理 nack、超时和连接中断；不可路由消息可使用 mandatory return 或备用交换机发现。
-   Exchange、Queue 设置 durable，消息标记为持久化；但持久化仍应结合 Confirm 判断是否被 Broker 接受。
-   关键队列使用 quorum queue 和合理副本数，跨故障域部署。
-   Consumer 关闭不合适的自动 ACK，业务成功后手动 ACK；失败时重试或进入死信队列。
-   消费端保证幂等，并配合心跳、自动恢复、监控、对账和补偿。

网络故障可能导致“Broker 已处理但确认未到达”，所以可靠投递往往伴随重复消息。

### 7\. 讲一下 RabbitMQ 的延迟队列和死信机制。

死信是消息因被拒绝且不重新入队、TTL 到期、队列超长，或 quorum queue 超过投递次数限制后，被重新发布到配置的 Dead Letter Exchange，再按路由规则进入死信队列。

延迟队列常用“TTL + DLX”实现：消息先进入设置 TTL 的等待队列，到期成为死信后路由到实际消费队列。要注意普通队列中单条消息过期的检查可能受队头消息影响，不适合大量任意时间精度的定时任务。也可以使用延迟消息交换机插件；选择时要结合插件运维、可靠性、消息规模和版本能力。死信转发也不是天然零丢失，关键场景应使用合适的队列类型并做好监控和补偿。

