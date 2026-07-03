# 双语对照翻译

> 一款 Chrome 浏览器扩展，将英文网页翻译为中文，**段落下方对照显示**，支持多翻译引擎切换。

## 截图

```
┌──────────────────────────────────────┐
│ 原文段落文本                          │
│  ⇩                                   │
│ 翻译后的中文文本                      │  ← 蓝色左边框标注
└──────────────────────────────────────┘
```

## 特性

- 🔤 **段落对照** — 译文直接显示在原文段落下方，蓝色左边框标注，一目了然
- 🧠 **多引擎支持** — 内置 DeepSeek、Claude、Azure Translator、百度翻译四种引擎，支持自定义 API
- 🔄 **按需翻译** — 手动点击才翻译，刷新页面后自动恢复原文
- 🎨 **干净 UI** — 弹窗简洁、设置页完整，夜间模式自动适配
- ⚡ **轻量快速** — 基于 Manifest V3，Service Worker 架构，翻译缓存避免重复请求

## 快速开始

### 安装

1. 从 Releases 下载 `bilingual-translation.zip` 并解压
2. 打开 Chrome / Edge / Brave，进入 `chrome://extensions`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展**，选择解压后的 `dist` 目录

### 配置

1. 点击浏览器工具栏的扩展图标 → ⚙️ **设置**
2. 在设置页中找到 **API 密钥** 区域
3. 选择你使用的引擎，填入对应的 API Key

### 使用

1. 打开任意英文网页
2. 点击扩展图标 → 点击 **翻译此页面** 按钮
3. 等待翻译完成，译文会显示在原文段落下方

> 提示：切换翻译引擎后页面会自动刷新以应用新引擎。

## 翻译引擎

| 引擎 | 说明 | 获取 Key |
|------|------|----------|
| **DeepSeek V4 Flash** | 性价比高，中英翻译质量好 | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **Claude API** | 翻译质量最高，支持上下文理解 | [console.anthropic.com](https://console.anthropic.com/) |
| **Azure Translator** | Microsoft 翻译服务，免费额度大 | [portal.azure.com](https://portal.azure.com/) |
| **百度翻译** | 国内访问快，中文优化好 | [fanyi-api.baidu.com](https://fanyi-api.baidu.com/) |
| **自定义 API** | 支持 OpenAI 兼容格式的本地/中转服务 | 自建服务 |

## 项目结构

```
translation/
├── src/
│   ├── entrypoints/
│   │   ├── content.ts          # 内容脚本 (注入页面)
│   │   ├── background.ts       # Service Worker
│   │   ├── popup/              # 弹窗 UI (React)
│   │   └── options/            # 设置页 UI (React)
│   ├── content/
│   │   ├── text-extractor.ts   # 提取文本节点
│   │   ├── text-splitter.ts    # 分割段落/句子
│   │   ├── translator.ts       # 翻译协调器
│   │   ├── dom-renderer.ts     # 译文 DOM 插入
│   │   └── observer.ts         # 动态内容监听
│   ├── background/
│   │   ├── api-client.ts       # 多引擎 API 调用 + 请求队列
│   │   ├── cache.ts            # 翻译缓存 (24h TTL)
│   │   └── router.ts           # 消息路由
│   ├── shared/
│   │   ├── types.ts            # 类型定义
│   │   ├── messages.ts         # 消息协议
│   │   └── storage.ts          # Chrome Storage 封装
│   └── styles/
│       ├── content.css         # 注入页面的样式
│       └── global.css          # 全局样式
├── public/icons/               # 扩展图标
├── dist/                       # 构建产物
├── package.json
├── vite.config.ts
└── README.md
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发模式 (支持 HMR)
npm run dev

# 构建生产版本
npm run build

# 预览
npm run preview
```

构建产物位于 `dist/` 目录，在浏览器中加载已解压的扩展指向该目录即可。

## 技术栈

- **TypeScript** — 类型安全
- **React 19** — Popup & Options UI
- **Vite** + **CRXJS** — 构建与热更新
- **Manifest V3** — 最新的 Chrome 扩展规范

## 自定义 API

如果你的本地中转服务使用 OpenAI 兼容格式：

```
API 地址: http://localhost:3000/v1/chat/completions
API Key:  你的密钥 (不需要可留空)
模型名称: 如 deepseek-chat, deepseek-v4-flash
```

## 许可

ISC