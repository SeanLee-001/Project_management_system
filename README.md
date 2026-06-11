# 项目管理系统 - 本地部署指南

## 项目概述

这是一个基于 Next.js 的全功能项目管理系统，包含以下核心模块：

- 用户权限管理
- 项目管理
- 任务管理
- 客户管理
- 合同管理
- 订单管理
- 产品管理
- 系统对接
- 实用工具
- 项目审批
- 角色管理
- 审批流程
- 软件发布
- 数据统计看板

## 技术栈

- **前端框架**: Next.js 16.0.10
- **UI 框架**: React 19.2.1
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **ORM**: Drizzle ORM
- **数据库**: PostgreSQL
- **图表库**: Recharts 3.6.0
- **移动端**: React Native 0.72.6

## 系统要求

### 开发环境

- Node.js 24.x 或更高版本
- pnpm 8.x 或更高版本（推荐）
- PostgreSQL 14.x 或更高版本
- Git

### 生产环境

- Linux/macOS/Windows Server
- Node.js 24.x
- PostgreSQL 14.x 或更高版本
- Nginx（可选，用于反向代理）

---

## 第一步：环境准备

### 1.1 安装 Node.js

```bash
# 使用 nvm 安装 Node.js 24（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
node -v
```

### 1.2 安装 pnpm

```bash
npm install -g pnpm
pnpm -v
```

### 1.3 安装 PostgreSQL

#### macOS（Homebrew）
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql-14 postgresql-contrib-14
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
1. 下载 PostgreSQL 安装包：https://www.postgresql.org/download/windows/
2. 运行安装程序，按提示完成安装
3. 记住设置的密码（默认用户：postgres）

### 1.4 创建数据库

```bash
# 进入 PostgreSQL 命令行
psql -U postgres

# 创建数据库和用户
CREATE DATABASE project_management;
CREATE USER project_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE project_management TO project_user;
\q
```

---

## 第二步：项目安装

### 2.1 克隆项目

```bash
cd /path/to/your/workspace
git clone <repository-url>
cd projects
```

### 2.2 安装依赖

```bash
pnpm install
```

### 2.3 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env
```

编辑 `.env` 文件：

```env
# JWT Secret（请生成一个强随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 数据库配置
DATABASE_URL=postgresql://project_user:your_secure_password@localhost:5432/project_management

# Node环境
NODE_ENV=development
```

**生成强随机密钥**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 第三步：数据库初始化

### 3.1 运行数据库迁移

```bash
# 创建数据库表
pnpm drizzle-kit push
```

### 3.2 初始化数据（可选）

如果需要创建初始管理员账户，可以运行初始化脚本：

```bash
# 创建初始管理员（用户名：admin，密码：admin123）
# 注意：生产环境请务必修改密码！
node scripts/init-admin.js
```

---

## 第四步：启动开发服务器

### 4.1 启动后端服务

```bash
# 开发模式（支持热更新）
pnpm dev

# 或使用 coze CLI（推荐）
coze dev
```

服务将在 `http://localhost:5000` 启动

### 4.2 访问系统

打开浏览器访问：http://localhost:5000

默认管理员账户（如果执行了初始化脚本）：
- 用户名：admin
- 密码：admin123

**⚠️ 重要：生产环境部署后请立即修改默认密码！**

---

## 第五步：构建生产版本

### 5.1 构建项目

```bash
pnpm build
```

### 5.2 启动生产服务器

```bash
pnpm start
```

---

## 第六步：部署到生产环境

### 6.1 使用 PM2 进程管理（推荐）

```bash
# 全局安装 PM2
pnpm add -g pm2

# 启动应用
pm2 start npm --name "project-management" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

### 6.2 使用 Nginx 反向代理（推荐）

创建 Nginx 配置文件 `/etc/nginx/sites-available/project-management`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/project-management /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 6.3 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 移动端 APP 部署（可选）

本项目包含 React Native 移动端应用，位于 `mobile-app` 目录。

### 移动端开发环境

```bash
cd mobile-app

# 安装依赖
pnpm install

# iOS 开发（需要 macOS）
npx pod-install
pnpm ios

# Android 开发
pnpm android
```

### 移动端打包发布

详见 `mobile-app/README.md`

---

## 数据库备份与恢复

### 备份数据库

```bash
pg_dump -U postgres project_management > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库

```bash
psql -U postgres project_management < backup_20241201_120000.sql
```

### 定时备份（使用 crontab）

```bash
# 编辑 crontab
crontab -e

# 添加每日凌晨 2 点备份任务
0 2 * * * pg_dump -U postgres project_management > /path/to/backups/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

---

## 常见问题

### Q1: 端口 5000 被占用

```bash
# 查找占用端口的进程
lsof -i :5000

# 杀死进程（替换 PID）
kill -9 <PID>

# 或修改端口
pnpm dev -- -p 3000
```

### Q2: 数据库连接失败

检查：
1. PostgreSQL 服务是否运行
2. 数据库密码是否正确
3. `.env` 文件中 `DATABASE_URL` 配置是否正确
4. 防火墙是否允许 5432 端口

### Q3: 依赖安装失败

```bash
# 清理缓存
pnpm store prune

# 重新安装
rm -rf node_modules
pnpm install
```

### Q4: 构建失败

```bash
# 清理构建缓存
rm -rf .next
pnpm build
```

### Q5: TypeError: params is not a function

这是 Next.js 16 的 breaking change，确保动态路由使用：

```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

---

## 性能优化建议

1. **数据库优化**
   - 定期执行 `VACUUM ANALYZE`
   - 为常用查询字段添加索引
   - 配置连接池（如 pg-promise）

2. **应用优化**
   - 启用 Next.js ISR (Incremental Static Regeneration)
   - 使用 Redis 缓存热点数据
   - 优化图片（使用 next/image）

3. **服务器优化**
   - 增加内存
   - 使用负载均衡（多实例）
   - 启用 Gzip 压缩

---

## 安全建议

1. **环境安全**
   - ⚠️ 生产环境务必修改默认密码
   - ⚠️ 使用强随机 `JWT_SECRET`
   - ⚠️ 不要将 `.env` 文件提交到 Git

2. **网络安全**
   - 启用 HTTPS
   - 配置防火墙，仅开放必要端口
   - 限制数据库访问 IP

3. **应用安全**
   - 定期更新依赖包（`pnpm update`）
   - 实施日志监控
   - 配置备份策略

---

## 技术支持

如遇到问题，请：

1. 检查日志文件：查看终端输出或 PM2 日志
2. 查看文档：检查项目内相关文档
3. 提交 Issue：在项目仓库提交问题

---

## 项目结构

```
projects/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── app/               # 应用页面
│   │   └── auth/              # 认证页面
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 组件
│   │   ├── Dashboard.tsx     # 数据统计看板
│   │   └── ...
│   ├── storage/
│   │   └── database/         # 数据库配置
│   │       └── shared/
│   │           └── schema.ts  # 数据库表定义
│   └── lib/                  # 工具函数
├── mobile-app/               # React Native 移动端
├── public/                   # 静态资源
├── .env                      # 环境变量（不提交）
├── .env.example              # 环境变量示例
├── next.config.ts            # Next.js 配置
├── package.json              # 项目依赖
└── drizzle.config.ts         # Drizzle 配置
```

---

## 许可证

[请添加您的许可证信息]

---

## 更新日志

### v1.0.0 (2024-12)
- ✅ 完成基础功能模块
- ✅ 集成数据统计看板
- ✅ 移动端 APP 支持
- ✅ 审批流程功能
- ✅ 二维码下载功能

---

**祝您部署顺利！🎉**
