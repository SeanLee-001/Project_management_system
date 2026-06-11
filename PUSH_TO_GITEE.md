# 🚀 代码同步到 Gitee 指南

## 当前状态
✅ Git 仓库已配置
✅ 代码已提交成功
⚠️  需要配置认证信息才能推送

---

## 方式一：使用访问令牌（推荐）

### 1. 获取 Gitee 访问令牌

1. 访问 https://gitee.com/profile/personal_access_tokens
2. 点击"生成新的访问令牌"
3. 填写备注（如："Project Management System"）
4. 勾选权限：`projects`、`pull_requests`、`issues`
5. 点击"确定"生成
6. **复制并保存令牌**（只会显示一次！）

### 2. 使用令牌推送代码

```bash
# 方法 A: 使用 HTTPS + 令牌（推荐）
git remote set-url gitee https://<你的令牌>@gitee.com/sean_lee_001/project-management-system.git
git push gitee master

# 示例（替换 YOUR_TOKEN 为实际令牌）:
# git remote set-url gitee https://abc123xyz456@gitee.com/sean_lee_001/project-management-system.git
# git push gitee master
```

```bash
# 方法 B: 推送时输入令牌
git push gitee master
# 提示用户名时输入：sean_lee_001
# 提示密码时输入：你的访问令牌
```

---

## 方式二：使用 SSH Key

### 1. 生成 SSH Key

```bash
# 生成新的 SSH key
ssh-keygen -t ed25519 -C "你的邮箱@example.com"

# 按 Enter 接受默认路径
# 输入密码短语（可选，直接按 Enter 跳过）
```

### 2. 添加 SSH Key 到 Gitee

```bash
# 查看公钥内容
cat ~/.ssh/id_ed25519.pub
```

复制输出的内容，然后：

1. 访问 https://gitee.com/profile/sshkeys
2. 点击"添加 SSH 公钥"
3. 填入标题（如："My Desktop"）
4. 粘贴公钥内容
5. 点击"确定"

### 3. 切换到 SSH 方式并推送

```bash
# 切换远程仓库为 SSH 方式
git remote set-url gitee git@gitee.com:sean_lee_001/project-management-system.git

# 推送代码
git push gitee master
```

---

## 方式三：使用 Gitee 客户端

### Windows 用户

1. 下载 Gitee Desktop: https://gitee.com/expend/download
2. 登录账号
3. 克隆仓库：`https://gitee.com/sean_lee_001/project-management-system.git`
4. 将本地代码复制到克隆的目录
5. 提交并推送

---

## 验证推送成功

推送完成后，访问仓库确认：
https://gitee.com/sean_lee_001/project-management-system

应该能看到：
- ✅ 最新提交记录
- ✅ 所有文件和目录
- ✅ Commit message: "feat: 完善项目管理系统审批和核心功能"

---

## 常见问题

### Q1: 提示 "Permission denied"
**解决**: 检查访问令牌是否有足够权限，或 SSH key 是否正确添加

### Q2: 提示 "Repository not found"
**解决**: 确认仓库地址是否正确，检查是否拼写错误

### Q3: 推送速度慢
**解决**: 使用国内镜像或配置 Git 加速
```bash
git config --global http.postBuffer 524288000
git config --global https.postBuffer 524288000
```

### Q4: 大文件推送失败
**解决**: 使用 Git LFS 或手动上传大文件

---

## 后续同步

### 日常开发流程

```bash
# 1. 拉取最新代码
git pull gitee master

# 2. 开发新功能...

# 3. 提交更改
git add .
git commit -m "feat: 新功能描述"

# 4. 推送到 Gitee
git push gitee master
```

### 查看状态

```bash
# 查看远程仓库配置
git remote -v

# 查看提交历史
git log --oneline -10

# 查看分支
git branch -a
```

---

## 下一步

代码推送到 Gitee 后，您可以：

1. **配置 Webhook** - 实现自动部署
2. **开启 Issues** - 跟踪问题和需求
3. **创建 Releases** - 发布版本
4. **设置 CI/CD** - 自动化测试和部署

---

## 联系支持

如有问题，请查看：
- Gitee 帮助文档：https://help.gitee.com
- 或联系开发团队
