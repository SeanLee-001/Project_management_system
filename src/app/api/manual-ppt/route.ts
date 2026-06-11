import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { getUserFromToken } from "@/lib/auth";
import fs from "fs";
import path from "path";

// POST /api/manual-ppt - 生成系统说明书PPT
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份（可选，允许公开访问）
    // const user = await getUserFromToken(request);
    // if (!user) {
    //   return NextResponse.json({ success: false, error: "未授权，请先登录" }, { status: 401 });
    // }

    // 创建PPT
    const pptx = new PptxGenJS();
    
    // 设置PPT属性
    pptx.author = "非凡项目管理系统";
    pptx.title = "非凡项目管理系统操作说明书";
    pptx.subject = "系统操作指南";
    pptx.company = "非凡项目管理系统团队";

    // 定义主题颜色
    const themeColor = "1E40AF"; // 深蓝色
    const accentColor = "3B82F6"; // 蓝色
    const textColor = "1F2937"; // 深灰色
    const lightGray = "F3F4F6";

    // ========== 封面页 ==========
    let slide = pptx.addSlide();
    slide.background = { color: themeColor };
    
    // 标题
    slide.addText("非凡项目管理系统", {
      x: 0.5,
      y: 2.5,
      w: "90%",
      h: 1,
      fontSize: 44,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });
    
    // 副标题
    slide.addText("操作说明书", {
      x: 0.5,
      y: 3.5,
      w: "90%",
      h: 0.6,
      fontSize: 28,
      color: "FFFFFF",
      align: "center",
    });
    
    // 版本信息
    slide.addText("版本: v2.0 | 更新日期: 2025年1月", {
      x: 0.5,
      y: 4.5,
      w: "90%",
      h: 0.4,
      fontSize: 14,
      color: "FFFFFF",
      align: "center",
    });

    // ========== 目录页 ==========
    slide = pptx.addSlide();
    slide.addText("目录", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    const tocItems = [
      "1. 系统概述",
      "2. 系统登录",
      "3. 功能模块介绍",
      "4. 权限管理",
      "5. 后台管理",
      "6. 移动端APP",
      "7. 数据导入导出",
      "8. 数据库配置",
      "9. 常见问题",
    ];
    
    slide.addText(tocItems.join("\n"), {
      x: 0.8,
      y: 1.2,
      w: "80%",
      h: 4,
      fontSize: 18,
      color: textColor,
      lineSpacing: 28,
    });

    // ========== 1. 系统概述 ==========
    slide = pptx.addSlide();
    slide.addText("1. 系统概述", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("系统简介", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("非凡项目管理系统是一款全功能的项目管理平台，集成了项目管理、任务管理、客户管理、合同管理、订单管理、产品管理等核心功能。", {
      x: 0.5,
      y: 1.5,
      w: "90%",
      h: 0.8,
      fontSize: 14,
      color: textColor,
    });
    
    slide.addText("技术架构", {
      x: 0.5,
      y: 2.4,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 前端框架: Next.js 16 + React 19\n• UI组件: shadcn/ui + Tailwind CSS\n• 数据库: PostgreSQL + Drizzle ORM\n• 移动端: React Native\n• 桌面端: Electron 40", {
      x: 0.5,
      y: 2.9,
      w: "90%",
      h: 1.8,
      fontSize: 14,
      color: textColor,
      lineSpacing: 24,
    });
    
    slide.addText("系统特色", {
      x: 0.5,
      y: 4.3,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 响应式设计，支持多端访问\n• 实时数据同步\n• 完善的权限管理\n• 数据可视化看板\n• 支持远程数据库配置", {
      x: 0.5,
      y: 4.8,
      w: "90%",
      h: 1.2,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });

    // ========== 2. 系统登录 ==========
    slide = pptx.addSlide();
    slide.addText("2. 系统登录", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("登录方式", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("1. 打开系统网址或启动桌面应用\n2. 输入用户名和密码\n3. 点击\"登录\"按钮", {
      x: 0.5,
      y: 1.5,
      w: "90%",
      h: 1,
      fontSize: 14,
      color: textColor,
      lineSpacing: 24,
    });
    
    slide.addText("首次登录建议", {
      x: 0.5,
      y: 2.6,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 修改默认密码\n• 完善个人信息\n• 熟悉系统功能模块", {
      x: 0.5,
      y: 3.1,
      w: "90%",
      h: 1,
      fontSize: 14,
      color: textColor,
      lineSpacing: 24,
    });
    
    slide.addText("密码找回", {
      x: 0.5,
      y: 4.2,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("如忘记密码，请联系系统管理员重置密码。", {
      x: 0.5,
      y: 4.7,
      w: "90%",
      h: 0.5,
      fontSize: 14,
      color: textColor,
    });

    // ========== 3. 功能模块介绍 ==========
    // 3.1 项目看板
    slide = pptx.addSlide();
    slide.addText("3. 功能模块介绍", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("3.1 项目看板", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("项目看板是系统的首页，展示项目统计信息和状态概览。", {
      x: 0.5,
      y: 1.5,
      w: "90%",
      h: 0.5,
      fontSize: 14,
      color: textColor,
    });
    
    slide.addText("主要功能:", {
      x: 0.5,
      y: 2.1,
      w: "90%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 项目数量统计\n• 任务数量统计\n• 合同金额汇总\n• 订单金额汇总\n• 项目状态分布图\n• 最近项目列表", {
      x: 0.5,
      y: 2.5,
      w: "90%",
      h: 2,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });

    // 3.2 项目管理
    slide = pptx.addSlide();
    slide.addText("3. 功能模块介绍", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("3.2 项目列表与详情", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("项目列表功能:", {
      x: 0.5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 项目列表展示\n• 项目搜索和筛选\n• 创建新项目\n• 编辑项目信息\n• 删除项目\n• 导入导出数据", {
      x: 0.5,
      y: 1.9,
      w: "45%",
      h: 2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("项目详情功能:", {
      x: 5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 项目基本信息\n• 项目成员管理\n• 任务列表\n• 甘特图视图\n• 项目附件管理", {
      x: 5,
      y: 1.9,
      w: "45%",
      h: 1.6,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // 3.3 任务管理
    slide = pptx.addSlide();
    slide.addText("3. 功能模块介绍", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("3.3 任务管理", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("任务状态:", {
      x: 0.5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 待办 (todo): 任务尚未开始\n• 进行中 (in_progress): 正在进行\n• 已完成 (completed): 已完成", {
      x: 0.5,
      y: 1.9,
      w: "45%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("任务优先级:", {
      x: 5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 低 (low): 普通优先级\n• 中 (medium): 较高优先级\n• 高 (high): 最高优先级", {
      x: 5,
      y: 1.9,
      w: "45%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("主要功能:", {
      x: 0.5,
      y: 3.3,
      w: "90%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 任务列表展示与筛选\n• 创建、编辑、删除任务\n• 任务状态更新\n• 任务分配与进度跟踪", {
      x: 0.5,
      y: 3.7,
      w: "90%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // 3.4 合同/订单管理
    slide = pptx.addSlide();
    slide.addText("3. 功能模块介绍", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("3.4 合同与订单管理", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("合同管理:", {
      x: 0.5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 合同编号与名称\n• 合同日期与金额\n• 客户信息关联\n• 技术与采购负责人\n• 合同附件上传", {
      x: 0.5,
      y: 1.9,
      w: "45%",
      h: 1.6,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("订单管理:", {
      x: 5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 订单编号与项目关联\n• 订单日期与交付日期\n• 数量与合同时信息\n• 付款进度跟踪\n• 预付款/到货款/验收款/质保金", {
      x: 5,
      y: 1.9,
      w: "45%",
      h: 1.6,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // 3.5 客户/产品管理
    slide = pptx.addSlide();
    slide.addText("3. 功能模块介绍", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("3.5 客户与产品管理", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("客户管理:", {
      x: 0.5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 客户编号与名称\n• 联系电话与地址\n• 客户类型（终端/代理商）\n• 状态管理", {
      x: 0.5,
      y: 1.9,
      w: "45%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("产品管理:", {
      x: 5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 物料编码与产品名称\n• 规格型号与描述\n• 产品图片上传\n• 产品大类与版本号", {
      x: 5,
      y: 1.9,
      w: "45%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // 3.6 其他功能
    slide = pptx.addSlide();
    slide.addText("3. 功能模块介绍", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("3.6 消息中心与知识库", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 22,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("消息中心:", {
      x: 0.5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 消息列表展示\n• 消息阅读与删除\n• 知识库文档下载\n• 系统通告查看", {
      x: 0.5,
      y: 1.9,
      w: "45%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("知识库管理:", {
      x: 5,
      y: 1.5,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 文档上传与管理\n• 文档分类\n• 支持多种格式\n  (PDF/Word/Excel等)", {
      x: 5,
      y: 1.9,
      w: "45%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("智能助手:", {
      x: 0.5,
      y: 3.3,
      w: "90%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• AI智能助手\"非凡小助手\"\n• 系统功能咨询\n• 操作指引\n• 问题解答", {
      x: 0.5,
      y: 3.7,
      w: "90%",
      h: 1.2,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // ========== 4. 权限管理 ==========
    slide = pptx.addSlide();
    slide.addText("4. 权限管理", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("用户角色", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    // 创建角色表格
    const roleData = [
      [{ text: "角色", options: { bold: true, fill: { color: themeColor }, color: "FFFFFF" } }, 
       { text: "权限说明", options: { bold: true, fill: { color: themeColor }, color: "FFFFFF" } }],
      [{ text: "系统管理员" }, { text: "所有权限，包括后台管理、数据库配置等" }],
      [{ text: "部门经理" }, { text: "较高权限，可审核用户" }],
      [{ text: "项目经理" }, { text: "管理项目和任务，可审批项目申请" }],
      [{ text: "专业工程师" }, { text: "负责各自专业领域任务" }],
      [{ text: "项目成员" }, { text: "基础查看和编辑权限" }],
    ];
    
    slide.addTable(roleData, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 2.5,
      fontSize: 12,
      color: textColor,
      border: { color: "CCCCCC", pt: 1 },
      colW: [2.5, 6.5],
    });
    
    slide.addText("权限分配操作:", {
      x: 0.5,
      y: 4.2,
      w: "90%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("1. 进入后台管理 > 权限管理\n2. 选择用户\n3. 勾选需要分配的权限\n4. 点击\"保存\"", {
      x: 0.5,
      y: 4.6,
      w: "90%",
      h: 1,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // ========== 5. 后台管理 ==========
    slide = pptx.addSlide();
    slide.addText("5. 后台管理", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("进入方式", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 权限要求：仅系统管理员可访问\n• 操作：点击右上角用户头像 > 选择\"后台管理\"", {
      x: 0.5,
      y: 1.5,
      w: "90%",
      h: 0.7,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });
    
    slide.addText("主要功能", {
      x: 0.5,
      y: 2.3,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("用户管理:", {
      x: 0.5,
      y: 2.8,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 用户列表与创建\n• 编辑与删除用户\n• 重置密码\n• 用户审核", {
      x: 0.5,
      y: 3.2,
      w: "45%",
      h: 1,
      fontSize: 13,
      color: textColor,
      lineSpacing: 18,
    });
    
    slide.addText("角色与系统设置:", {
      x: 5,
      y: 2.8,
      w: "45%",
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: textColor,
    });
    
    slide.addText("• 角色管理\n• 权限配置\n• 系统参数设置\n• 主题与Logo配置", {
      x: 5,
      y: 3.2,
      w: "45%",
      h: 1,
      fontSize: 13,
      color: textColor,
      lineSpacing: 18,
    });

    // ========== 6. 移动端APP ==========
    slide = pptx.addSlide();
    slide.addText("6. 移动端APP", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("APP简介", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("系统提供React Native移动端APP，支持iOS和Android平台。", {
      x: 0.5,
      y: 1.5,
      w: "90%",
      h: 0.5,
      fontSize: 14,
      color: textColor,
    });
    
    slide.addText("主要功能", {
      x: 0.5,
      y: 2.1,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 项目查看\n• 任务管理\n• 消息通知\n• 数据同步", {
      x: 0.5,
      y: 2.5,
      w: "90%",
      h: 1,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });
    
    slide.addText("使用方法", {
      x: 0.5,
      y: 3.6,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("1. 下载并安装APP\n2. 输入服务器地址\n3. 使用账号密码登录\n4. 开始使用移动端功能", {
      x: 0.5,
      y: 4.0,
      w: "90%",
      h: 1.2,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });

    // ========== 7. 数据导入导出 ==========
    slide = pptx.addSlide();
    slide.addText("7. 数据导入导出", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("支持的数据类型", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 项目数据\n• 订单数据\n• 合同数据\n• 客户数据\n• 产品数据", {
      x: 0.5,
      y: 1.5,
      w: "45%",
      h: 1.5,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });
    
    slide.addText("导入操作步骤", {
      x: 5,
      y: 1.0,
      w: "45%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("1. 进入对应模块\n2. 点击\"导入\"按钮\n3. 下载导入模板\n4. 按模板填写数据\n5. 选择文件确认导入", {
      x: 5,
      y: 1.5,
      w: "45%",
      h: 1.5,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("注意事项", {
      x: 0.5,
      y: 3.2,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("• 请使用下载的模板格式\n• 必填字段不能为空\n• 日期格式：YYYY-MM-DD\n• 状态值需使用指定值（如active、completed等）", {
      x: 0.5,
      y: 3.6,
      w: "90%",
      h: 1.2,
      fontSize: 14,
      color: textColor,
      lineSpacing: 22,
    });

    // ========== 8. 数据库配置 ==========
    slide = pptx.addSlide();
    slide.addText("8. 数据库配置", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("功能说明", {
      x: 0.5,
      y: 1.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("配置远程数据库连接，实现多台电脑之间的数据同步。", {
      x: 0.5,
      y: 1.5,
      w: "90%",
      h: 0.5,
      fontSize: 14,
      color: textColor,
    });
    
    slide.addText("使用场景", {
      x: 0.5,
      y: 2.1,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("场景一：远程共享数据库（自动同步）\n• 配置远程数据库连接\n• 所有电脑连接同一远程数据库\n• 数据实时自动同步", {
      x: 0.5,
      y: 2.5,
      w: "45%",
      h: 1.3,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("场景二：设置导出/导入（手动同步）\n• 在一台电脑上配置并导出\n• 在其他电脑上导入配置\n• 手动同步配置信息", {
      x: 5,
      y: 2.5,
      w: "45%",
      h: 1.3,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });
    
    slide.addText("配置步骤", {
      x: 0.5,
      y: 4.0,
      w: "90%",
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("1. 后台管理 > 数据库配置 > 新建配置\n2. 填写连接信息（主机、端口、数据库、用户名、密码）\n3. 测试连接 > 保存 > 应用配置", {
      x: 0.5,
      y: 4.4,
      w: "90%",
      h: 0.9,
      fontSize: 13,
      color: textColor,
      lineSpacing: 20,
    });

    // ========== 9. 常见问题 ==========
    slide = pptx.addSlide();
    slide.addText("9. 常见问题", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: themeColor,
    });
    
    slide.addText("登录问题", {
      x: 0.5,
      y: 1.0,
      w: "45%",
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("Q: 忘记密码怎么办？\nA: 联系系统管理员重置\n\nQ: 登录后页面空白？\nA: 清除浏览器缓存后重试", {
      x: 0.5,
      y: 1.4,
      w: "45%",
      h: 1.5,
      fontSize: 12,
      color: textColor,
      lineSpacing: 18,
    });
    
    slide.addText("权限问题", {
      x: 5,
      y: 1.0,
      w: "45%",
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("Q: 为什么看不到某些功能？\nA: 角色可能没有相应权限\n\nQ: 如何获取管理员权限？\nA: 需由现有管理员分配", {
      x: 5,
      y: 1.4,
      w: "45%",
      h: 1.5,
      fontSize: 12,
      color: textColor,
      lineSpacing: 18,
    });
    
    slide.addText("数据问题", {
      x: 0.5,
      y: 3.0,
      w: "45%",
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("Q: 数据导入失败？\nA: 检查文件格式、必填字段、数据格式\n\nQ: 如何同步多台电脑数据？\nA: 使用数据库配置连接远程数据库", {
      x: 0.5,
      y: 3.4,
      w: "45%",
      h: 1.5,
      fontSize: 12,
      color: textColor,
      lineSpacing: 18,
    });
    
    slide.addText("系统问题", {
      x: 5,
      y: 3.0,
      w: "45%",
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: accentColor,
    });
    
    slide.addText("Q: 页面加载缓慢？\nA: 检查网络、清除缓存\n\nQ: 消息通知不显示？\nA: 检查浏览器通知权限", {
      x: 5,
      y: 3.4,
      w: "45%",
      h: 1.5,
      fontSize: 12,
      color: textColor,
      lineSpacing: 18,
    });

    // ========== 结束页 ==========
    slide = pptx.addSlide();
    slide.background = { color: themeColor };
    
    slide.addText("感谢使用", {
      x: 0.5,
      y: 2.0,
      w: "90%",
      h: 0.8,
      fontSize: 44,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });
    
    slide.addText("非凡项目管理系统", {
      x: 0.5,
      y: 2.9,
      w: "90%",
      h: 0.6,
      fontSize: 28,
      color: "FFFFFF",
      align: "center",
    });
    
    slide.addText("如有任何问题，请联系系统管理员或技术支持团队", {
      x: 0.5,
      y: 4.0,
      w: "90%",
      h: 0.5,
      fontSize: 14,
      color: "FFFFFF",
      align: "center",
    });

    // 生成PPT文件
    const pptBuffer = await pptx.write({ outputType: "nodebuffer" });
    
    // 返回PPT文件
    return new NextResponse(Buffer.from(pptBuffer as ArrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": "attachment; filename=system-manual.pptx",
      },
    });
  } catch (error) {
    console.error("生成PPT失败:", error);
    return NextResponse.json({ success: false, error: "生成PPT失败" }, { status: 500 });
  }
}
