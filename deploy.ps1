#############################################################################
# 项目管理系统 - 一键部署脚本 (PowerShell)
#############################################################################
# 支持系统：Windows
# 使用方法：powershell -ExecutionPolicy Bypass -File deploy.ps1
#############################################################################

# 错误时停止
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Info {
    Write-ColorOutput Cyan "ℹ $args"
}

function Write-Success {
    Write-ColorOutput Green "✓ $args"
}

function Write-Warning {
    Write-ColorOutput Yellow "⚠ $args"
}

function Write-Error {
    Write-ColorOutput Red "✗ $args"
}

function Write-Separator {
    Write-Output ""
    Write-Output "═══════════════════════════════════════════════════════════════"
    Write-Output ""
}

# 检查命令是否存在
function Test-Command {
    param($Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# 检查系统环境
function Check-Environment {
    Write-Info "检查系统环境..."

    # 检查操作系统
    $OS = [System.Environment]::OSVersion.Platform
    Write-Success "操作系统：Windows"

    # 检查 Node.js
    if (-not (Test-Command node)) {
        Write-Error "未检测到 Node.js，请先安装 Node.js 24 或更高版本"
        Write-Info "下载地址：https://nodejs.org/"
        exit 1
    }

    $NODE_VERSION = node -v
    Write-Success "Node.js 版本：$NODE_VERSION"

    # 检查 pnpm
    if (-not (Test-Command pnpm)) {
        Write-Warning "未检测到 pnpm，正在安装..."
        npm install -g pnpm
        Write-Success "pnpm 安装成功"
    }
    $PNPM_VERSION = pnpm -v
    Write-Success "pnpm 版本：$PNPM_VERSION"

    # 检查 Git
    if (-not (Test-Command git)) {
        Write-Error "未检测到 Git，请先安装 Git"
        Write-Info "下载地址：https://git-scm.com/downloads"
        exit 1
    }
    $GIT_VERSION = git --version
    Write-Success "Git 版本：$GIT_VERSION"

    Write-Separator
}

# 检查 PostgreSQL
function Check-PostgreSQL {
    Write-Info "检查 PostgreSQL..."

    if (-not (Test-Command psql)) {
        Write-Error "未检测到 PostgreSQL，请先安装"
        Write-Info "下载地址：https://www.postgresql.org/download/windows/"
        exit 1
    }

    Write-Success "PostgreSQL 已安装"

    # 检查 PostgreSQL 服务是否运行
    try {
        $null = psql -h localhost -U postgres -c "SELECT 1;" 2>&1
        Write-Success "PostgreSQL 服务正在运行"
    } catch {
        Write-Error "PostgreSQL 服务未运行或无法连接"
        Write-Info "请检查："
        Write-Info "  1. PostgreSQL 服务是否已启动"
        Write-Info "  2. .env 文件中的数据库配置是否正确"
        exit 1
    }

    Write-Separator
}

# 配置环境变量
function Setup-Env {
    Write-Info "配置环境变量..."

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Success "已创建 .env 文件（从 .env.example 复制）"
        } else {
            Write-Error ".env.example 文件不存在"
            exit 1
        }
    } else {
        Write-Warning ".env 文件已存在，跳过创建"
    }

    # 检查 JWT_SECRET
    if (Test-Path ".env") {
        $ENV_FILE = Get-Content ".env" -Raw
        if ($ENV_FILE -match "JWT_SECRET=your-random-secret-key-here" -or $ENV_FILE -notmatch "JWT_SECRET=") {
            Write-Warning "JWT_SECRET 使用默认值，正在生成新的密钥..."
            $NEW_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
            $ENV_FILE = $ENV_FILE -replace "JWT_SECRET=.*", "JWT_SECRET=$NEW_SECRET"
            $ENV_FILE | Set-Content ".env" -NoNewline
            Write-Success "已生成新的 JWT_SECRET"
        } else {
            Write-Success "JWT_SECRET 已配置"
        }
    }

    Write-Separator
}

# 安装依赖
function Install-Dependencies {
    Write-Info "安装项目依赖..."

    if (-not (Test-Path "node_modules")) {
        pnpm install
        Write-Success "依赖安装完成"
    } else {
        Write-Warning "node_modules 已存在，跳过安装"
        Write-Info "如需重新安装，请执行：Remove-Item -Recurse -Force node_modules; pnpm install"
    }

    Write-Separator
}

# 初始化数据库
function Initialize-Database {
    Write-Info "初始化数据库..."

    # 运行数据库迁移
    Write-Info "正在创建数据库表..."
    pnpm drizzle-kit push
    Write-Success "数据库表创建成功"

    # 询问是否初始化管理员账户
    Write-Output ""
    $INIT_ADMIN = Read-Host "是否创建默认管理员账户？(Y/n)"
    if ($INIT_ADMIN -eq "" -or $INIT_ADMIN -eq "Y" -or $INIT_ADMIN -eq "y") {
        node scripts/init-admin.js
    } else {
        Write-Info "跳过创建管理员账户"
    }

    Write-Separator
}

# 构建项目
function Build-Project {
    Write-Info "构建项目..."

    pnpm build

    Write-Success "项目构建完成"

    Write-Separator
}

# 启动服务
function Start-Service {
    Write-Info "启动服务..."

    # 检查端口 5000 是否被占用
    $PORT_IN_USE = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($PORT_IN_USE) {
        Write-Warning "端口 5000 已被占用"
        Write-Output ""
        $KILL_PROCESS = Read-Host "是否终止占用该端口的进程并继续？(Y/n)"
        if ($KILL_PROCESS -eq "" -or $KILL_PROCESS -eq "Y" -or $KILL_PROCESS -eq "y") {
            Write-Info "正在终止占用端口的进程..."
            $PID = $PORT_IN_USE.OwningProcess
            Stop-Process -Id $PID -Force
            Write-Success "进程已终止"
            Start-Sleep -Seconds 2
        } else {
            Write-Error "部署已取消"
            exit 1
        }
    }

    # 询问启动模式
    Write-Output ""
    Write-Output "请选择启动模式："
    Write-Output "  1) 开发模式（支持热更新）"
    Write-Output "  2) 生产模式（已构建版本）"
    Write-Output ""
    $MODE = Read-Host "请输入选项 (1-2) [默认: 1]"
    if ($MODE -eq "" -or $MODE -eq "1") {
        Write-Info "启动开发模式..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm dev"
    } elseif ($MODE -eq "2") {
        Write-Info "启动生产模式..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm start"
    } else {
        Write-Error "无效选项"
        exit 1
    }

    Write-Separator
}

# 显示部署结果
function Show-Result {
    Write-Output ""
    Write-Separator
    Write-ColorOutput Green "╔═══════════════════════════════════════════════════════╗"
    Write-ColorOutput Green "║                   🎉 部署成功！                        ║"
    Write-ColorOutput Green "╚═══════════════════════════════════════════════════════╝"
    Write-Output ""
    Write-Output "访问地址："
    Write-ColorOutput Cyan "  http://localhost:5000"
    Write-Output ""
    Write-Output "默认管理员账户（如已创建）："
    Write-ColorOutput Cyan "  用户名：admin"
    Write-ColorOutput Cyan "  密码：admin123"
    Write-Output ""
    Write-ColorOutput Yellow "⚠️  重要提示："
    Write-Output "  1. 首次登录后请立即修改密码！"
    Write-Output "  2. 生产环境请务必修改默认密码！"
    Write-Output "  3. 系统已在新的 PowerShell 窗口中运行"
    Write-Output ""
    Write-Output "常用命令："
    Write-Output "  停止服务：关闭 PowerShell 窗口或按 Ctrl+C"
    Write-Output "  重新部署：powershell -ExecutionPolicy Bypass -File deploy.ps1"
    Write-Output ""
}

# 主函数
function Main {
    Write-Output ""
    Write-ColorOutput Cyan "╔═══════════════════════════════════════════════════════╗"
    Write-ColorOutput Cyan "║           项目管理系统 - 一键部署工具 (Windows)      ║"
    Write-ColorOutput Cyan "╚═══════════════════════════════════════════════════════╝"
    Write-Output ""

    Check-Environment
    Check-PostgreSQL
    Setup-Env
    Install-Dependencies
    Initialize-Database

    # 询问是否构建
    Write-Output ""
    $BUILD = Read-Host "是否构建生产版本？(Y/n)"
    if ($BUILD -eq "" -or $BUILD -eq "Y" -or $BUILD -eq "y") {
        Build-Project
    } else {
        Write-Info "跳过构建步骤"
    }

    Start-Service
    Show-Result
}

# 运行主函数
Main
