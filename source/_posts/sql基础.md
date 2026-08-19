---
title: sql基础
abbrlink: 60020
date: 2026-08-18 19:23:26
categories:
  - 数据库
tags:
  - sql
---

## 数据库类型与选型

### 1\. NoSQL 和 SQL 的区别是什么？

SQL 是关系型数据库，通常用二维表存储结构化数据，支持关联查询和 ACID 事务，适合订单、支付等强调强一致性的场景qwq

NoSQL 是非关系型数据库，可以采用键值、文档等数据模型，结构更灵活。它通常更容易水平扩展，很多场景会采用 BASE 和最终一致性，适合缓存、日志及高并发读写。

选哪个主要看一致性和扩展性要求。实际项目中经常组合使用，比如用 MySQL 保存核心业务数据，用 Redis 做缓存。

## 数据库设计

### 1\. 数据库三大范式是什么？

第一范式要求数据库表中的每个字段都是不可再分的原子值。

第二范式是在第一范式的基础上，要求非主属性必须完全依赖整个候选键，也就是消除部分依赖。

第三范式是在第二范式的基础上，要求非主属性不能依赖其他非主属性，也就是消除对候选键的传递依赖。

三大范式主要用于减少数据冗余以及插入、更新和删除异常。

MySQL 数据类型

### 1\. `INT(1)` 和 `INT(10)` 在 MySQL 中有什么不同？

`INT(1)` 和 `INT(10)` 的存储空间和取值范围完全相同，都是 4 字节的 `INT` 类型。括号里的数字不表示能存储的位数，而是显示宽度。

显示宽度通常只有配合 `ZEROFILL` 时才会体现，不足指定宽度的数字会在左侧补零。MySQL 8.0.17 已经弃用整数显示宽度和 `ZEROFILL`，因此在现代 MySQL 中一般直接使用 `INT` 即可。

### 2\. `TEXT` 数据类型可以无限大吗？

不可以，MySQL 的 `TEXT` 类型有明确的容量上限，而且限制按字节计算：

-   `TINYTEXT` 最大约 255 字节。
-   `TEXT` 最大约 64 KB。
-   `MEDIUMTEXT` 最大约 16 MB。
-   `LONGTEXT` 最大约 4 GB。

3\. IP 地址如何在数据库中存储？

IPv4 本质上是一个 32 位二进制数，在 MySQL 中主要有两种存储方式。

第一种是使用 `VARCHAR(15)` 保存字符串。它直观、读写方便，不需要额外转换，但占用空间较大，字符串比较和范围查询的效率较低。

第二种是使用 `INT UNSIGNED` 保存数值。它只占 4 字节，索引和范围查询更高效，可以通过 `INET_ATON()` 将 IPv4 字符串转换为整数，通过 `INET_NTOA()` 转回字符串。

如果还需要支持 IPv6，更推荐使用 `VARBINARY(16)`，并配合 `INET6_ATON()` 和 `INET6_NTOA()` 进行转换，这种方式可以同时兼容 IPv4 和 IPv6。

## SQL 查询

### 1\. MySQL 怎么连表查询？

MySQL 主要通过 `JOIN` 进行连表查询，并使用 `ON` 指定表之间的关联条件。

-   `INNER JOIN` 是内连接，只返回两张表中能够匹配的数据。
-   `LEFT JOIN` 是左外连接，返回左表的全部数据，右表没有匹配时对应字段为 `NULL`。
-   `RIGHT JOIN` 是右外连接，返回右表的全部数据，左表没有匹配时对应字段为 `NULL`。
-   `CROSS JOIN` 是交叉连接，返回两张表的笛卡尔积。

MySQL 不直接支持 `FULL OUTER JOIN`，如果需要全外连接，可以将左连接和右连接的结果通过 `UNION` 合并。实际使用时还要确保关联字段上有合适的索引，并避免遗漏连接条件产生大量笛卡尔积数据。

### 2\. MySQL 中 `IN` 和 `EXISTS` 有什么区别？

`IN` 用于判断某个值是否存在于列表或子查询结果集中，例如 `WHERE id IN (SELECT user_id FROM orders)`，写法直观，适合子查询结果集较小的场景。

`EXISTS` 只判断子查询是否至少返回一行，不关心具体返回值，例如 `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)`。它通常用于关联子查询，找到第一条匹配记录后就可以停止查找，适合外层结果集较小、子查询表较大且关联字段有索引的场景。

它们的主要区别是：`IN` 比较的是具体值，通常先得到子查询的结果集再进行匹配；`EXISTS` 判断的是记录是否存在，通常会针对外层查询的记录执行关联判断，命中一条即可返回。

选择时，如果子查询结果集较小，通常优先使用写法更直观的 `IN`；如果外层结果集较小、子查询表较大，并且关联字段有索引，可以优先考虑 `EXISTS`。不过现代 MySQL 优化器可能把两者转换成相近的执行计划，因此不能简单地认为谁一定更快，最终要结合索引和 `EXPLAIN` 的结果判断。

另外，`NOT IN` 遇到子查询结果中包含 `NULL` 时，可能导致条件结果为未知，从而查不到预期数据；`NOT EXISTS` 通常没有这个问题。因此处理反向匹配时，我更倾向使用 `NOT EXISTS`，或者先明确过滤掉 `NULL`。

## MySQL 常用函数

### 1\. MySQL 中的一些基本函数，你知道哪些？

MySQL 的常用函数主要可以分为以下几类：

-   字符串函数：`CONCAT()` 用于拼接字符串，`SUBSTRING()` 用于截取字符串，`REPLACE()` 用于替换内容，`LENGTH()` 返回字节数，`CHAR_LENGTH()` 返回字符数。
-   数值函数：`ABS()` 求绝对值，`ROUND()` 四舍五入，`CEIL()` 向上取整，`FLOOR()` 向下取整，`POWER()` 计算幂。
-   日期时间函数：`NOW()` 获取当前日期和时间，`CURDATE()` 获取当前日期，`DATE_FORMAT()` 格式化日期，`DATEDIFF()` 计算两个日期相差的天数。
-   聚合函数：`COUNT()` 统计数量，`SUM()` 求和，`AVG()` 求平均值，`MAX()` 和 `MIN()` 求最大值与最小值。
-   条件和空值处理函数：`IF()` 和 `CASE WHEN` 用于条件判断，`IFNULL()`、`COALESCE()` 用于处理 `NULL`。

需要注意，`COUNT(*)` 统计行数，而 `COUNT(字段)` 会忽略该字段为 `NULL` 的行；聚合函数通常会配合 `GROUP BY` 使用。

## SQL 实战题

### 1\. 给定学生成绩表 `student_score(stu_id, subject_id, score)`，查询总分排名第 5～10 名的学生 ID 及对应的总分

适用于 MySQL 8.0 及支持窗口函数的数据库：

```sql
WITH total_scores AS (
    -- 1. 计算每个学生的总分
    SELECT
        stu_id,
        SUM(score) AS total_score
    FROM student_score
    GROUP BY stu_id
),
ranked_students AS (
    -- 2. 按总分从高到低排名
    SELECT
        stu_id,
        total_score,
        RANK() OVER (ORDER BY total_score DESC) AS ranking
    FROM total_scores
)
-- 3. 查询总分排名第 5～10 名的学生
SELECT
    stu_id,
    total_score
FROM ranked_students
WHERE ranking BETWEEN 5 AND 10
ORDER BY ranking, stu_id;
```

这道题先按学生编号分组，使用 `SUM(score)` 计算每个学生的总分；再使用 `RANK()` 按总分降序排名；最后筛选排名在第 5～10 名的学生。

`RANK()` 会让总分相同的学生获得相同名次，并在并列后跳号，例如 `1、2、2、4`。最后按照名次和学生编号排序，可以保证结果的展示顺序稳定。

## MySQL 锁机制

### 1\. 如何用 MySQL 实现一个可重入锁？

MySQL 可以使用 `GET_LOCK()` 和 `RELEASE_LOCK()` 实现基于连接的可重入命名锁。

```sql
-- 获取名称为 order:1001 的锁，最多等待 10 秒
SELECT GET_LOCK('order:1001', 10);
```

`GET_LOCK()` 返回 `1` 表示获取成功，返回 `0` 表示等待超时，返回 `NULL` 表示发生错误。同一个数据库连接可以重复获取同一把锁，MySQL 会记录获取次数；获取几次，就需要释放几次：

```sql
SELECT GET_LOCK('order:1001', 10); -- 第一次获取
SELECT GET_LOCK('order:1001', 10); -- 同一连接重入

SELECT RELEASE_LOCK('order:1001'); -- 重入次数减 1
SELECT RELEASE_LOCK('order:1001'); -- 完全释放
```

完整使用示例：

```sql
-- 加锁
SELECT GET_LOCK('order:1001', 10);

-- 执行业务
START TRANSACTION;

UPDATE orders
SET status = 'PAID'
WHERE order_id = 1001;

COMMIT;

-- 解锁
SELECT RELEASE_LOCK('order:1001');
```

其他连接只有在最后一次释放后才能获取这把锁。实际使用时，加锁、执行业务和解锁必须使用同一个数据库连接，使用连接池时尤其需要注意；`COMMIT` 和 `ROLLBACK` 不会释放命名锁，但连接断开后 MySQL 会自动释放该连接持有的锁。锁名最好包含应用名和业务标识，例如 `my_app:order:1001`，避免不同业务使用相同的锁名。

## 数据完整性与约束

### 1\. MySQL 如何避免重复插入数据？

MySQL 避免重复插入数据主要有三种方式：

第一，给相关字段添加 `UNIQUE` 唯一约束。如果插入的数据违反唯一约束，MySQL 会直接报错，这是保证数据唯一性最可靠的方式。

第二，使用 `INSERT ... ON DUPLICATE KEY UPDATE`。当插入的数据发生主键或唯一键冲突时，不再新增记录，而是更新已有记录。

第三，使用 `INSERT IGNORE`。当发生重复键冲突时，MySQL 会忽略这条数据，不执行插入。

具体选择要看业务需求：需要保证唯一性就使用唯一约束；重复时需要更新就使用 `ON DUPLICATE KEY UPDATE`；只想忽略重复数据则使用 `INSERT IGNORE`。

### 2\. 说一下外键约束

外键约束用于维护表与表之间的引用关系，保证数据的完整性和一致性。子表中的外键值必须引用父表中已存在的主键或唯一键，从而避免产生无效的关联数据。

父表记录更新或删除时，可以设置限制操作、级联更新删除或将外键置空。外键能在数据库层面保证一致性，但也会增加表之间的耦合和维护成本，因此在高并发、分库分表等场景中，通常会通过应用逻辑维护关联关系。
