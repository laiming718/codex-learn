# codex-learn

这是一个用于保存 `Codex` 学习过程、个人工具实验和可长期维护项目代码的仓库。

当前仓库已经从早期的“学习记录 + 临时任务 + 本地原型”阶段，整理成以真实项目为主的代码仓库。任务管理、学习总结和长期资料沉淀已经迁移到飞书知识库 / 管理中心中维护。

## 目录结构

- `vocabulary-web/`
  - 我的专业词库 Web App。
  - 当前仓库里的主项目，用于维护本地专业词库、复习状态、自动收集陌生词、OpenClaw 定时入库和微信日报链路。

## 当前主项目

### `vocabulary-web`

定位：

- 长期使用的个人专业词库。
- 运行在 Mac mini 上，通过局域网给电脑和手机访问。
- 使用 `Next.js + React + SQLite`。
- 支持词库浏览、筛选、学习状态、复习队列、朗读、自动收集陌生词。

常用命令：

```bash
cd vocabulary-web
npm install
npm run dev
npm run build
npm run start
```

自动收集相关命令：

```bash
npm run collect-term
npm run query-collected
npm run daily-report
```

更多说明见：

```text
vocabulary-web/README.md
```

## 使用原则

- 这个仓库主要保存代码、脚本和项目级说明。
- 飞书知识库保存长期学习总结、任务记录、方案沉淀和验收记录。
- 每个新项目尽量放到独立子文件夹中，避免文件混杂。
- 提交前先确认本次只提交当前任务相关文件。
- 本地真实数据不提交到 Git。

## 不提交内容

以下内容默认只保留在本地，不进入 Git：

- `.tmp/`
- `.DS_Store`
- `node_modules/`
- `.next/`
- `logs/`
- `vocabulary-web/data/*.sqlite`
- `vocabulary-web/data/*.sqlite-shm`
- `vocabulary-web/data/*.sqlite-wal`
- `vocabulary-web/data/*.db`
- `vocabulary-web/tsconfig.tsbuildinfo`

## 已归档内容

早期的临时任务清单和单文件词库原型已经整理掉：

- 任务清单改由飞书管理中心维护。
- 旧 `vocabulary/` 单文件原型已迁移为 `vocabulary-web/`。
- OpenClaw 学习交接内容已沉淀到飞书知识库中的相关资料。

历史内容仍可从 Git 历史中恢复。
