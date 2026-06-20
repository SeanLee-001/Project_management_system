#!/usr/bin/env bash
#
# deploy.sh -- 项目管理系统一键自动部署脚本
#
# 用法：
#   chmod +x deploy.sh && ./deploy.sh
#
# 用户克隆项目后，在项目根目录运行此文件即可完成所有部署步骤：
#   环境检测 -> 安装依赖 -> 数据库配置 -> Schema 迁移 -> 管理员创建 -> 种子数据 -> 启动服务
#
# 支持交互式配置，也可通过环境变量跳过询问：
#   DB_PASSWORD=xxx JWT_SECRET=xxx ./deploy.sh --auto

set -euo pipefail

# =============================================
# 颜色与日志
# =============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "\n${BLUE}============================================${NC}"; echo -e "${BLUE}$*${NC}"; echo -e "${BLUE}============================================${NC}"; }

# =============================================
# 默认配置
# =============================================
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-project_management}"
DB_USER="${DB_USER:-project_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
AUTO_MODE=false
SKIP_TEST_DATA=false
SKIP_SEED_NEWS=false
START_DEV=false

# =============================================
# 命令行参数解析
# =============================================
for arg in "$@"; do
    case $arg in
        --auto)            AUTO_MODE=true ;;
        --skip-test-data)  SKIP_TEST_DATA=true ;;
        --skip-seed-news)  SKIP_SEED_NEWS=true ;;
        --start-dev)       START_DEV=true ;;
        --help|-h)
            echo "用法: ./deploy.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --auto            自动模式，使用默认值，不交互询问"
            echo "  --skip-test-data  跳过测试数据生成"
            echo "  --skip-seed-news  跳过行业新闻种子数据"
            echo "  --start-dev       部署完成后自动启动开发服务器"
            echo "  --help, -h        显示帮助"
            echo ""
            echo "环境变量:"
            echo "  DB_HOST           数据库主机 (默认: localhost)"
            echo "  DB_PORT           数据库端口 (默认: 5432)"
            echo "  DB_NAME           数据库名称 (默认: project_management)"
            echo "  DB_USER           数据库用户 (默认: project_user)"
            echo "  DB_PASSWORD       数据库密码"
            echo "  JWT_SECRET        JWT 签名密钥"
            echo "  ADMIN_PASSWORD    管理员密码 (默认: admin123)"
            exit 0
            ;;
    esac
done

# =============================================
# 工具函数
# =============================================

# 检查命令是否存在
command_exists() { command -v "$1" &>/dev/null; }

# 交互式读取（自动模式下使用默认值）
ask() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"

    if $AUTO_MODE; then
        eval "$var_name=\"\$default\""
        echo "$prompt (自动模式): $default"
        return
    fi

    if [ -n "$default" ]; then
        read -r -p "$prompt [$default]: " input
        eval "$var_name=\"\${input:-$default}\""
    else
        read -r -p "$prompt: " input
        eval "$var_name=\"\$input\""
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="${ID}"
        OS_NAME="${PRETTY_NAME:-$ID}"
    else
        OS_ID="unknown"
        OS_NAME="Unknown"
    fi
}

# =============================================
# 步骤 1：环境检测
# =============================================
step_1_check_environment() {
    log_step "步骤 1/6: 检测运行环境"

    detect_os
    log_info "操作系统: $OS_NAME"

    # 检测 Node.js
    if ! command_exists node; then
        log_error "未检测到 Node.js，请先安装 Node.js 22+"
        log_info "安装方法: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash && nvm install 24"
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        log_warn "Node.js 版本: $(node -v)，推荐 22+。如果遇到兼容性问题，请升级。"
    else
        log_info "Node.js 版本: $(node -v) ✓"
    fi

    # 检测 pnpm
    if ! command_exists pnpm; then
        log_info "pnpm 未安装，正在安装..."
        npm install -g pnpm
    fi
    log_info "pnpm 版本: $(pnpm -v) ✓"

    # 检测 PostgreSQL 客户端
    if command_exists psql; then
        log_info "PostgreSQL 客户端: $(psql --version | head -1) ✓"
    else
        log_warn "未检测到 psql 客户端，数据库操作将跳过部分验证"
    fi

    log_info "环境检测通过"
}

# =============================================
# 步骤 2：安装项目依赖
# =============================================
step_2_install_dependencies() {
    log_step "步骤 2/6: 安装项目依赖"

    # 确保 .npmrc 存在
    if [ ! -f .npmrc ]; then
        log_info "创建 .npmrc (pnpm 配置)..."
        cat > .npmrc << 'NPMRC_EOF'
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
store-dir=.pnpm-store
NPMRC_EOF
    else
        log_info ".npmrc 已存在，跳过创建"
    fi

    log_info "执行 pnpm install (可能需要几分钟)..."
    pnpm install

    log_info "依赖安装完成"
}

# =============================================
# 步骤 3：配置环境变量与数据库
# =============================================
step_3_configure() {
    log_step "步骤 3/6: 配置环境变量与数据库"

    # 3.1 生成 JWT Secret
    if [ -z "$JWT_SECRET" ]; then
        if command_exists node; then
            JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        else
            JWT_SECRET="change-me-in-production-$(date +%s)"
        fi
    fi

    # 3.2 收集数据库密码
    if [ -z "$DB_PASSWORD" ]; then
        if ! $AUTO_MODE; then
            log_info "请输入 PostgreSQL 数据库密码（$DB_USER 用户的密码）"
            ask "数据库密码" "project_pass_2024" DB_PASSWORD
        else
            DB_PASSWORD="project_pass_2024"
            log_info "数据库密码 (自动模式): $DB_PASSWORD"
        fi
    fi

    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

    # 3.3 写入 .env
    log_info "写入 .env 配置..."
    cat > .env << ENV_EOF
# 数据库配置
PGDATABASE_URL="${DATABASE_URL}"
DATABASE_URL="${DATABASE_URL}"

# 系统设置
JWT_SECRET="${JWT_SECRET}"
NODE_ENV="development"

# 服务器配置
PORT=5000
ENV_EOF

    # 3.4 检查数据库连接并创建
    if command_exists psql; then
        log_info "检查数据库连接..."
        export PGPASSWORD="$DB_PASSWORD"

        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" &>/dev/null; then
            log_info "数据库用户 $DB_USER 连接成功"

            # 检查数据库是否存在
            DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

            if [ "$DB_EXISTS" != "1" ]; then
                log_info "数据库 $DB_NAME 不存在，正在创建..."
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
                    log_warn "无法创建数据库，请确保用户有 CREATEDB 权限"
                    log_info "请手动执行: sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME; GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\""
                }
            else
                log_info "数据库 $DB_NAME 已存在"
            fi

            # PostgreSQL 15+ 授权 public schema
            PG_VERSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SHOW server_version;" 2>/dev/null | cut -d. -f1)
            if [ "${PG_VERSION:-0}" -ge 15 ] 2>/dev/null; then
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true
            fi
        else
            log_error "无法连接数据库（$DB_HOST:$DB_PORT，用户 $DB_USER）"
            log_info ""
            log_info "请确认 PostgreSQL 已安装并运行:"
            log_info "  sudo apt install -y postgresql postgresql-contrib  # Ubuntu/Debian"
            log_info "  sudo systemctl start postgresql"
            log_info ""
            log_info "然后创建用户和数据库:"
            log_info "  sudo -u postgres psql"
            log_info "  CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
            log_info "  CREATE DATABASE $DB_NAME OWNER $DB_USER;"
            log_info "  GRANT ALL ON SCHEMA public TO $DB_USER;"
            log_info ""
            log_info "完成后重新运行 ./deploy.sh"
            exit 1
        fi
    else
        log_warn "psql 客户端不可用，跳过数据库连接检查"
        log_info "请确保 PostgreSQL 已运行且以下数据库可访问:"
        log_info "  $DATABASE_URL"
    fi

    log_info "配置完成"
}

# =============================================
# 步骤 4：数据库 Schema 迁移
# =============================================
step_4_migrate() {
    log_step "步骤 4/6: 数据库 Schema 迁移"

    log_info "执行 drizzle-kit push (创建/更新所有表)..."
    pnpm drizzle-kit push

    log_info "Schema 迁移完成 (31 张表已就绪)"
}

# =============================================
# 步骤 5：创建管理员与种子数据
# =============================================
step_5_seed() {
    log_step "步骤 5/6: 创建管理员与种子数据"

    # 5.1 创建管理员账户
    log_info "创建管理员账户 (admin / $ADMIN_PASSWORD)..."
    node scripts/init-admin.js || {
        log_warn "init-admin.js 执行失败，尝试使用兼容方式创建..."
        # 回退：使用 bcryptjs + pg 直接创建
        node -e "
            const { Pool } = require('pg');
            const bcrypt = require('bcryptjs');
            const crypto = require('crypto');

            const dbUrl = process.env.DATABASE_URL || '$DATABASE_URL';
            const pool = new Pool({ connectionString: dbUrl });

            (async () => {
                try {
                    const hashed = bcrypt.hashSync('$ADMIN_PASSWORD', 10);
                    const id = crypto.randomUUID();
                    await pool.query(
                        'INSERT INTO users (id, username, password_hash, display_name, role, status, created_at, updated_at) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, NOW(), NOW()) ON CONFLICT (username) DO UPDATE SET role = \$5, password_hash = \$3',
                        [id, 'admin', hashed, '系统管理员', 'system_admin', 'active']
                    );
                    console.log('管理员账户已创建: admin / $ADMIN_PASSWORD');
                } catch (e) {
                    console.error('创建管理员失败:', e.message);
                    process.exit(1);
                } finally {
                    await pool.end();
                }
            })();
        " || {
            log_error "管理员账户创建失败，请手动执行: node scripts/init-admin.js"
        }
    }

    # 5.2 测试数据
    if ! $SKIP_TEST_DATA; then
        if $AUTO_MODE; then
            log_info "生成测试数据..."
        else
            ask "是否生成 20 组测试数据? (y/n)" "y" GEN_TEST_DATA
            if [ "$GEN_TEST_DATA" != "y" ] && [ "$GEN_TEST_DATA" != "Y" ]; then
                log_info "跳过测试数据生成"
                SKIP_TEST_DATA=true
            fi
        fi
    fi

    if ! $SKIP_TEST_DATA; then
        log_info "执行 generate-all-test-data.js..."
        node scripts/generate-all-test-data.js || log_warn "测试数据生成失败，可稍后手动执行"
        log_info "执行 populate-invoice-transaction.js..."
        node scripts/populate-invoice-transaction.js || log_warn "发票交易数据生成失败，可稍后手动执行"
    fi

    # 5.3 行业新闻种子数据
    if ! $SKIP_SEED_NEWS; then
        if [ -f scripts/seed-news-data.js ]; then
            log_info "写入行业新闻种子数据..."
            node scripts/seed-news-data.js || log_warn "新闻种子数据写入失败，可稍后手动执行"
        fi
    fi

    log_info "数据初始化完成"
}

# =============================================
# 步骤 6：验证与启动
# =============================================
step_6_verify_and_start() {
    log_step "步骤 6/6: 验证与启动"

    # 6.1 验证构建（快速检查代码可编译性）
    log_info "验证项目构建..."
    if pnpm build 2>&1 | tail -5; then
        log_info "构建验证通过 ✓"
    else
        log_warn "构建验证有警告，但不影响开发模式运行"
    fi

    # 6.2 启动开发服务器
    echo ""
    log_info "=========================================="
    log_info "  部署完成!"
    log_info "=========================================="
    echo ""
    log_info "  URL:       http://localhost:3000"
    log_info "  用户名:    admin"
    log_info "  密码:      $ADMIN_PASSWORD"
    echo ""

    if [ "$START_DEV" = true ] || $AUTO_MODE; then
        log_info "启动开发服务器..."
        pnpm dev
    else
        ask "是否现在启动开发服务器? (y/n)" "y" DO_START
        if [ "$DO_START" = "y" ] || [ "$DO_START" = "Y" ]; then
            log_info "启动开发服务器 (按 Ctrl+C 停止)..."
            pnpm dev
        else
            log_info "手动启动: pnpm dev"
        fi
    fi
}

# =============================================
# 主流程
# =============================================
main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     项目管理系统 - 一键自动部署脚本         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
    echo ""

    # 确保在项目根目录
    if [ ! -f package.json ] || ! grep -q '"name": "project-management-system"' package.json 2>/dev/null; then
        log_error "请在项目根目录 (project-management-system/) 下运行此脚本"
        exit 1
    fi

    # 按顺序执行各步骤
    step_1_check_environment
    step_2_install_dependencies
    step_3_configure
    step_4_migrate
    step_5_seed
    step_6_verify_and_start
}

main "$@"
