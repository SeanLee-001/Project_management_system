#!/bin/bash

#############################################################################
# 项目管理系统 - 一键部署脚本
#############################################################################
# 支持系统：Linux / macOS
# 使用方法：bash deploy.sh
#############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# 打印分隔线
print_separator() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查系统环境
check_environment() {
    print_info "检查系统环境..."

    # 检测操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "操作系统：Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "操作系统：macOS"
    else
        print_error "不支持的操作系统：$OSTYPE"
        exit 1
    fi

    # 检查 Node.js
    if ! command_exists node; then
        print_error "未检测到 Node.js，请先安装 Node.js 24 或更高版本"
        print_info "安装方法：https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v)
    print_success "Node.js 版本：$NODE_VERSION"

    # 检查 Node.js 版本是否 >= 18
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_warning "Node.js 版本过低，建议升级到 24 或更高版本"
    fi

    # 检查 pnpm
    if ! command_exists pnpm; then
        print_warning "未检测到 pnpm，正在安装..."
        npm install -g pnpm
        print_success "pnpm 安装成功"
    fi
    print_success "pnpm 版本：$(pnpm -v)"

    # 检查 Git
    if ! command_exists git; then
        print_error "未检测到 Git，请先安装 Git"
        exit 1
    fi
    print_success "Git 版本：$(git --version)"

    print_separator
}

# 检查 PostgreSQL
check_postgresql() {
    print_info "检查 PostgreSQL..."

    if ! command_exists psql; then
        print_error "未检测到 PostgreSQL，请先安装"
        if [ "$OS" == "linux" ]; then
            print_info "Ubuntu/Debian 安装命令：sudo apt install postgresql postgresql-contrib"
            print_info "CentOS/RHEL 安装命令：sudo yum install postgresql postgresql-server"
        elif [ "$OS" == "macos" ]; then
            print_info "macOS 安装命令：brew install postgresql@14"
        fi
        exit 1
    fi

    # 检查 PostgreSQL 服务是否运行
    if ! pg_isready -q 2>/dev/null; then
        print_error "PostgreSQL 服务未运行"
        print_info "启动命令："
        if [ "$OS" == "linux" ]; then
            print_info "  sudo systemctl start postgresql"
        elif [ "$OS" == "macos" ]; then
            print_info "  brew services start postgresql@14"
        fi
        exit 1
    fi

    print_success "PostgreSQL 已运行"

    # 检查 .env 文件中的数据库配置
    if [ -f ".env" ]; then
        DB_URL=$(grep "^DATABASE_URL" .env | cut -d'=' -f2)
        if [ -n "$DB_URL" ]; then
            print_success "数据库配置已找到"
        fi
    fi

    print_separator
}

# 配置环境变量
setup_env() {
    print_info "配置环境变量..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "已创建 .env 文件（从 .env.example 复制）"
        else
            print_error ".env.example 文件不存在"
            exit 1
        fi
    else
        print_warning ".env 文件已存在，跳过创建"
    fi

    # 检查 JWT_SECRET
    if [ -f ".env" ]; then
        JWT_SECRET=$(grep "^JWT_SECRET" .env | cut -d'=' -f2)
        if [ "$JWT_SECRET" == "your-random-secret-key-here" ] || [ -z "$JWT_SECRET" ]; then
            print_warning "JWT_SECRET 使用默认值，正在生成新的密钥..."
            NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
            sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env
            rm -f .env.bak
            print_success "已生成新的 JWT_SECRET"
        else
            print_success "JWT_SECRET 已配置"
        fi
    fi

    print_separator
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."

    if [ ! -d "node_modules" ]; then
        pnpm install
        print_success "依赖安装完成"
    else
        print_warning "node_modules 已存在，跳过安装"
        print_info "如需重新安装，请执行：rm -rf node_modules && pnpm install"
    fi

    print_separator
}

# 初始化数据库
init_database() {
    print_info "初始化数据库..."

    # 运行数据库迁移
    print_info "正在创建数据库表..."
    pnpm drizzle-kit push
    print_success "数据库表创建成功"

    # 询问是否初始化管理员账户
    echo ""
    read -p "是否创建默认管理员账户？(Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
        node scripts/init-admin.js
    else
        print_info "跳过创建管理员账户"
    fi

    print_separator
}

# 构建项目
build_project() {
    print_info "构建项目..."

    pnpm build

    print_success "项目构建完成"

    print_separator
}

# 启动服务
start_service() {
    print_info "启动服务..."

    # 检查端口 5000 是否被占用
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 || \
       ss -tuln 2>/dev/null | grep -E ':5000[[:space:]]' | grep -q LISTEN; then
        print_warning "端口 5000 已被占用"
        echo ""
        read -p "是否终止占用该端口的进程并继续？(Y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
            print_info "正在终止占用端口的进程..."
            if command_exists lsof; then
                PID=$(lsof -t -i:5000)
                if [ -n "$PID" ]; then
                    kill -9 $PID
                    print_success "进程已终止"
                fi
            else
                print_warning "无法终止进程，请手动处理"
                exit 1
            fi
        else
            print_error "部署已取消"
            exit 1
        fi
    fi

    # 询问启动模式
    echo ""
    echo "请选择启动模式："
    echo "  1) 开发模式（支持热更新）"
    echo "  2) 生产模式（已构建版本）"
    echo ""
    read -p "请输入选项 (1-2) [默认: 1]: " mode
    mode=${mode:-1}

    if [ "$mode" == "1" ]; then
        print_info "启动开发模式..."
        pnpm dev &
    elif [ "$mode" == "2" ]; then
        print_info "启动生产模式..."
        pnpm start &
    else
        print_error "无效选项"
        exit 1
    fi

    print_separator
}

# 显示部署结果
show_result() {
    echo ""
    print_separator
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                   🎉 部署成功！                        ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "访问地址："
    echo -e "  ${BLUE}http://localhost:5000${NC}"
    echo ""
    echo "默认管理员账户（如已创建）："
    echo -e "  用户名：${BLUE}admin${NC}"
    echo -e "  密码：${BLUE}admin123${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  重要提示：${NC}"
    echo "  1. 首次登录后请立即修改密码！"
    echo "  2. 生产环境请务必修改默认密码！"
    echo "  3. 查看日志：tail -f logs/*.log（如果使用 PM2）"
    echo ""
    echo "常用命令："
    echo "  停止服务：Ctrl+C 或 kill \$(lsof -t -i:5000)"
    echo "  重新部署：bash deploy.sh"
    echo "  查看日志：pm2 logs project-management（如果使用 PM2）"
    echo ""
}

# 主函数
main() {
    echo ""
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║           项目管理系统 - 一键部署工具                ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    check_environment
    check_postgresql
    setup_env
    install_dependencies
    init_database

    # 询问是否构建
    echo ""
    read -p "是否构建生产版本？(Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
        build_project
    else
        print_info "跳过构建步骤"
    fi

    start_service
    show_result
}

# 运行主函数
main
