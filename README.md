# 小说阅读站

清爽的纯静态小说阅读器，直接在 GitHub Pages 上运行。

## 在线访问

**https://xzstar.github.io/novel-collection/**

## 本地预览

```bash
# 用任何静态文件服务器
python3 -m http.server 8000 --directory static
open http://localhost:8000
```

## 编译

添加新小说后，重新编译静态数据：

```bash
python3 build.py
```

## 功能

- 📖 目录树：按卷/章节组织，可折叠
- 🎨 自动深色/浅色模式（跟随系统）
- 📱 响应式设计，移动端适配
- ⚡ 字号调整并记忆（localStorage）
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
