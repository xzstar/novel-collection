# 小说阅读站

清爽的小说阅读器，自动扫描目录中的小说文件。

## 本地运行

```bash
python3 app.py
open http://localhost:8000
```

## 在线访问

部署在 GitHub Pages 上：**https://xzstar.github.io/novel-collection/**

## 功能

- 📖 目录树：按卷/章节组织，可折叠
- 🎨 自动深色/浅色模式（跟随系统）
- 📱 响应式设计，移动端适配
- ⚡ 字号调整并记忆
- ⌨️ 方向键导航（← →）
- 🌍 支持多本小说切换

## 目录结构

```
小说名/
├── outline.json      # 大纲信息
├── stats.json        # 统计
├── 第1卷/
│   ├── 第001章_章名.md
│   └── ...
└── 第2卷/
    └── ...
```
