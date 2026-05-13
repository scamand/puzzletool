# Puzzle苦力小工具

这是一组用来**辅助解谜**的小工具，能够节省在一些繁琐工作上所花费的时间。

## 在线访问

网站已部署至 GitHub Pages，可直接访问：
**<https://scamand.github.io/puzzletool/>**

## 工具箱概览

### 📝 文字工具

- [文字工具工作台](text-tools/text-tools.html)

## 工具功能说明

### 📝 文字工具工作台

**功能：** 一个可扩展的文字工具工作台。进入页面先显示“工具选择卡片”，支持搜索并切换到具体工具；每张卡片都能独立工作，可并行处理多个文字与密码任务。

**使用方法：**

1. 在卡片中搜索并选择需要的文字工具
2. 工具页顶部标题固定显示，画布操作后会收起，悬停后展开
3. 按住右键拖拽画布空白处可以移动画布，右键单击空白处可从主题菜单添加新卡片
4. 拖动卡片左上角标题标签可以移动卡片，拖动右下角可以调整大小
5. 顶部按钮支持清空画布、整理卡片、保存或加载当前页面设置
6. 移动端提供固定“添加卡片”入口
7. 每张卡片可独立输入和转换，互不影响

**支持的密码类型：**

- 摩斯密码 📡
- 旗语密码 🚩
- 栅栏密码 🧱：支持直栏式分栏与 W 型轨迹，可选择展示排列和读取过程
- 培根密码 BA
- ROT13 🔄
- A1Z26 🔢
- 进制转换 🧮：HEX / DEC / OCT / BIN 程序员模式
- 二进制/文本 💬：文本与 8 位二进制字节互转，支持 UTF-8 中文
- 移位密码 ➡️
- 自定义密码表 🧾

---

## 文件结构

```
puzzletool/
├── index.html                  # 首页
├── AI_read/                    # AI 专用文档
│   └── memo.txt                # 开发规范
├── theme/                      # 主题文件
│   ├── light-theme.css         # 浅色主题token
│   ├── dark-theme.css          # 深色主题token
│   ├── common-styles.css       # 全站通用UI样式
│   └── theme-system.js         # 主题自动切换与同步逻辑
├── components/                 # 通用组件
│   └── head-template.html      # Head模板
├── things/                     # 静态资源
│   ├── puzzle.svg              # 网站图标
│   └── text-icon.svg           # 文字工具图标
├── text-tools/                 # 文字工具目录
│   ├── text-tools.html         # 文字工具工作台
│   ├── text-tools.css          # 文字工具工作台样式
│   └── tools/                  # 文字工具拆分模块
│       ├── tool-config.js      # 文字工具配置入口
│       ├── main.js             # 卡片工作台主控
│       ├── registry.js         # 工具注册表
│       ├── tool-utils.js       # 公共转换与UI辅助
│       ├── morse.js            # 摩斯密码
│       ├── semaphore.js        # 旗语密码
│       ├── rail-fence.js       # 栅栏密码
│       ├── bacon.js            # 培根密码
│       ├── rot13.js            # ROT13
│       ├── a1z26.js            # A1Z26
│       ├── radix-converter.js  # 进制转换
│       ├── binary-text.js      # 二进制/文本转换
│       ├── shift.js            # 移位密码
│       ├── custom-table.js     # 自定义密码表
│       ├── build-bundle.ps1    # bundle 构建脚本
│       └── bundle.js           # 构建产物
├── image-tools/                # 图像工具目录
├── pen-paper-tools/            # 纸笔工具目录
└── README.md
```

## 主题

网站支持浅色/深色主题切换。首页提供手动切换按钮，子页面会自动跟随该偏好。

当用户未手动设置时，系统在 19:00-07:00 自动启用深色主题；手动切换后会写入 `theme_manual_override` 并在全站同步生效。

## 加载优化

网站会在浏览器支持时注册 `sw.js`，使用 Service Worker + Cache API 缓存首页、文字工具页、主题文件、图标和文字工具 bundle。首页显示后会在后台预热常用工具页面；鼠标悬停、聚焦或触摸工具链接时也会提前拉取目标页面，从而提升第二次访问和页间跳转速度。
