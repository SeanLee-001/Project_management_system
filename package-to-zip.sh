#!/bin/bash

#############################################################################
# 项目管理系统 - ZIP 打包脚本 (Linux/macOS)
#############################################################################
# 功能：将整个系统打包为 ZIP 格式
# 使用方法：bash package-to-zip.sh
#############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 读取版本号
if [ -f "package.json" ]; then
    VERSION=$(grep '"version"' package.json | head -1 | awk -F: '{print $2}' | sed 's/[", ]//g')
else
    VERSION="1.0.0"
fi

PROJECT_NAME="project-management-system"
PACKAGE_NAME="${PROJECT_NAME}-v${VERSION}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="dist"
ZIP_FILE="${OUTPUT_DIR}/${PACKAGE_NAME}-${TIMESTAMP}.zip"

echo ""
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           项目管理系统 - ZIP 打包工具                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
print_info "版本：${VERSION}"
print_info "包名：${PACKAGE_NAME}"
print_info "格式：ZIP"
echo ""

# 清理旧的打包文件
print_info "清理旧的打包文件..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
print_success "清理完成"

# 临时目录
TEMP_DIR="${OUTPUT_DIR}/${PACKAGE_NAME}"
mkdir -p "$TEMP_DIR"

# 复制核心文件
print_info "复制项目文件..."

# 复制源代码
print_info "  - 复制 src 目录..."
if [ -d "src" ]; then
    cp -r src "$TEMP_DIR/"
fi

# 复制公共资源
print_info "  - 复制 public 目录..."
if [ -d "public" ]; then
    cp -r public "$TEMP_DIR/"
fi

# 复制配置文件
print_info "  - 复制配置文件..."
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true
cp pnpm-lock.yaml "$TEMP_DIR/" 2>/dev/null || true
cp next.config.ts "$TEMP_DIR/" 2>/dev/null || true
cp next.config.mjs "$TEMP_DIR/" 2>/dev/null || true
cp tsconfig.json "$TEMP_DIR/" 2>/dev/null || true
cp drizzle.config.ts "$TEMP_DIR/" 2>/dev/null || true
cp .coze "$TEMP_DIR/" 2>/dev/null || true

# 复制环境变量模板
print_info "  - 复制环境变量模板..."
cp .env.example "$TEMP_DIR/"

# 复制部署脚本
print_info "  - 复制部署脚本..."
cp deploy.sh "$TEMP_DIR/"
cp deploy.ps1 "$TEMP_DIR/"
chmod +x "$TEMP_DIR/deploy.sh"

# 复制所有文档
print_info "  - 复制文档..."
cp README.md "$TEMP_DIR/" 2>/dev/null || true
cp DEPLOYMENT_GUIDE.md "$TEMP_DIR/" 2>/dev/null || true
cp DOWNLOAD_AND_DEPLOY.md "$TEMP_DIR/" 2>/dev/null || true
cp PACKAGE_AND_DEPLOY.md "$TEMP_DIR/" 2>/dev/null || true
cp VERSION.md "$TEMP_DIR/" 2>/dev/null || true
cp QUICK_START.md "$TEMP_DIR/" 2>/dev/null || true

# 复制脚本
print_info "  - 复制脚本..."
if [ -d "scripts" ]; then
    cp -r scripts "$TEMP_DIR/"
fi

# 复制 .cozeproj（如果有）
if [ -d ".cozeproj" ]; then
    cp -r .cozeproj "$TEMP_DIR/"
fi

# 复制 mobile-app（如果存在）
if [ -d "mobile-app" ]; then
    read -p "是否包含移动端APP？(Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
        print_info "  - 复制 mobile-app 目录..."
        cp -r mobile-app "$TEMP_DIR/"
    fi
fi

# 创建 .gitignore
print_info "  - 创建 .gitignore..."
cat > "$TEMP_DIR/.gitignore" << 'EOF'
node_modules
.next
.env
dist
logs
*.log
.DS_Store
EOF

# 创建版本信息文件
print_info "  - 创建版本信息..."
cat > "$TEMP_DIR/VERSION.md" << EOF
# 项目管理系统 - 版本信息

- **版本**: ${VERSION}
- **打包时间**: $(date "+%Y-%m-%d %H:%M:%S")
- **操作系统**: $(uname -s)
- **平台**: $(uname -m)
- **打包格式**: ZIP

## 包含内容

- 前端代码（Next.js 16 + React 19）
- 后端 API
- 数据库配置
- 部署脚本
- 完整文档

## 快速开始

请参考 \`QUICK_START.md\` 或 \`DEPLOYMENT_GUIDE.md\` 进行部署。

## 部署方法

### Linux/macOS
\`\`\`bash
chmod +x deploy.sh
bash deploy.sh
\`\`\`

### Windows
\`\`\`powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
\`\`\`

## 系统要求

- Node.js 24.x 或更高版本
- PostgreSQL 14.x 或更高版本
- pnpm 包管理器
- Git

## 注意事项

1. 部署前请仔细阅读 \`QUICK_START.md\`
2. 首次部署需要配置数据库连接
3. 默认管理员账户：admin / admin123（部署后请立即修改）
4. 生产环境请务必修改 JWT_SECRET 和默认密码

---

打包工具版本：1.0.0
EOF

print_success "文件复制完成"

# 清理不必要的文件
print_info "清理不必要的文件..."
cd "$TEMP_DIR"

# 删除开发相关文件
rm -rf .git 2>/dev/null || true
rm -rf node_modules 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -f .env 2>/dev/null || true
rm -f *.log 2>/dev/null || true
rm -f output.log 2>/dev/null || true

# 删除 IDE 配置
rm -rf .vscode 2>/dev/null || true
rm -rf .idea 2>/dev/null || true
rm -f *.iml 2>/dev/null || true

# 删除临时文件
rm -f .DS_Store 2>/dev/null || true
rm -f *.swp 2>/dev/null || true
rm -f *.swo 2>/dev/null || true

cd - > /dev/null
print_success "清理完成"

# 创建 ZIP 文件
print_info "创建 ZIP 文件..."
cd "$OUTPUT_DIR"
zip -r "${ZIP_FILE}" "${PACKAGE_NAME}" -q
cd - > /dev/null

# 计算文件大小和校验和
FILE_SIZE=$(du -h "${ZIP_FILE}" | cut -f1)
CHECKSUM=$(sha256sum "${ZIP_FILE}" | awk '{print $1}')

print_success "ZIP 文件创建完成"

# 创建校验文件
print_info "生成校验文件..."
cat > "${OUTPUT_DIR}/checksum.txt" << EOF
# 校验和信息

文件名: ${ZIP_FILE}
文件大小: ${FILE_SIZE}
格式: ZIP
SHA-256: ${CHECKSUM}
打包时间: $(date "+%Y-%m-%d %H:%M:%S")

验证方法（Linux/macOS）:
sha256sum ${ZIP_FILE}

验证方法（Windows）:
certutil -hashfile ${ZIP_FILE} SHA256

正确校验和: ${CHECKSUM}
EOF

print_success "校验文件创建完成"

# 清理临时目录
print_info "清理临时文件..."
rm -rf "$TEMP_DIR"
print_success "清理完成"

# 显示结果
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                   🎉 打包成功！                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "打包信息："
echo -e "  版本：${BLUE}${VERSION}${NC}"
echo -e "  文件：${BLUE}${ZIP_FILE}${NC}"
echo -e "  大小：${BLUE}${FILE_SIZE}${NC}"
echo -e "  格式：${BLUE}ZIP${NC}"
echo -e "  校验和：${BLUE}${CHECKSUM}${NC}"
echo ""
echo "文件位置："
echo -e "  ${BLUE}$(pwd)/${ZIP_FILE}${NC}"
echo ""
echo "下载路径："
echo -e "  ${BLUE}file://$(pwd)/${ZIP_FILE}${NC}"
echo ""
echo "下一步操作："
echo "  1. 下载 ZIP 文件到目标服务器或本地电脑"
echo "  2. 解压：unzip ${ZIP_FILE}"
echo "  3. 进入目录：cd ${PACKAGE_NAME}"
echo "  4. 运行部署：bash deploy.sh (Linux/macOS) 或 deploy.ps1 (Windows)"
echo ""
echo "校验信息："
echo -e "  ${BLUE}$(pwd)/checksum.txt${NC}"
echo ""
