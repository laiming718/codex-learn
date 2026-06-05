# 我的专业词库 Web App

这是从本地 `vocabulary.html` 原型迁移出来的第一版 Web App。

## 当前目标

- 在 Mac mini 上运行
- 同一局域网下，电脑和手机访问同一套词库状态
- 先不配置域名，不做公网访问

## 启动

```bash
npm install
npm run import:vocab
npm run dev
```

默认服务地址：

- 本机：`http://localhost:3030`
- 局域网：`http://你的 Mac mini 局域网 IP:3030`

当前本机检测到的局域网 IP 是：

- `192.168.5.22`

所以手机和 Mac mini 在同一个 Wi-Fi 下时，可以先试：

- `http://192.168.5.22:3030`

## 数据

- 数据库：`data/vocabulary.sqlite`
- 原始词库来源：`../vocabulary/vocabulary.csv`

`npm run import:vocab` 会把 CSV 导入 SQLite。

## 已实现

- 词库列表
- 搜索
- 类型筛选
- 学习状态筛选
- 已学会 / 未学会切换
- 顶部统计
- 复习模式
- 复习结果：没记住 / 有点印象 / 记住了
- 北京时间 `06:00` 切天的复习时间机制
- 单词朗读
- 例句朗读，例句语速 `0.7`

## 下一步

- 做登录保护
- 做持久化部署脚本
- 做自动备份
- 做手机端细节优化
- 后续再考虑域名和公网访问
