import { NextResponse } from 'next/server';
import { projectManager, taskManager, userManager } from '@/storage/database';
import { logger } from '@/lib/logger';

const MODULE = 'generate-test-tasks';

// 根据角色生成对应的任务模板
const ROLE_TASK_TEMPLATES: Record<string, string[]> = {
  '项目经理': [
    '项目启动会议组织',
    '项目计划编制与评审',
    '项目进度跟踪与汇报',
    '客户沟通与需求确认',
    '项目风险评估与应对',
  ],
  '项目管理': [
    '项目文档整理与归档',
    '会议记录与纪要分发',
    '项目里程碑跟踪',
    '跨部门协调与沟通',
    '项目资源调配申请',
  ],
  '机械工程师': [
    '机械结构方案设计',
    '三维建模与装配设计',
    '工程图纸绘制与审核',
    'BOM 表编制与维护',
    '机械部件选型与计算',
    '设计评审与优化',
  ],
  '电气工程师': [
    '电气控制系统设计',
    '电气原理图绘制',
    'PLC 程序编写与调试',
    '电气柜布局设计',
    '线缆选型与布线图',
    '电气元件选型清单',
  ],
  '视觉工程师': [
    '视觉系统方案设计',
    '相机与镜头选型',
    '视觉算法开发与测试',
    '光源系统设计与调试',
    '视觉检测精度验证',
    '视觉系统联调',
  ],
  '软件工程师': [
    '系统架构设计',
    '数据库设计与搭建',
    '后端 API 开发',
    '前端界面开发',
    '系统集成与测试',
    '用户手册编写',
  ],
  '算法工程师': [
    '算法需求分析与设计',
    '核心算法开发与优化',
    '算法测试与验证',
    '模型训练与调优',
    '算法性能评估报告',
  ],
  '采购': [
    '供应商询价与比价',
    '采购订单编制与下发',
    '物料到货跟踪',
    '采购合同评审',
    '供应商资质审核',
  ],
  '生产计划': [
    '生产计划编制',
    '物料需求计划 (MRP)',
    '生产进度跟踪',
    '产能评估与排产',
    '生产异常处理',
  ],
  '质量': [
    '质量检验标准编制',
    '来料检验 (IQC)',
    '过程检验 (IPQC)',
    '成品检验 (OQC)',
    '质量问题追踪与整改',
    '质量报告编制',
  ],
  '生产': [
    '零部件加工制造',
    '设备组装与调试',
    '生产线搭建',
    '工艺优化与改进',
    '生产记录填写',
  ],
  '现场负责人': [
    '现场施工方案编制',
    '现场安装与调试',
    '现场安全管理',
    '客户现场培训',
    '项目验收组织',
  ],
  '商务': [
    '合同谈判与签订',
    '商务报价编制',
    '客户关系维护',
    '商务条款评审',
    '应收账款跟踪',
  ],
  '安全': [
    '安全风险评估',
    '安全操作规程编制',
    '安全培训组织',
    '现场安全检查',
    '安全隐患整改跟踪',
  ],
};

// 任务状态分布
const TASK_STATUSES = ['todo', 'in_progress', 'completed'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

function getRandomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(daysOffset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

export async function POST() {
  try {
    logger.info(MODULE, '开始生成测试任务数据...');

    // 获取所有用户
    const allUsers = await userManager.getUsers({});
    if (allUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '系统中没有用户，无法生成测试数据',
      }, { status: 400 });
    }

    // 创建用户 ID 到用户对象的映射
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // 获取所有项目
    const allProjects = await projectManager.getProjects({});
    if (allProjects.length === 0) {
      return NextResponse.json({
        success: false,
        error: '系统中没有项目，无法生成测试数据',
      }, { status: 400 });
    }

    const results: Array<{
      projectId: string;
      projectName: string;
      tasksCreated: number;
      assignees: string[];
    }> = [];

    // 为每个项目生成任务
    for (const project of allProjects) {
      const assignees = new Set<string>();
      let tasksCreated = 0;

      // 项目成员角色字段列表
      const memberRoles: Array<{ field: string; role: string }> = [
        { field: 'projectManager', role: '项目经理' },
        { field: 'projectManagement', role: '项目管理' },
        { field: 'mechanicalLead', role: '机械工程师' },
        { field: 'electricalLead', role: '电气工程师' },
        { field: 'visualLead', role: '视觉工程师' },
        { field: 'softwareLead', role: '软件工程师' },
        { field: 'algorithmLead', role: '算法工程师' },
        { field: 'procurement', role: '采购' },
        { field: 'planning', role: '生产计划' },
        { field: 'quality', role: '质量' },
        { field: 'production', role: '生产' },
        { field: 'fieldProjectLead', role: '现场负责人' },
        { field: 'business', role: '商务' },
        { field: 'safety', role: '安全' },
      ];

      // 为每个有值的成员角色生成任务
      for (const { field, role } of memberRoles) {
        const userId = (project as any)[field];
        if (!userId || !userMap.has(userId)) {
          continue;
        }

        const user = userMap.get(userId)!;
        const templates = ROLE_TASK_TEMPLATES[role] || ROLE_TASK_TEMPLATES['项目管理'];

        // 为每个成员生成 2-4 个任务
        const taskCount = Math.floor(Math.random() * 3) + 2;
        const selectedTemplates = templates
          .sort(() => Math.random() - 0.5)
          .slice(0, taskCount);

        for (const title of selectedTemplates) {
          try {
            const status = getRandomItem(TASK_STATUSES);
            const priority = getRandomItem(TASK_PRIORITIES);
            
            // 根据状态设置合理的截止日期
            let dueDate: Date;
            if (status === 'completed') {
              dueDate = getRandomDate(-Math.floor(Math.random() * 30) - 1);
            } else if (status === 'in_progress') {
              dueDate = getRandomDate(Math.floor(Math.random() * 15) + 1);
            } else {
              dueDate = getRandomDate(Math.floor(Math.random() * 30) + 5);
            }

            await taskManager.createTask({
              projectId: project.id,
              title,
              description: `${role} - ${project.name} 相关任务`,
              status,
              priority,
              assignee: user.fullName || user.username,
              assigneeId: user.id,
              dueDate,
            });

            assignees.add(user.fullName || user.username);
            tasksCreated++;
          } catch (error) {
            logger.error(MODULE, `创建任务失败: ${title}, 错误: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      results.push({
        projectId: project.id,
        projectName: project.name,
        tasksCreated,
        assignees: Array.from(assignees),
      });
    }

    const totalTasks = results.reduce((sum, r) => sum + r.tasksCreated, 0);

    logger.info(MODULE, `测试任务生成完成：共 ${totalTasks} 个任务，覆盖 ${results.length} 个项目`);

    return NextResponse.json({
      success: true,
      data: {
        totalTasks,
        totalProjects: results.length,
        projects: results,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '生成测试任务失败';
    logger.error(MODULE, message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
