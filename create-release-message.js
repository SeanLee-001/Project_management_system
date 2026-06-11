const fetch = require('node-fetch');

async function createReleaseMessage() {
  const adminId = 'e6952049-31fe-4b09-8772-0b4408178bcd'; // admin 用户ID

  const message = {
    title: '项目管理系统桌面客户端发布说明',
    content: `项目管理系统桌面客户端（Windows版本）现已准备好！

【获取方式】
由于技术限制，桌面客户端需要在 Windows 环境中手动打包。请按照以下步骤操作：

1. 在 Windows 电脑上克隆项目源码
2. 运行打包命令：pnpm electron:build
3. 生成的安装包位于：dist/项目管理系统-1.0.0-x64.exe

【详细说明】
请参考项目根目录的打包说明文档：
- BUILD_GUIDE.md - 完整打包指南
- package.bat - Windows 打包脚本
- README_PACKAGING.md - 快速开始指南

【系统要求】
- Windows 10/11 (64位)
- 至少 4GB RAM
- 500MB 可用磁盘空间

【功能特性】
- 完整的项目管理功能
- 任务分配与跟踪
- 审批流程管理
- 客户/合同/订单管理
- 消息通知系统

【技术支持】
如有问题，请联系技术支持团队。`,
    type: 'announcement',
    senderId: adminId,
    isPinned: true
  };

  try {
    const response = await fetch('http://localhost:5000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('消息创建成功:', result);
  } catch (error) {
    console.error('消息创建失败:', error);
  }
}

createReleaseMessage();
