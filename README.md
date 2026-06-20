# 项目管理系统 - 部署指南

基于 Next.js 16 的全功能项目管理系统，包含客户、项目、任务、合同、订单、审批、发票、编码、知识库等 15+ 核心模块。

## 一键部署

克隆项目后，在项目根目录运行：

```bash
chmod +x deploy.sh && ./deploy.sh
```

脚本会自动完成: 环境检测 -> 依赖安装 -> 数据库配置 -> Schema 迁移 -> 管理员创建 -> 种子数据 -> 启动服务。

**选项**

| 参数 | 说明 |
|------|------|
| `--auto` | 自动模式，使用默认值，无需交互 |
| `--skip-test-data` | 跳过测试数据生成 |
| `--skip-seed-news` | 跳过行业新闻种子数据 |
| `--start-dev` | 部署完成后自动启动服务器 |
| `--help` | 显示帮助 |

**通过环境变量预设配置**

```bash
DB_PASSWORD=mypassword JWT_SECRET=mysecret ./deploy.sh --auto
```

详细手动部署步骤见下文。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.0.10 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| 语言 | TypeScript 5 |
| ORM | Drizzle ORM + PostgreSQL |
| 图表 | Recharts 3 |
| 认证 | JWT (bcryptjs + jose) |
| 包管理 | pnpm (strict mode) |

---

## 第一步：环境准备

### 1.1 安装 Node.js 与 pnpm

```bash
# 安装 Node.js 22+ (推荐 24)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# 安装 pnpm
npm install -g pnpm
```

### 1.2 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.3 创建数据库与用户

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE project_management;
CREATE USER project_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE project_management TO project_user;
-- PostgreSQL 15+ 需额外授权 public schema
\c project_management
GRANT ALL ON SCHEMA public TO project_user;
\q
```

---

## 第二步：克隆与配置

### 2.1 克隆项目

```bash
git clone https://gitee.com/sean_lee_001/project-management-system.git
cd project-management-system
```

### 2.2 配置 pnpm

项目需要在项目根目录创建 `.npmrc`（pnpm strict mode 需要）：

```bash
# 创建 .npmrc
cat > .npmrc << 'EOF'
shamefully-hoist=true
strict-peer-dependencies=false
EOF
```

### 2.3 安装依赖

```bash
pnpm install
```

> 注意：如果安装失败（ESLint 相关包解析错误），说明 `.npmrc` 配置缺失或 `eslint.config.mjs` 引用了未安装的插件。请确保 `.npmrc` 已创建且 `eslint.config.mjs` 使用正确的配置（见常见问题）。

### 2.4 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，**最低配置**：

```env
JWT_SECRET=<用 node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 生成>
DATABASE_URL=postgresql://project_user:your_secure_password@localhost:5432/project_management
```

**注意**：`.env` 不应提交到 Git。项目中包含一个已填充真实凭据的 `.env` 文件，部署前请删除或替换。

---

## 第三步：数据库初始化

### 3.1 执行 Schema 迁移

```bash
pnpm drizzle-kit push
```

此命令会自动创建所有 31 张数据库表（部门、用户、角色、客户、产品、项目、任务、合同、订单、送货、审批流程、审批记录、消息、日志、知识库、编码规则、权限、委托等）。

### 3.2 创建管理员账户（必需）

```bash
node scripts/init-admin.js
```

> 此脚本在数据库中创建 admin 用户（密码 `admin123`）。**生产环境请立即修改密码**。

成功后会输出类似：
```
管理员创建成功: admin
```

### 3.3 生成测试数据（可选）

```bash
# 生成 20 组完整测试数据（客户/项目/任务/合同/订单/审批/消息/日志等）
node scripts/generate-all-test-data.js

# 填充订单付款比例和发票/交易数据
node scripts/populate-invoice-transaction.js
```

---

## 第四步：启动开发服务器

```bash
pnpm dev
```

服务默认在 `http://localhost:3000` 启动。

> 注意：启动端口为 **3000**（非 5000）。5000 端口是旧版 coze CLI 的端口，本项目使用 Next.js 原生 dev server。

### 登录系统

| 用户 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 系统管理员 |
| zhangwei ~ songrui | test123 | 各职能角色 |

---

## 第五步：构建与生产部署

### 5.1 构建

```bash
pnpm build
```

构建产物位于 `.next/standalone`（standalone 模式，可独立运行）。

### 5.2 启动生产服务

```bash
# 直接启动
node .next/standalone/server.js

# 或使用 PM2
pm2 start .next/standalone/server.js --name project-management
```

### 5.3 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 常见问题（克隆后必读）

### Q1: `pnpm install` 失败（drizzle-kit postinstall 错误）

**现象**：`drizzle-kit` 的 postinstall 脚本尝试下载平台二进制文件失败。

**解决**：升级 Node.js 到 22+：

```bash
nvm install 24
nvm use 24
rm -rf node_modules
pnpm install
```

### Q2: `pnpm dev` 报错 `unique is not defined`

**现象**：`ReferenceError: unique is not defined at schema.ts:1308`

**原因**：`src/storage/database/shared/schema.ts` 第 12 行从 `drizzle-orm/pg-core` 导入时遗漏了 `unique`。

**解决**：确认 schema.ts 导入包含 `unique`：

```typescript
import { pgTable, varchar, timestamp, boolean, integer, date, jsonb, index, unique } from "drizzle-orm/pg-core";
```

### Q3: ESLint 配置错误

**现象**：`pnpm lint` 报 `Cannot find module 'globals'` 或 `Cannot read properties of undefined (reading 'base')`

**原因**：`eslint.config.mjs` 导入了 `nextJsConfigs.flat.base`（不存在），且 pnpm strict mode 下 ESLint 预设的传递依赖未被提升。

**解决**：编辑 `eslint.config.mjs`：

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

### Q4: 登录后 admin 无法访问后台管理

**现象**：admin 账号登录成功但无法访问 `/admin` 页面。

**原因**：数据库中 admin 的 `role` 字段值为中文 `系统管理员`，而代码 `UserRole.SYSTEM_ADMIN = "system_admin"` 为英文编码。

**解决**：执行以下 SQL 修正：

```sql
UPDATE users SET role = 'system_admin' WHERE username = 'admin';
```

**如果仍无法访问**：清除浏览器 localStorage（`F12` -> Application -> Local Storage -> 清除），重新登录。

### Q5: 新建部门无响应

**原因**：`/api/departments` 缺少 POST 处理器，前端 POST 请求收到 405。

**解决**：已在最新代码中修复。如果使用旧版本，需在 `src/app/api/departments/route.ts` 中手动添加 `export async function POST`。

### Q6: 交易明细 / 发票管理无数据

**原因**：订单表的付款比例字段（`prepay_ratio` 等）为空，API 仅在比例 > 0 时生成行。

**解决**：执行 `node scripts/populate-invoice-transaction.js` 填充付款数据。

### Q7: `init-admin.js` 脚本报模块未找到

**现象**：`Cannot find module 'drizzle-orm/node-postgres'`

**原因**：drizzle-orm 的 exports map 未导出 `node-postgres` 路径。

**解决**：替代方案 — 使用 `psql` 直接插入：

```bash
node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('admin123', 10));
"
# 将输出的哈希值用于 INSERT
```

### Q8: `params` 不是函数（Next.js 16 breaking change）

**原因**：Next.js 16 将动态路由的 `params` 改为 `Promise` 类型。部分旧代码直接同步访问 `params`。

**解决**：在动态路由页面中：

```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // 必须先 await
}
```

---

## 代码质量说明

本项目从 Gitee 克隆后，存在以下因环境差异导致的已知问题（已在本部署指南的修复分支中解决）：

| 问题类型 | 根因 | 影响范围 |
|----------|------|----------|
| schema.ts 缺少 `unique` 导入 | drizzle-orm 版本或构建环境差异，原环境可能隐式可用 | 服务启动崩溃 |
| eslint 配置引用不存在的 `flat.base` | 原开发者可能未运行 lint，或使用不同 eslint 版本 | `pnpm lint` 失败 |
| pnpm workspaces 含占位值 | 原开发环境可能使用其他包管理器配置 | `pnpm install` 阻塞 |
| next.config.ts 含已弃用的 `experimental.serverActions` | Next.js 16 将 serverActions 提升为顶层配置 | 构建时有弃用警告 |
| 部门 API 缺少 POST 处理器 | 功能未实现（创建部门走其他路径或从未测试） | 新建部门失效 |
| 发票 API 缺少 PUT 处理器 | InvoiceManagement 组件引用未实现的路由 | 发票单元格内编辑可能失败 |
| `/api/auth/current-user` 路由缺失 | 订单/合同审批撤销功能引用了未创建的路由 | 撤销审批功能崩溃 |
| admin 角色存储为中文编码 | 代码使用英文 `system_admin`，但数据初始化时可能写入了中文 | 权限检查失败 |
| `.env` 已提交到 Git 仓库 | 开发便利性考虑 | 凭据泄露风险 |

**建议**：首次克隆后按本指南的第二步~第四步执行即可避开上述所有坑点。

---

## 项目结构

```
project-management-system/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # 192 个 API 路由
│   │   │   ├── auth/             #   登录/注册/Token
│   │   │   ├── departments/      #   部门 CRUD
│   │   │   ├── users/            #   用户管理
│   │   │   ├── projects/         #   项目管理
│   │   │   ├── tasks/            #   任务管理
│   │   │   ├── customers/        #   客户管理
│   │   │   ├── contracts/        #   合同管理
│   │   │   ├── orders/           #   订单管理
│   │   │   ├── deliveries/       #   送货管理
│   │   │   ├── invoices/         #   发票管理
│   │   │   ├── transactions/     #   交易明细
│   │   │   ├── approvals/        #   审批流程
│   │   │   ├── knowledge-base/   #   知识库
│   │   │   ├── coding-rules-v2/  #   编码规则
│   │   │   ├── settings/         #   系统设置
│   │   │   └── ...
│   │   ├── admin/                # 后台管理
│   │   ├── app/                  # 应用主界面
│   │   └── auth/                 # 认证页面
│   ├── components/               # 66 个 React 组件
│   ├── storage/database/         # 数据层
│   │   └── shared/schema.ts      #   31 张表定义 (2083 行)
│   ├── hooks/                    # 自定义 Hooks
│   └── lib/                      # 工具库
├── scripts/                      # 部署/数据脚本
│   ├── init-admin.js             #   创建管理员
│   ├── generate-all-test-data.js #   生成 20 组测试数据
│   └── populate-invoice-transaction.js  # 填充发票/交易数据
├── drizzle.config.ts             # Drizzle 配置
├── next.config.ts                # Next.js 配置
├── .npmrc                        # pnpm 配置 (需手动创建)
├── .env                          # 环境变量 (勿提交)
└── package.json
```

---

## 安全提醒

1. **生产环境**务必修改所有默认密码（admin/system/database）
2. `.env` 文件不应提交到 Git
3. `JWT_SECRET` 环境变量必须设置为强随机字符串
4. 不要将 `scripts/` 下含凭据的脚本部署到生产服务器
5. `/api/init` 和 `/api/migrate` 接口在部署前应禁用或加 IP 白名单
