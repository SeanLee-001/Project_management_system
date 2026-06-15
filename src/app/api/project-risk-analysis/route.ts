import { NextRequest, NextResponse } from 'next/server';
import { projectManager, taskManager } from '@/storage/database';

// 缓存配置
let analysisCache: { data: any; timestamp: Date | null } = {
  data: null,
  timestamp: null,
};

// 定时执行时间点 (早上 8:00, 中午 13:00, 晚上 22:00)
const SCHEDULE_HOURS = [8, 13, 22];

// 淘汰行业/产品关键词库 (模拟)
const OBSOLETE_KEYWORDS = [
  "胶卷", "胶片", "CRT", "显像管", "软盘", "软驱", "BP机", "寻呼机",
  "VCD", "DVD", "MP3", "MP4", "有线电话", "非智能机", "BB机", "大哥大"
];

/**
 * 判断是否需要执行分析（基于定时刷新或强制刷新）
 */
function shouldRunAnalysis(force: boolean): boolean {
  if (force) return true;
  if (!analysisCache.timestamp) return true;

  const now = new Date();
  const lastRun = analysisCache.timestamp;
  const currentHour = now.getHours();

  // 检查当前时间是否在调度时间点内
  if (SCHEDULE_HOURS.includes(currentHour)) {
    // 检查当前小时的调度窗口是否已经执行过
    // 只要 lastRun 时间在 "当前小时:00:00" 之前，就需要刷新
    const startOfCurrentSlot = new Date(now);
    startOfCurrentSlot.setMinutes(0, 0, 0);
    if (lastRun < startOfCurrentSlot) {
      return true;
    }
  }
  
  // 兜底逻辑：如果缓存超过 24 小时，强制刷新一次
  if (now.getTime() - lastRun.getTime() > 24 * 60 * 60 * 1000) {
    return true;
  }

  return false;
}

/**
 * 获取下一个调度时间点的文字描述
 */
function getNextScheduleTime(): string {
  const now = new Date();
  const currentHour = now.getHours();

  // 寻找下一个调度小时
  const nextHour = SCHEDULE_HOURS.find(h => h > currentHour);
  
  let nextTime: Date;
  if (nextHour !== undefined) {
    nextTime = new Date(now);
    nextTime.setHours(nextHour, 0, 0, 0);
  } else {
    // 如果是今天最后一个调度之后，则是明天的 8:00
    nextTime = new Date(now);
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(8, 0, 0, 0);
  }

  return nextTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 模拟外部智能分析算法
 */
async function runAnalysis(): Promise<any> {
  const allProjects = await projectManager.getProjects({});
  const tasks = await taskManager.getTasks({});

  const analyses = await Promise.all(
    allProjects.map(async (project) => {
      const risks: any[] = [];
      const recommendations: any[] = [];

      // --- 1. 智能算法：行业淘汰预警 ---
      // 检查项目/产品描述是否包含淘汰关键词
      const projectContent = `${project.name} ${project.description} ${project.productName || ''} ${project.specification || ''}`.toLowerCase();
      let isObsolete = false;
      foundObsolete:
      for (const keyword of OBSOLETE_KEYWORDS) {
        if (projectContent.includes(keyword)) {
          risks.push({
            type: 'obsolete_project',
            level: 'high',
            description: `行业预警：涉及可能被淘汰的技术或设备（关键词匹配：${keyword}）`,
            details: { keyword },
          });
          recommendations.push({
            type: 'obsolete_warning',
            priority: 'high',
            title: '技术淘汰风险提示',
            content: '检测到该项目涉及行业内即将淘汰的设备/技术。实施需极其谨慎，建议进行技术替代评估，避免资产快速贬值。',
          });
          isObsolete = true;
          break;
        }
      }

      // 如果未通过关键词命中，为了演示效果，随机模拟一条淘汰风险 (10% 概率)
      // 注意：实际部署时应移除随机逻辑
      if (!isObsolete && project.status === 'active' && Math.random() < 0.1) {
        risks.push({
            type: 'obsolete_project',
            level: 'medium',
            description: '外部情报：该产品所属细分行业产能过剩，面临淘汰风险',
            details: { source: '行业分析报告' },
          });
          recommendations.push({
            type: 'obsolete_warning',
            priority: 'medium',
            title: '行业产能过剩预警',
            content: '外部报告显示该类产品市场竞争激烈，有被淘汰风险。建议控制投入规模。',
          });
      }

      // --- 2. 智能算法：客户财务风险分析 ---
      // 模拟调用外部 API (如企查查/天眼查/财报系统)
      const customerName = project.customerName || '未知客户';

      // 逻辑 A: 关键词匹配
      if (customerName.includes('破产') || customerName.includes('违约') || customerName.includes('负债')) {
        risks.push({
          type: 'financial_risk',
          level: 'high',
          description: `公共信用报告显示：客户 "${customerName}" 存在财务违约记录`,
          details: { customer: customerName },
        });
        recommendations.push({
          type: 'financial_check',
          priority: 'high',
          title: '客户资信风险警告',
          content: `该客户在公共信用系统中存在不良记录。与之交易存在回款风险，建议要求预付全款或提供担保，交易须极其谨慎。`,
        });
      } 
      // 逻辑 B: 模拟高风险客户 (为了演示，随机触发 15%)
      else if (project.status === 'active' && Math.random() < 0.15) {
        risks.push({
          type: 'financial_risk',
          level: 'medium',
          description: `证监会/财务报告警示：客户 "${customerName}" 近期财务状况恶化 (模拟数据)`,
          details: { customer: customerName, source: '公开财报' },
        });
        recommendations.push({
          type: 'financial_check',
          priority: 'high',
          title: '客户财务恶化预警',
          content: `根据公开查询的财务报告，该客户近期债务比率上升，现金流紧张。建议暂停新授信，加速催收应收账款。`,
        });
      }

      // --- 3. 原有逻辑：任务与延期分析 ---
      // 项目延期
      if (project.endDate && new Date(project.endDate) < new Date()) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(project.endDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysOverdue > 0) {
          risks.push({
            type: 'schedule_overdue',
            level: daysOverdue > 7 ? 'high' : 'medium',
            description: `项目已延期 ${daysOverdue} 天`,
            endDate: project.endDate,
          });
          recommendations.push({
            type: 'schedule_adjustment',
            priority: 'high',
            title: '紧急调整项目计划',
            content: '项目严重延期，建议立即召开评审会议。',
          });
        }
      }

      // 任务分配检查 (统计该项目相关的任务)
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      if (projectTasks.length > 0) {
        const assigneeCounts: Record<string, number> = {};
        projectTasks.forEach(t => {
           const who = t.assignee || '未分配';
           assigneeCounts[who] = (assigneeCounts[who] || 0) + 1;
        });
        
        const counts = Object.values(assigneeCounts);
        const max = Math.max(...counts);
        const avg = counts.reduce((a,b)=>a+b,0) / counts.length;
        const overloadedPerson = Object.keys(assigneeCounts).find(k => assigneeCounts[k] === max) || '';
        
        // 当有成员任务数显著高于平均值时报警
        if (assigneeCounts[overloadedPerson] >= 3 && max > avg * 1.5) {
           risks.push({
             type: 'task_imbalance',
             level: max > avg * 2.5 ? 'high' : 'medium',
             description: `${overloadedPerson} 承担了 ${assigneeCounts[overloadedPerson]} 个任务，远超平均值 ${avg.toFixed(0)} 个`,
             details: {
               overloadedPerson,
               maxTasks: assigneeCounts[overloadedPerson],
               avgTasks: +avg.toFixed(0),
             },
           });
           recommendations.push({
             type: 'task_reassignment',
             priority: max > avg * 2 ? 'high' : 'medium',
             title: '优化项目内部任务分配',
             content: `${overloadedPerson} 承担了该项目绝大多数任务，人员任务分配不均衡，可能导致项目延期。建议重新分配任务，确保各成员负载均匀。`,
           });
        }
      }

      return {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        status: project.status,
        risks,
        recommendations,
        riskCount: risks.length,
        highRiskCount: risks.filter((r: any) => r.level === 'high').length,
      };
    })
  );

  const summary = {
    totalProjects: allProjects.length,
    projectsWithRisks: analyses.filter((a: any) => a.riskCount > 0).length,
    totalRisks: analyses.reduce((sum: number, a: any) => sum + a.riskCount, 0),
    highRisks: analyses.reduce((sum: number, a: any) => sum + a.highRiskCount, 0),
    riskTypes: {
      schedule_overdue: analyses.reduce((sum: number, a: any) => sum + a.risks.filter((r: any) => r.type === 'schedule_overdue').length, 0),
      financial_risk: analyses.reduce((sum: number, a: any) => sum + a.risks.filter((r: any) => r.type === 'financial_risk').length, 0),
      obsolete_project: analyses.reduce((sum: number, a: any) => sum + a.risks.filter((r: any) => r.type === 'obsolete_project').length, 0),
      task_imbalance: analyses.reduce((sum: number, a: any) => sum + a.risks.filter((r: any) => r.type === 'task_imbalance').length, 0),
    }
  };

  return {
    summary,
    analyses: analyses.filter((a: any) => a.riskCount > 0),
    lastAnalyzedAt: new Date().toISOString(),
    nextScheduleTime: getNextScheduleTime(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    let result;
    if (shouldRunAnalysis(force)) {
      // 执行分析
      console.log('[Risk Analysis] 开始执行智能分析...');
      result = await runAnalysis();
      // 更新缓存
      analysisCache.data = result;
      analysisCache.timestamp = new Date();
    } else {
      // 返回缓存
      console.log('[Risk Analysis] 使用缓存数据');
      // 补充动态时间信息
      result = {
        ...analysisCache.data,
        nextScheduleTime: getNextScheduleTime(),
      };
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error in risk analysis:', error);
    return NextResponse.json(
      { success: false, error: error.message || '智能分析服务异常' },
      { status: 500 }
    );
  }
}
