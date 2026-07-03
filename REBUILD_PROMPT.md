# 双语对照翻译 Chrome 扩展 — 重建提示词

> 保存此文件，以后丢了代码或换电脑，直接把此文件内容发给 Claude，说"重建这个翻译扩展"即可。

---

# 项目概述
你是一个 Chrome 浏览器扩展开发专家。请帮我重新构建一个名叫"双语对照翻译"的 Chrome 扩展。

## 功能描述
将英文网页翻译为中文，译文在原文段落下方对照显示（蓝色左边框标注）。支持多翻译引擎切换。使用手动翻译模式：每次打开或刷新网页时不要自动翻译，用户点击"翻译此页面"按钮后才开始翻译。

## 技术栈
- TypeScript（全部代码使用 TypeScript）
- React 19（仅用于 Popup 和 Options 页面）
- Vite + @crxjs/vite-plugin 构建（Manifest V3）
- 不要使用 Tailwind CSS（之前尝试过有兼容性问题），所有 UI 使用内联样式（inline styles）
- 包名：bilingual-translation

## 核心架构

### 1. 翻译引擎
支持以下五种引擎，可在设置页面配置 API Key：
- **DeepSeek** — 调用 `https://api.deepseek.com/v1/chat/completions`，使用 `deepseek-chat` 模型
- **Claude API** — 调用 `https://api.anthropic.com/v1/messages`，使用 `claude-sonnet-4-6` 模型
- **Azure Translator** — 调用 `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=zh-Hans`
- **百度翻译** — 调用 `https://fanyi-api.baidu.com/api/trans/vip/translate`，需要 appid+key+salt+sign 签名
- **自定义 API** — 支持 OpenAI 兼容格式的 API 地址，可配置 API URL、API Key、模型名称（模型名可选，留空则不传）

### 2. 翻译模式（重要）
**纯手动模式**。Content Script 加载后不做任何翻译，只监听来自 Popup 的消息。用户点击 Popup 的"翻译此页面"按钮后，发送 `TOGGLE_TRANSLATION { enabled: true }` 消息给 Content Script，Content Script 收到后开始翻译。

### 3. 文本提取（重要 - 修复过多次bug）
使用 TreeWalker 遍历 DOM 提取文本节点。关键规则：
- 跳过隐藏元素（display:none, visibility:hidden, opacity:0, hidden 属性）
- 跳过 script、style、noscript、code、pre、svg、canvas、math 标签
- 跳过已经翻译过的元素（class 为 `.bilingual-translation-wrapper`）
- 跳过空文本（少于 2 个字符）或纯标点符号
- 跳过 CJK 字符占比超过 20% 的文本（认为已经是中文，不需要翻译）
- `shouldTranslate()` 检查：英文（a-zA-Z）字符 > 5 个才翻译

**文本分组策略（关键 - 修复过原文消失bug）**：
找到文本节点后，不按文本节点拆分，而是向上查找最近的**块级容器**（p, div, li, td, th, h1-h6, blockquote, dd, dt, figcaption, caption），同一个容器内的所有文本节点合并成一个 TextBlock。这样避免了内联元素（b, a, code, span 等）被拆分成多个块，导致每个块都去抢同一个父元素造成原文消失。

`findBlockContainer()` 函数：从当前元素向上遍历，遇到块级标签（BLOCK_TAGS）就返回，遇到内联标签（INLINE_TAGS：b,i,u,strong,em,a,span,code,pre,kbd,samp,sub,sup,small,mark,q,cite,abbr,time,font,label）就继续往上爬，遇到未知标签也视为块级返回。

**文本去重**：用 Set 记录已经提取过的文本内容，相同文本只翻译一次，避免重复翻译。

### 4. 文本分割
- 每段最多 2000 字符（`MAX_CHUNK_LENGTH = 2000`）
- 优先按段落分割（`\n\s*\n`）
- 再按句子分割（`[^.!?]+[.!?]+(\s|$)`）
- 最小 chunk 长度 100 字符

### 5. DOM 渲染
- 创建 `<div class="bilingual-translation-wrapper">` 容器
- 蓝色左边框（`border-left: 3px solid #4A90D9`），浅蓝色背景
- 将容器的所有子节点移到 `<span class="bilingual-original">` 中
- 添加 `⇩` 分隔符（<span class="bilingual-separator">）
- 添加译文（<span class="bilingual-translation">）
- 支持暗色模式（@media prefers-color-scheme: dark）
- 打印时隐藏译文
- 错误渲染：红色边框，错误消息用 ⚠️ 前缀

### 6. 请求队列（重要 - 修复过并发bug）
- 并发数 maxConcurrent = 6
- 使用 while 循环启动所有可用槽位的请求，**不要用 processing 标志位**（之前用 processing 标志位导致一次只能处理 1 个请求）
- 每个请求 30 秒超时（AbortController），超时自动跳过该段落
- 请求队列实现：RequestQueue 类，enqueue 返回 Promise，processNext 用 while 循环填满所有并发槽位

### 7. 翻译缓存
- 使用 chrome.storage.local 存储
- 24 小时 TTL
- 缓存 key 格式：`{engine}:{text}`（text 取前 200 字符，小写去空格）
- 读取缓存时检查原文是否匹配（忽略大小写和首尾空格）

### 8. 后台 Service Worker（background.ts）
- 消息路由处理：TRANSLATE_REQUEST（先查缓存再请求）、GET_SETTINGS、PING（用于唤醒 Service Worker）
- 在 router.ts 中处理 PING 消息返回 `{ pong: true }`
- Content Script 在发送翻译请求前先通过 PING 唤醒 Service Worker

### 9. 动态内容观察（observer.ts）
- 使用 `translationActive` 变量跟踪用户是否已开启翻译，替代从 storage 读取设置
- `startObserving()` 设置 translationActive = true，启动 MutationObserver
- `stopObserving()` 设置 translationActive = false，断开 observer
- MutationObserver 监听 document.body：childList + subtree + characterData
- 800ms 防抖延迟
- 额外每 2 秒扫描一次，持续 30 秒（15 次），用于捕捉 SPA 异步加载的内容
- 新增节点文本 > 30 字符 或 文本变化 > 10 字符 触发翻译

### 10. Popup UI（响应式内联样式）
- 宽度 320px
- 渐变色 logo（#6366f1 到 #4F46E5），白色 "A中" 文字
- 标题："双语对照翻译"
- 翻译引擎选择：下拉菜单，每个引擎有图标（🧠🤖☁️🌐🔧）、名称、描述，当前选中显示对勾
- 状态行：绿色/灰色圆点 + "此页面已翻译"/"点击下方按钮翻译此页面"
- "已翻译 ✓" 徽章（翻译后显示在 header）
- Footer 按钮：翻译此页面（蓝色主按钮）/ 移除翻译（灰色） + ⚙️ 设置（灰色）
- 翻译状态是 session 级别的 React state，不写入 chrome.storage
- 切换引擎后自动刷新当前页面，重置翻译状态

### 11. Options 设置页（不分区标签页）
三个垂直堆叠的部分，不用 Tabs：
- **翻译引擎**：radio button 列表，选择默认引擎
- **API 密钥**：每个引擎一个区块，包含 password 输入框，自定义 API 额外有 API URL 和模型名输入框
- **关于**：用法说明和支持引擎列表
- 每个输入框 onChange 时立即保存到 chrome.storage

### 12. Content Script 消息处理
监听两种消息：
- `TOGGLE_TRANSLATION { enabled: boolean }` — enabled=true 执行 startTranslation()，false 执行 removeTranslation()
- `PAGE_ACTION` — 返回 `{ enabled: true }`

### 13. "移除翻译"功能
遍历所有 `.bilingual-translation-wrapper`：
- 找到 `.bilingual-original` 内的子节点
- 把它们移回 wrapper 的父元素（放在 wrapper 前面）
- 删除 wrapper
- 同时调用 stopObserving()

### 14. 图标设计
- SVG 格式，16x16、48x48、128x128
- 渐变色：#6366f1 → #4F46E5
- 圆角矩形，白色 "A中" 文字
- 128px 版本有装饰性圆点和弧线

### 15. 构建产物
- `npm run build` 输出到 dist/ 目录
- 在 chrome://extensions 开启开发者模式，加载已解压的扩展指向 dist/ 目录
- vite.config.ts 配置 CRXJS 插件

## 修复过的历史bug（遇到问题时参考）
1. **原文消失** — 之前按文本节点逐个创建翻译块，导致多个翻译块抢同一个父元素。修复：改为按块级容器合并文本
2. **重复翻译** — 相同段落出现多次中文翻译。修复：文本去重（Set 记录已翻译文本）
3. **翻译非常慢** — 队列 processing 标志位导致一次只处理 1 个请求。修复：去掉 processing，用 while 循环并发处理
4. **翻译到一半停止** — 原因同上 + Service Worker 可能被 Chrome 杀掉。修复：并发 + PING 唤醒
5. **只翻译了顶部内容** — 添加了多轮扫描和 2 秒轮询
6. **移除了不恢复** — removeTranslation() 函数没恢复原文节点。修复：把 original 内的节点移回父元素
7. **自定义 API 返回 HTML** — 用户地址配错（缺了 /v1/chat/completions）。修复：添加 content-type 检查 + 中文错误提示
8. **弹窗太丑** — 全部重写为内联样式，渐变色 header、引擎图标、布局优化
9. **设置页找不到 API Key 配置** — 从 Tabs 改为垂直堆叠的 section 布局

## 项目文件结构
```
translation/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── .gitignore (node_modules/, dist/, .DS_Store, *.log)
├── public/icons/
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
└── src/
    ├── manifest.json
    ├── entrypoints/
    │   ├── content.ts          # 内容脚本入口
    │   ├── background.ts       # Service Worker 入口
    │   ├── popup/
    │   │   ├── index.html
    │   │   ├── main.tsx
    │   │   └── App.tsx
    │   └── options/
    │       ├── index.html
    │       ├── main.tsx
    │       └── App.tsx
    ├── content/
    │   ├── text-extractor.ts   # TreeWalker 文本提取
    │   ├── text-splitter.ts    # 段落/句子分割
    │   ├── translator.ts       # 翻译协调器
    │   ├── dom-renderer.ts     # 译文 DOM 插入
    │   └── observer.ts         # MutationObserver + 轮询
    ├── background/
    │   ├── api-client.ts       # 多引擎 API 调用 + 请求队列
    │   ├── cache.ts            # 翻译缓存 (24h TTL)
    │   └── router.ts           # 消息路由
    ├── shared/
    │   ├── types.ts            # 类型定义 + ENGINE_CONFIGS
    │   ├── messages.ts         # 消息协议
    │   └── storage.ts          # Chrome Storage 封装
    └── styles/
        ├── content.css         # 注入页面的样式
        └── global.css          # 全局样式
```