# XOANA 前端

Next.js 16 App Router、React 19、TypeScript、Tailwind CSS v4。包含商品展示、购物车、模拟支付和后台管理，支持中文与英文。

## 开发

需要 Node.js >= 20.9 和项目固定的 pnpm 10.23.0。在本目录执行：

```bash
corepack pnpm install --frozen-lockfile
```

将 `.env.example` 复制为 `.env.local`，配置 `NEXT_PUBLIC_API_URL`（默认 `http://localhost:8080`）。该变量会进入浏览器代码，不能包含密码或 JWT 密钥；修改后重启开发服务，生产环境重新构建。

在 `../backend` 启动后端，再启动前端：

```bash
corepack pnpm dev
```

浏览器访问 `http://localhost:3000`。后端启动、演示账号和完整接口说明见 [项目 README](../README.md)，后台权限及 JWT 配置见 [后台鉴权](../backend/AUTHENTICATION.md)。

## 检查与构建

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start
```

`typecheck` 先生成 Next.js 路由类型，再执行 TypeScript 检查；`start` 需要已完成生产构建。依赖统一使用 pnpm 和 `pnpm-lock.yaml`。

## 代码位置

- `src/app`：前台与后台页面。
- `src/components`：首页、布局及管理组件。
- `src/lib/api.ts`：Axios API 封装与登录失效处理。
- `src/store`：持久化登录状态和购物车。
- `messages/zh.json`、`messages/en.json`：页面翻译。
- `public/gallery`、`public/products/samples`：图库与展示样品；样品不能下单。

框架相关修改应先阅读 [AGENTS.md](AGENTS.md) 和已安装版本的 `node_modules/next/dist/docs/`。
