# ByteGrep Tool

个人开发者工具箱。纯静态站点，所有计算在浏览器本地完成，不依赖后端。

参考了 [naroat/tools-web](https://github.com/naroat/tools-web) 与 [nidhogg1024/Ctool](https://github.com/nidhogg1024/Ctool) 的工具分类与交互方式。

## 工具（23 个）

| 分类 | 工具 |
| --- | --- |
| 工作台（大工具） | 串口助手（Web Serial：文本 / Hex 收发、UTF-8 / GBK、时间戳、分包显示（超时默认 20ms）、定时发送、快捷指令、DTR / RTS、硬件 / 软件（XON/XOFF）流控、日志导出） |
| 编解码 / 加密 | Base64（含文件转 Data URL）、Hex ⇄ ASCII、URL（含 URL 解析）、HTML 实体、Unicode 转义、哈希 / HMAC、对称加解密（AES / DES / 3DES / RC4）、RSA 加解密（PKCS#1 v1.5 / OAEP，含密钥对生成）、JWT 解析 |
| 数据格式 | JSON 格式化 / 压缩 / 校验 / 排序 / 转义、JSON ⇄ YAML、SQL 格式化（多方言） |
| 开发辅助 | 时间戳转换、进制转换（大整数）、UUID v4 / v7、正则测试（高亮 + 替换）、文本对比、颜色转换 |
| 生成器 / 文本 | 密码生成、二维码生成、字数统计、命名风格转换 |

> 串口助手依赖 Web Serial API，仅支持桌面版 Chrome / Edge 89+，且需通过 HTTPS 或 localhost 访问。该 API 只支持 7 / 8 位数据位、1 / 2 位停止位、无 / 奇 / 偶校验，其余选项在界面中置灰。

通用能力：`Ctrl/⌘ + K` 搜索、收藏、最近使用、浅色 / 深色 / 跟随系统主题、工具输入自动保存。

## 技术栈

Vue 3 · Vite · TypeScript · Tailwind CSS v4 · Vue Router（hash 模式）· VueUse · Vitest

依赖库：`crypto-js`（哈希与对称加密）、`yaml`、`sql-formatter`、`diff`、`qrcode`。

## 开发

```bash
# 克隆时一并拉取外部引用的 skill（git submodule）
git clone --recurse-submodules https://github.com/VarleyT/web-tools.git
# 已克隆的仓库补拉 submodule
git submodule update --init

pnpm install
pnpm dev          # 本地开发 http://localhost:5173
pnpm test         # 单元测试
pnpm coverage     # 覆盖率（src/lib）
pnpm typecheck    # vue-tsc 类型检查
pnpm build        # 产物输出到 dist/
```

> TypeScript 固定在 6.x：TypeScript 7（原生版）不再提供 JS API，`vue-tsc` 无法使用。

## 目录结构

```
src/
├── lib/            纯函数逻辑（与 UI 无关，均有单元测试）
├── tools/          registry.ts 工具注册表 + 各工具组件 *Tool.vue（按需加载）；大工具放在子目录，如 serial/
├── components/     通用组件：TextPanel、CodecTool、OptionGroup、CopyRow ...
├── composables/    useToolState（输入持久化）、usePreferences（收藏/最近/主题）...
├── layouts/        侧边栏布局
└── views/          首页、工具页
```

## 新增一个工具

1. 在 `src/lib/` 写纯函数与 `*.test.ts`。
2. 在 `src/tools/` 新建 `XxxTool.vue`。
3. 在 `src/tools/registry.ts` 的 `TOOLS` 中登记 `id / name / category / badge / keywords / component`。

路由、侧边栏、首页卡片和搜索会自动生效。`category: 'app'` 表示大工具：侧边栏单独分组、首页显示大卡片、工具页加宽。

## 隐私

- 工具选项与一般输入（JSON、SQL、正则、对比文本等）保存在 `localStorage`（键前缀 `bytegrep:`），仅本机可见。
- 可能含凭据的输入**只保存在内存**，刷新即清空：对称加密的明文 / 密钥 / IV、哈希输入与 HMAC 密钥、RSA 公私钥与明文、Base64 / Hex / URL 输入、JWT、二维码内容、生成的密码。
- 正则在 Web Worker 中执行，超过 1.5 秒自动中止，灾难性回溯不会卡死页面。
- JSON / YAML 中超出安全整数范围（±2^53）的数字会给出精度丢失提示。

## 部署

线上地址：https://tool.bytegrep.com （GitHub Pages）

- `.github/workflows/deploy.yml`：推送到 `master` 或手动触发时，执行测试、构建，并把 `dist/` 发布到 `gh-pages` 分支。
- `public/CNAME`：自定义域名，构建时复制进 `dist/`。
- `.github/workflows/keep-alive.yml`：每月 1 号提交一次 `monthly.log`，防止仓库 60 天无活动导致定时 workflow 被 GitHub 停用。

首次部署需要：

1. DNS（Cloudflare）添加 `CNAME  tool  →  varleyt.github.io`。
2. 仓库 Settings → Pages：Source 选 **Deploy from a branch**，分支选 `gh-pages` / `(root)`；证书签发后勾选 **Enforce HTTPS**。

也可以把 `dist/` 部署到任意静态托管（Cloudflare Pages、Vercel、Nginx）。项目使用 hash 路由与相对路径 `base: './'`，无需配置 history fallback，也可部署在子路径下。
