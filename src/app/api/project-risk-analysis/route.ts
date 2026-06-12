import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/storage/database';
import { projects } from '@/storage/database/shared/schema';
import { projectTasks } from '@/storage/database/shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * 项目风险智能分析
 * 分析项目延期、任务分配不平衡等风险，并提供建议
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    // 获取所有项目或指定项目
    const allProjects = await db.select().from(projects);
    const projectList = projectId 
      ? allProjects.filter(p => p.id === projectId)
      : allProjects;

    const riskAnalysis = await Promise.all(
      projectList.map(async (project) => {
        const risks = [];
        const recommendations = [];

        // 1. 项目延期风险分析
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

            // 根据延期天数提供建议
            if (daysOverdue > 14) {
              recommendations.push({
                type: 'schedule_adjustment',
                priority: 'high',
                title: '紧急调整项目计划',
                content: '项目严重延期，建议立即召开项目评审会议，重新评估剩余工作量，调整项目里程碑和交付时间。考虑增加资源投入或缩减项目范围。',
              });
            } else if (daysOverdue > 7) {
              recommendations.push({
                type: 'resource_allocation',
                priority: 'medium',
                title: '增加资源投入',
                content: '项目延期超过一周，建议增加人力或设备资源，优先处理关键路径上的任务，确保核心功能按时交付。',
              });
            } else {
              recommendations.push({
                type: 'task_optimization',
                priority: 'low',
                title: '优化任务执行',
                content: '项目轻微延期，建议优化任务执行流程，加强每日站会沟通，及时解决阻塞问题。',
              });
            }
          }
        }

        // 2. 即将到期预警（7 天内）
        if (project.endDate) {
          const daysUntilEnd = Math.floor(
            (new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysUntilEnd >= 0 && daysUntilEnd <= 7 && project.status === 'active') {
            risks.push({
              type: 'schedule_warning',
              level: 'medium',
              description: `项目将在 ${daysUntilEnd} 天后到期`,
              endDate: project.endDate,
            });

            recommendations.push({
              type: 'deadline_reminder',
              priority: 'medium',
              title: '项目即将到期',
              content: `项目距离截止日期仅剩${daysUntilEnd}天，建议加快进度，优先完成核心功能，确保按时交付。`,
            });
          }
        }

        // 3. 任务分配不平衡分析
        const tasks = await db
          .select()
          .from(projectTasks)
          .where(eq(projectTasks.projectId, project.id));

        if (tasks.length > 0) {
          // 按负责人统计任务数量
          const taskDistribution: Record<string, number> = {};
          tasks.forEach((task) => {
            const assignee = task.assigneeId || '未分配';
            taskDistribution[assignee] = (taskDistribution[assignee] || 0) + 1;
          });

          const taskCounts = Object.values(taskDistribution);
          const avgTasks = taskCounts.length > 0 
            ? taskCounts.reduce((sum, count) => sum + count, 0) / taskCounts.length 
            : 0;
          const maxTasks = Math.max(...taskCounts, 0);
          const minTasks = Math.min(...taskCounts, 0);

          // 任务分配不平衡判断：最大值超过平均值 2 倍或最小值为 0
          if (maxTasks > avgTasks * 2 && taskCounts.length > 1) {
            const overloadedPerson = Object.entries(taskDistribution)
              .find(([_, count]) => count === maxTasks);

            risks.push({
              type: 'task_imbalance',
              level: 'medium',
              description: '任务分配严重不均衡',
              details: {
                overloadedPerson: overloadedPerson?.[0] || '未知',
                maxTasks,
                avgTasks: Math.round(avgTasks),
                minTasks,
              },
            });

            recommendations.push({
              type: 'task_reassignment',
              priority: 'medium',
              title: '重新分配任务',
              content: `当前任务分配不均衡，${overloadedPerson?.[0] || '某成员'}承担了${maxTasks}个任务，远高于平均值${Math.round(avgTasks)}个。建议将部分任务重新分配给任务较少的成员，平衡工作负载。`,
            });
          }

          // 有人任务为 0
          if (minTasks === 0 && taskCounts.length > 1) {
            const idlePeople = Object.entries(taskDistribution)
              .filter(([_, count]) => count === 0)
              .map(([id]) => id);

            risks.push({
              type: 'resource_idle',
              level: 'low',
              description: '部分成员无任务分配',
              details: {
                idleCount: idlePeople.length,
              },
            });

            recommendations.push({
              type: 'task_assignment',
              priority: 'low',
              title: '分配任务给空闲成员',
              content: `有${idlePeople.length}名成员目前没有分配任务。建议从任务较多的成员那里分配部分任务，或安排其他相关工作。`,
            });
          }
        }

        // 4. 项目长期未更新预警
        if (project.updatedAt) {
          const daysSinceUpdate = Math.floor(
            (new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceUpdate > 14 && project.status === 'active') {
            risks.push({
              type: 'stale_project',
              level: 'medium',
              description: `项目已超过 ${daysSinceUpdate} 天未更新`,
            });

            recommendations.push({
              type: 'project_review',
              priority: 'medium',
              title: '项目状态审查',
              content: `该项目已超过${daysSinceUpdate}天未更新，可能存在进展停滞风险。建议联系项目负责人了解最新进展，确认项目是否正常推进。`,
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
          highRiskCount: risks.filter(r => r.level === 'high').length,
        };
      })
    );

    // 汇总统计
    const summary = {
      totalProjects: projectList.length,
      projectsWithRisks: riskAnalysis.filter(r => r.riskCount > 0).length,
      totalRisks: riskAnalysis.reduce((sum, r) => sum + r.riskCount, 0),
      highRisks: riskAnalysis.reduce((sum, r) => sum + r.highRiskCount, 0),
      riskTypes: {
        schedule_overdue: riskAnalysis.reduce(
          (sum, r) => sum + r.risks.filter(risk => risk.type === 'schedule_overdue').length, 
          0
        ),
        task_imbalance: riskAnalysis.reduce(
          (sum, r) => sum + r.risks.filter(risk => risk.type === 'task_imbalance').length, 
          0
        ),
        resource_idle: riskAnalysis.reduce(
          (sum, r) => sum + r.risks.filter(risk => risk.type === 'resource_idle').length, 
          0
        ),
        stale_project: riskAnalysis.reduce(
          (sum, r) => sum + r.risks.filter(risk => risk.type === 'stale_project').length, 
          0
        ),
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        analyses: riskAnalysis.filter(r => r.riskCount > 0), // 只返回有风险的 proj
      },
    });
  } catch (error: any) {
    console.error('Error analyzing project risks:', error);
    return NextResponse.json(
      { success: false, error: error.message || '风险分析失败' },
      { status: 500 }
    );
  }
}
