#!/bin/bash

# Git 仓库设置脚本
# 用于配置 GitHub 和 Gitee 远程仓库并推送代码

set -e

echo "======================================"
echo "Git 仓库设置和代码同步脚本"
echo "======================================"
echo ""

# 检查是否在 Git 仓库中
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo "❌ 错误：当前目录不是 Git 仓库"
    exit 1
fi

# 询问用户仓库信息
echo "请输入您的 GitHub 仓库信息："
read -p "GitHub 用户名：" GITHUB_USER
read -p "GitHub 仓库名：" GITHUB_REPO
GITHUB_URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

echo ""
echo "请输入您的 Gitee 仓库信息："
read -p "Gitee 用户名：" GITEE_USER
read -p "Gitee 仓库名：" GITEE_REPO
GITEE_URL="https://gitee.com/${GITEE_USER}/${GITEE_REPO}.git"

echo ""
echo "======================================"
echo "配置摘要："
echo "GitHub: ${GITHUB_URL}"
echo "Gitee:  ${GITEE_URL}"
echo "======================================"
echo ""
read -p "确认配置是否正确？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 0
fi

# 配置 Git 用户信息（如果需要）
echo ""
read -p "是否配置 Git 用户信息？(Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入您的姓名：" GIT_NAME
    read -p "请输入您的邮箱：" GIT_EMAIL
    git config user.name "${GIT_NAME}"
    git config user.email "${GIT_EMAIL}"
    echo "✅ Git 用户信息已配置"
fi

# 添加远程仓库
echo ""
echo "添加远程仓库..."
git remote remove github 2>/dev/null || true
git remote add github "${GITHUB_URL}"
echo "✅ GitHub 远程仓库已添加"

git remote remove gitee 2>/dev/null || true
git remote add gitee "${GITEE_URL}"
echo "✅ Gitee 远程仓库已添加"

# 清理临时文件
echo ""
echo "清理临时文件..."
rm -f *.md 2>/dev/null || true
rm -f .src_backup.tar.gz 2>/dev/null || true
echo "✅ 临时文件已清理"

# Git 状态检查
echo ""
echo "======================================"
echo "Git 状态："
echo "======================================"
git status --short

echo ""
read -p "是否继续提交并推送？(Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消推送"
    exit 1
fi

# 提交代码
echo ""
echo "提交代码..."
git add .
git commit -m "feat: 完善审批系统和管理功能

- 新增审批转交功能，支持将审批任务转交给其他用户
- 系统管理员可跳过审批流程，直接审批所有项目
- 三级审批流程优化，管理员一次性通过所有级别
- 订单管理增加延期天数显示（项目名称下方）
- 黑色侧边栏主题切换功能
- 修复多个审批相关 bug：
  - 修复审批权限判断逻辑
  - 修复变量重复定义和未定义错误
  - 修复审批数据传递问题

## 技术改进
- 优化审批 API 数据结构
- 改进错误处理和日志输出
- 完善用户角色识别（支持中英文角色名）

## 测试建议
详见 SYSTEM_TEST_REPORT.md"

echo "✅ 代码已提交"

# 推送到 GitHub
echo ""
echo "推送到 GitHub..."
git push github master || echo "⚠️  GitHub 推送失败，请检查网络连接或仓库权限"

# 推送到 Gitee
echo ""
echo "推送到 Gitee..."
git push gitee master || echo "⚠️  Gitee 推送失败，请检查网络连接或仓库权限"

echo ""
echo "======================================"
echo "✅ 同步完成！"
echo "======================================"
echo ""
echo "GitHub: ${GITHUB_URL}"
echo "Gitee:  ${GITEE_URL}"
echo ""
echo "下一步："
echo "1. 访问 GitHub/Gitee 查看代码"
echo "2. 配置服务器部署"
echo "3. 按照 SYSTEM_TEST_REPORT.md 进行测试"
echo ""
