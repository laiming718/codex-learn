# 我的专业词库 Web App

这是一个长期使用的个人专业词库项目，用来积累 AI、编程、英语学习和日常协作中遇到的英文词汇。它从最早的本地 `vocabulary.html` 原型迁移而来，现在已经变成可以在 Mac mini 上运行、手机和电脑共享同一套学习状态的局域网 Web App。

## 项目定位

- 长期维护的个人词库，不是一次性 demo。
- 当前优先服务于局域网访问：Mac、手机、平板在同一网络下使用同一套数据。
- 暂不配置域名，暂不做公网访问。
- 当前数据以 SQLite 保存在本机，未来可以再考虑云端部署、账号登录、自动备份和多端同步。

## 当前架构

- 前端：Next.js + React
- 后端：Next.js API Routes
- 数据库：SQLite
- 运行机器：Mac mini
- 运行端口：`3030`
- 自启动方式：macOS LaunchAgent

简单理解：

- 浏览器负责展示词库和复习界面。
- Next.js 服务负责接收查询、状态切换和复习结果。
- SQLite 保存词条、学习状态和复习记录。
- 手机和电脑访问同一个 Mac mini 服务，所以看到的是同一套状态。

## 关键目录

```text
vocabulary-web/
  app/                       Next.js 页面和 API
  app/api/entries/           词条列表、学习状态 API
  app/api/review/            复习队列、复习结果 API
  components/                页面主要组件
  lib/                       数据库、复习时间、类型定义、仓库逻辑
  scripts/                   数据导入脚本
  data/                      SQLite 数据库目录
  launchd/                   开机自启动配置备份
  logs/                      LaunchAgent 运行日志
  README.md                  当前说明文档
```

重要文件：

- `components/vocabulary-app.tsx`：词库页面和复习页面的主要交互逻辑。
- `lib/db.ts`：SQLite 初始化和表结构。
- `lib/repository.ts`：词条查询、排序、状态切换、复习结果写入。
- `lib/time.ts`：复习时间机制，包括北京时间 `06:00` 切天。
- `scripts/import-vocabulary.ts`：历史迁移脚本，日常使用不需要运行。
- `scripts/collect-term.ts`：手动写入暂存词的辅助脚本。
- `scripts/query-collected-terms.ts`：查询 Codex / OpenClaw 最近或当天收集的新词。
- `scripts/vocabulary-daily-report.mjs`：生成昨日 01:00 到今日 01:00 收集批次的词库日报，供 OpenClaw 微信定时推送使用。
- `launchd/com.laiming.vocabulary-web.plist`：自启动配置模板。

## 访问地址

本机访问：

```text
http://localhost:3030
```

局域网访问：

```text
http://你的 Mac mini 局域网 IP:3030
```

当前曾使用的局域网 IP：

```text
http://192.168.5.22:3030
```

如果手机打不开，优先检查：

- 手机和 Mac mini 是否在同一个 Wi-Fi / 局域网。
- Mac mini 是否开机并已登录当前用户。
- 服务是否正在运行。
- 路由器或系统防火墙是否拦截了 `3030` 端口。

## 手动启动

第一次安装依赖：

```bash
npm install
```

开发模式启动：

```bash
npm run dev
```

生产模式构建：

```bash
npm run build
```

生产模式启动：

```bash
npm run start
```

说明：

- `npm run dev` 适合开发和调试。
- `npm run build` 会生成 `.next` 构建产物。
- `npm run start` 依赖 `.next`，适合长期运行。

## 开机自启动

当前已经配置用户级 `LaunchAgent`，用于在 Mac mini 登录当前用户后自动启动词库服务。

系统实际配置位置：

```text
~/Library/LaunchAgents/com.laiming.vocabulary-web.plist
```

项目内备份位置：

```text
launchd/com.laiming.vocabulary-web.plist
```

服务运行方式：

```bash
npm run start
```

查看服务状态：

```bash
launchctl print gui/501/com.laiming.vocabulary-web
```

立即重启服务：

```bash
launchctl kickstart -k gui/501/com.laiming.vocabulary-web
```

停止自启动服务：

```bash
launchctl bootout gui/501 ~/Library/LaunchAgents/com.laiming.vocabulary-web.plist
```

重新安装自启动配置：

```bash
cp launchd/com.laiming.vocabulary-web.plist ~/Library/LaunchAgents/com.laiming.vocabulary-web.plist
launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.laiming.vocabulary-web.plist
launchctl kickstart -k gui/501/com.laiming.vocabulary-web
```

代码修改后，如果自启动服务运行的是生产模式，需要执行：

```bash
npm run build
launchctl kickstart -k gui/501/com.laiming.vocabulary-web
```

## 数据说明

数据库位置：

```text
data/vocabulary.sqlite
```

SQLite 还可能生成：

```text
data/vocabulary.sqlite-shm
data/vocabulary.sqlite-wal
```

这些是 SQLite 的正常运行文件，用来提高写入可靠性和性能。

历史说明：

- 这个项目最早做过本地单文件 `vocabulary.html` 版本。
- 旧版 HTML 只是原型阶段产物，现在已经迁移为 `vocabulary-web`。
- 当前以 `data/vocabulary.sqlite` 作为主数据，不再依赖旧版 HTML 文件或旧版 CSV 文件。

注意：

- `data/*.sqlite`、`data/*.sqlite-shm`、`data/*.sqlite-wal` 不提交到 Git。
- GitHub 保存代码，不自动保存本地数据库。
- 词库长期使用后，需要单独设计备份方案。

## 已实现功能

- 词库列表
- 中英文搜索
- 类型筛选
- 学习状态筛选
- 已学会 / 未学会切换
- 顶部统计：总词库、已学会、未学会、待复习
- 复习模式
- 复习结果：没记住 / 有点印象 / 记住了
- 复习时间机制：北京时间 `06:00` 切天
- 单词朗读
- 例句朗读，例句语速 `0.7`
- 手机和电脑共享同一套服务端状态
- Mac mini 开机后自动启动本地服务

## 自动收集陌生词链路

当前已经接入 Codex 和 OpenClaw 的对话侧自动收集。这个链路的目标是：在日常对话中静默收集有学习价值的英文词，先进入本地暂存表，再由定时任务整理成完整词条，最后写入正式词库。

完整链路：

```text
Codex / OpenClaw 对话
  -> 本地 collected_terms 暂存表
  -> 去重和过滤
  -> OpenClaw 每天凌晨 1 点自动生成完整词条并入库
  -> 本地正式词库 entries
  -> OpenClaw 每天早上 9 点推送微信日报
```

暂存表位置：

```text
data/vocabulary.sqlite -> collected_terms
```

暂存表只保存轻量字段，例如：

- `term`：原始英文词
- `normalized_term`：归一化后的去重键
- `simple_translation`：简单翻译
- `source`：来源，`codex` / `openclaw` / `both`
- `status`：`pending` / `known` / `imported` / `ignored`
- `seen_count`：出现次数
- `context_sample`：上下文片段
- `processed_at`：处理时间
- `entry_id`：入库后关联的正式词条

当前收集规则：

- 明确问“这个词什么意思”时，普通英文词和专业词都可以收集。
- Codex 回复侧和 OpenClaw 回复侧会静默收集一小批常见高频词和技术词。
- 日常高频词不作为噪音排除，因为它们对英语基础学习有价值。
- `snake_case` 和 `table.field` 这类低价值结构化标识符会被排除，例如 `app_id`、`message_sent`、`processed_at`、`collected_terms.status`。
- 收集侧和入库侧都使用同一类过滤边界，避免收集正常、入库误杀。

查询最近收集的新词：

```bash
npm run query-collected -- --range recent --source all
```

查询今天 Codex 收集的新词：

```bash
npm run query-collected -- --range today --source codex
```

手动生成词库日报：

```bash
npm run daily-report
```

临时测试滚动窗口时仍可使用：

```bash
npm run daily-report -- --hours 24
```

OpenClaw 定时任务：

- `词库自动入库`：每天凌晨 `01:00 Asia/Shanghai`，读取 pending 暂存词，让 OpenClaw agent 生成完整词条并写入正式词库。
- `词库微信日报`：每天早上 `09:00 Asia/Shanghai`，读取昨日 01:00 到今日 01:00 收集批次的当前处理状态，并推送到微信；日报正文按 `English｜中文` 一词一行展示，来源行使用 `Codex / OpenClaw / both`。

真实运行验收点：

- 凌晨 1 点自动入库是否成功执行。
- 早上 9 点微信日报是否准时推送。
- 日报中的 ignored / pending 是否能帮助继续收紧噪音规则。

## 复习机制

当前复习队列大致遵循：

- 未学会词优先进入复习。
- 新词会进入复习。
- 到达 `next_review_at` 的词会进入复习。
- 每天以北京时间 `06:00` 作为新一天的分界点。

复习结果会影响：

- 当前学习状态。
- 下次复习时间。
- 连续记住次数。
- 复习统计数据。

## 排序机制

词库列表当前遵循：

- 未学会词排在已学会词前面。
- 未学会区域内，最近变成未学会或最近新增的词更靠前。
- 已学会区域内，最近点击为已学会的词更靠前。
- 搜索和筛选后的结果也保持同一套排序规则。

## 磁盘占用说明

项目目录看起来比较大是正常的。主要空间来自：

- `node_modules`：项目依赖，例如 Next.js、React、zod、lucide-react。
- `.next`：Next.js 构建产物和构建缓存。

真正的词库数据很小，通常只是 KB 到 MB 级别。

不要随意删除：

- `node_modules`：删除后需要重新 `npm install`。
- `.next`：生产模式 `npm run start` 需要它，删除后要重新 `npm run build`。
- `data/`：这里是词库数据库，删除会丢数据。

## 常见问题排查

### 手机打不开页面

先检查：

- Mac mini 是否开机。
- Mac mini 是否登录了当前用户。
- 手机和 Mac mini 是否在同一局域网。
- 地址是否是 `http://Mac mini IP:3030`。
- 服务是否正在运行。

### 修改代码后页面没变化

如果是生产自启动服务，需要重新构建并重启：

```bash
npm run build
launchctl kickstart -k gui/501/com.laiming.vocabulary-web
```

### 服务没有自动启动

检查 LaunchAgent：

```bash
launchctl print gui/501/com.laiming.vocabulary-web
```

查看日志：

```text
logs/launchd.out.log
logs/launchd.err.log
```

### 学习状态不同步

Web App 版本的学习状态保存在 SQLite 数据库里。只要不同设备访问的是同一个 Mac mini 服务，状态应该一致。

如果状态不一致，重点检查：

- 是否访问了过期书签或缓存页面。
- 是否访问了不同机器或不同端口的服务。
- 是否服务重启后连接到了旧缓存页面。

## 当前风险和后续改进

优先级较高：

- 增加数据库自动备份。
- 增加简单访问保护，例如 PIN 或 token。
- 增加 API 错误处理和前端错误提示。

中期可以考虑：

- 手机端界面继续优化。
- 增加批量导入、批量编辑。
- 增加词条编辑页面。
- 增加导出 CSV / JSON。
- 增加复习历史统计。

长期可以考虑：

- 云端部署。
- 登录账号。
- 公网访问。
- PWA / 类 App 使用体验。
- 更完整的备份和恢复机制。

## Git 维护建议

提交代码时通常包括：

- `app/`
- `components/`
- `lib/`
- `scripts/`
- `launchd/`
- `package.json`
- `package-lock.json`
- `README.md`

通常不要提交：

- `node_modules/`
- `.next/`
- `logs/`
- `data/*.sqlite`
- `data/*.sqlite-shm`
- `data/*.sqlite-wal`

## 给后续 Codex 的提醒

这是用户长期使用的个人专业词库项目。处理这个项目时，不要只把它当成临时 demo。涉及数据、同步、启动方式、备份、手机访问和用户学习状态时，要优先考虑长期稳定性和可维护性。
