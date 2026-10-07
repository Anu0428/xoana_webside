# XOANA - 独立手指滑板品牌网站

XOANA 是一个完整的电商网站，专为独立手指滑板品牌设计。包含前台用户界面和后台管理系统，支持产品展示、文章发布、购物车、多种支付方式和完整的后台管理功能。

## 技术栈

### 前端 (frontend/)
- **框架**: Next.js 16.2.1 (App Router) + React 19 + TypeScript
- **UI**: Magic UI / Tailwind CSS + Framer Motion
- **状态管理**: Zustand（含持久化）
- **数据请求**: TanStack Query (React Query)
- **国际化**: next-intl（中/英文，默认中文）
- **暗色模式**: next-themes

### 后端 (backend/)
- **框架**: Spring Boot 3.2 (Java 17)
- **数据库**: H2（开发/测试）/ MySQL（生产）
- **认证**: JWT (jjwt)
- **ORM**: Spring Data JPA
- **安全**: Spring Security

---

## 快速开始

### 前置要求

| 工具 | 版本要求 |
|------|---------|
| Node.js | >= 20.9 |
| pnpm | 10.23.0（由 packageManager 固定） |
| Java | 17（推荐使用此版本构建后端） |
| Maven | >= 3.8 |
| MySQL | >= 8.0（生产环境） |

---

## 启动前端

```bash
cd frontend

# 安装依赖
corepack pnpm install --frozen-lockfile

# 开发模式启动（默认 http://localhost:3000）
corepack pnpm dev

# 或构建生产版本
corepack pnpm build
corepack pnpm start
```
打包后需要上传到服务器的文件：
前端必须文件

frontend/
├── .next/              # 构建产物（最重要）
├── public/             # 静态资源
├── package.json        # 依赖配置
├── next.config.mjs     # Next.js 配置
├── .env.local          # 环境变量（包含后端 API 地址）
└── node_modules/
### 前端环境变量

在 `frontend/` 目录下创建 `.env.local` 文件：
也可以直接复制已提供的 `.env.example`。

```env
# 后端 API 地址（默认 http://localhost:8080）
NEXT_PUBLIC_API_URL=http://localhost:8080
```

`NEXT_PUBLIC_API_URL` 在生产构建时写入浏览器代码，修改后需重新构建；不要在前端环境变量中存放后端密钥。

---

## 启动后端

### 临时开发模式（H2 内存数据库，重启会清空数据）

```bash
cd backend

mvn spring-boot:run -Dspring-boot.run.profiles=dev

```

开发配置使用 H2 内存数据库 `xoanadb`，重启后数据清空。日常上架和管理产品请使用下方 MySQL 模式，读取并保留原有产品数据。H2 网页控制台默认关闭。
直接运行 `mvn spring-boot:run` 会使用默认的 `prod` 配置并连接 MySQL。

在 `backend/` 目录执行 `mvn test` 运行独立 H2 测试，不需要 MySQL。

### 生产模式（MySQL）

1. 创建 MySQL 数据库：
```sql
CREATE DATABASE xoana CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xoana'@'localhost' IDENTIFIED BY 'xoana123';
GRANT ALL PRIVILEGES ON xoana.* TO 'xoana'@'localhost';
```

2. 使用 Java 17 构建并启动，数据库账号密码可通过 `DB_USERNAME`、`DB_PASSWORD` 环境变量覆盖：
```bash
mvn package
java -jar target/xoana-backend-1.0.0.jar \
  --spring.profiles.active=prod \
  --DB_USERNAME=xoana \
  --DB_PASSWORD=your_password
```

---

## 环境变量与开发检查

后端支持的主要环境变量：

| 变量 | 用途 |
|------|------|
| `SPRING_PROFILES_ACTIVE` | 选择 `prod`、`dev`；默认 `prod` |
| `DB_USERNAME`、`DB_PASSWORD` | MySQL 账号和密码 |
| `SPRING_DATASOURCE_URL` | 覆盖数据库连接地址 |
| `APP_JWT_SECRET` | 至少 32 个 UTF-8 字节的私有签名密钥；未设置时每次启动生成新密钥，已有登录失效 |
| `UPLOAD_DIR` | 图片上传目录，默认 `./uploads` |
| `CORS_ALLOWED_ORIGINS` | 允许访问后端的前端来源，逗号分隔 |
| `SERVER_PORT` | 后端端口，默认 `8080` |

后台权限和密钥说明见 [后台鉴权](backend/AUTHENTICATION.md)。

```bash
# frontend 目录：静态检查、类型检查、生产构建
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build

# backend 目录：使用 Java 17 和独立 H2 数据库运行回归测试
mvn test
```

依赖统一使用前端 `pnpm-lock.yaml`，更新依赖后同步锁文件。检查过程不需要生产 MySQL。

---

## 默认账号

系统启动后自动创建以下账号：

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | `jacky` | `jacky060620` | 可访问后台管理 |
| 普通用户 | `test` | `test123` | 普通用户权限 |

---

## 访问地址

| 页面 | 地址 |
|------|------|
| 前台首页 | http://localhost:3000 |
| 全部产品 | http://localhost:3000/products |
| 文章列表 | http://localhost:3000/articles |
| 购物车 | http://localhost:3000/cart |
| 结算页面 | http://localhost:3000/checkout |
| 登录 | http://localhost:3000/login |
| 注册 | http://localhost:3000/register |
| 个人中心 | http://localhost:3000/profile |
| **后台管理** | http://localhost:3000/admin |
| 后台-产品管理 | http://localhost:3000/admin/products |
| 后台-文章管理 | http://localhost:3000/admin/articles |
| 后台-订单管理 | http://localhost:3000/admin/orders |
| 后台-用户管理 | http://localhost:3000/admin/users |
| 后台-流量统计 | http://localhost:3000/admin/traffic |
| 后台-内容设置 | http://localhost:3000/admin/settings |
| 后端 API | http://localhost:8080 |

---

## 支付功能（测试通道）

当前所有支付均为**测试模式**，不产生真实交易。

### 测试流程

1. 添加商品到购物车
2. 进入结算页面
3. 选择支付方式（微信支付 / 支付宝 / PayPal）
4. 提交订单 → 后端模拟支付成功后标记为"已支付"；失败会显示错误并保留购物车。

页面内置的展示样品用于查看外观，不能下单。可在后台创建正式商品后测试完整购买流程。

付款失败或刷新结账页面后，可以在个人中心对待支付订单点击“继续付款 · 测试支付”，复用原订单。

后台订单状态按流程变更：待支付订单可取消；已支付订单可发货或退款；已发货订单可签收或退款；已签收订单可退款。支付成功后扣减库存，未发货退款会恢复库存，重复支付或退款不会重复变更库存。已发货或已签收订单的退款只更新状态，实物退货入库需由管理员确认后调整库存。

### 测试支付 API

```bash
# 创建订单后，调用模拟支付接口
POST http://localhost:8080/api/orders/{orderId}/pay?method=ALIPAY
Authorization: Bearer {your_jwt_token}
```

响应示例：
```json
{
  "success": true,
  "message": "支付成功（测试模式）",
  "data": {
    "orderId": 1,
    "orderNo": "XO1234567890",
    "paymentId": "MOCK_A1B2C3D4",
    "status": "PAID",
    "message": "测试支付成功，生产环境请接入真实支付网关"
  }
}
```

### 接入真实支付（生产环境）

在 `backend/src/main/java/com/xoana/controller/OrderController.java` 的 `processPayment` 方法中，将 Mock 逻辑替换为真实支付 SDK 调用：

```java
// 微信支付
// https://pay.weixin.qq.com/doc/v3/merchant/4012791852

// 支付宝
// https://opendocs.alipay.com/open/270/105899

// PayPal
// https://developer.paypal.com/docs/checkout/
```

---

## 国际化（i18n）

- 默认语言：**中文**
- 支持语言：中文（zh）、英文（en）
- 切换方式：点击导航栏语言选择器，或通过 Cookie `locale` 设置

翻译文件位置：
- `frontend/messages/zh.json` - 中文
- `frontend/messages/en.json` - 英文

---

## 暗色/浅色模式

点击导航栏右上角月亮/太阳图标切换，或跟随系统设置。

---

## 主要功能

### 前台功能
- ✅ 首页：Hero区、推荐产品、品牌介绍、最新文章、产品图库、联系我们
- ✅ 全部产品页：搜索、分类筛选、加入购物车
- ✅ 产品详情页：图片展示、规格信息、数量选择、加购/立即购买
- ✅ 文章列表 & 详情
- ✅ 购物车：增删改数量、价格汇总
- ✅ 结算页：联系信息、收货地址、三种支付方式（微信/支付宝/PayPal）
- ✅ 登录 / 注册
- ✅ 个人中心：订单历史、个人信息编辑

### 后台功能
- ✅ 仪表盘：关键指标概览
- ✅ 产品管理：增删改查、上下架、推荐设置
- ✅ 文章管理：富文本编辑、图片上传、发布/草稿
- ✅ 订单管理：状态更新
- ✅ 用户管理：启用/禁用账号
- ✅ 流量统计：访问量、热门页面、每日趋势
- ✅ 内容设置：编辑首页各区域文字内容

---

## API 文档

后端 RESTful API 端点概览：

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/login | 用户登录 | 公开 |
| POST | /api/auth/register | 用户注册 | 公开 |
| GET | /api/products | 获取产品列表 | 公开 |
| GET | /api/products/featured | 获取推荐产品 | 公开 |
| GET | /api/products/{id} | 获取产品详情 | 公开 |
| POST | /api/products | 创建产品 | 管理员 |
| PUT | /api/products/{id} | 更新产品 | 管理员 |
| DELETE | /api/products/{id} | 删除产品 | 管理员 |
| GET | /api/articles | 获取文章列表 | 公开 |
| GET | /api/articles/recent | 获取最新文章 | 公开 |
| GET | /api/articles/{id} | 获取文章详情 | 公开 |
| POST | /api/articles | 创建文章 | 管理员 |
| PUT | /api/articles/{id} | 更新文章 | 管理员 |
| DELETE | /api/articles/{id} | 删除文章 | 管理员 |
| POST | /api/orders | 创建订单 | 登录用户 |
| GET | /api/orders/my | 我的订单 | 登录用户 |
| POST | /api/orders/{id}/pay | 支付（测试） | 登录用户 |
| GET | /api/orders/admin/all | 所有订单 | 管理员 |
| PUT | /api/orders/{id}/status | 更新订单状态 | 管理员 |
| GET | /api/users/me | 获取个人信息 | 登录用户 |
| PUT | /api/users/me | 更新个人信息 | 登录用户 |
| GET | /api/users/admin/all | 所有用户 | 管理员 |
| POST | /api/traffic/track | 记录访问 | 公开 |
| GET | /api/traffic/stats | 流量统计 | 管理员 |
| POST | /api/admin/upload/image | 上传图片 | 管理员 |

图片上传支持 PNG、JPEG、GIF、WebP，单个文件最大 10 MB。服务端根据文件头选择扩展名。

---

## 项目结构

```
xoana_webside/
├── frontend/                    # Next.js 前端
│   ├── src/
│   │   ├── app/                # 页面（App Router）
│   │   │   ├── page.tsx        # 首页
│   │   │   ├── products/       # 产品页
│   │   │   ├── articles/       # 文章页
│   │   │   ├── cart/           # 购物车
│   │   │   ├── checkout/       # 结算
│   │   │   ├── login/          # 登录
│   │   │   ├── register/       # 注册
│   │   │   ├── profile/        # 个人中心
│   │   │   └── admin/          # 后台管理
│   │   ├── components/         # 组件
│   │   │   ├── home/           # 首页各区块
│   │   │   ├── layout/         # 导航/页脚
│   │   │   ├── magic/          # Magic UI 组件
│   │   │   └── ui/             # 基础 UI 组件
│   │   ├── lib/                # 工具函数、API 客户端
│   │   ├── store/              # Zustand 状态管理
│   │   └── i18n.ts             # 国际化配置
│   └── messages/               # 翻译文件
│       ├── zh.json
│       └── en.json
│
└── backend/                     # Spring Boot 后端
    └── src/main/java/com/xoana/
        ├── XoanaApplication.java
        ├── controller/          # REST 控制器
        ├── model/               # JPA 实体
        ├── repository/          # 数据访问层
        ├── security/            # JWT 认证
        ├── config/              # 配置类
        └── dto/                 # 数据传输对象
```
