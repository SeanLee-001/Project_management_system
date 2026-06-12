'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  TaskSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  User,
} from 'lucide-react';

interface TaskStats {
  assigneeId: string;
  assigneeName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  workloadScore: number;
}

export function TaskProfilePage() {
  const [teamStats, setTeamStats] = useState<TaskStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    avgCompletionRate: 0,
    workloadBalance: 0,
  });

  useEffect(() => {
    fetchTaskStats();
  }, []);

  const fetchTaskStats = async () => {
    setLoading(true);
    try {
      const tasksResponse = await fetch('/api/project-tasks');
      const tasksData = await tasksResponse.json();
      
      if (tasksData.success) {
        const tasks = tasksData.data;
        const statsMap: Record<string, TaskStats> = {};
        
        tasks.forEach((task: any) => {
          const assigneeId = task.assigneeId || 'unassigned';
          
          if (!statsMap[assigneeId]) {
            statsMap[assigneeId] = {
              assigneeId,
              assigneeName: task.assigneeName || '未分配',
              totalTasks: 0,
              completedTasks: 0,
              inProgressTasks: 0,
              pendingTasks: 0,
              overdueTasks: 0,
              completionRate: 0,
              workloadScore: 0,
            };
          }
          
          const stat = statsMap[assigneeId];
          stat.totalTasks++;
          
          if (task.status === 'completed') stat.completedTasks++;
          else if (task.status === 'in_progress') stat.inProgressTasks++;
          else if (task.status === 'pending') stat.pendingTasks++;
          
          if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed') {
            stat.overdueTasks++;
          }
        });
        
        const statsArray = Object.values(statsMap).map(stat => {
          stat.completionRate = stat.totalTasks > 0 
            ? Math.round((stat.completedTasks / stat.totalTasks) * 100) 
            : 0;
          stat.workloadScore = Math.round(
            stat.totalTasks * 0.4 + 
            stat.inProgressTasks * 0.3 + 
            stat.overdueTasks * 0.3
          );
          return stat;
        });
        
        statsArray.sort((a, b) => b.workloadScore - a.workloadScore);
        setTeamStats(statsArray);
        
        const totalTasksSum = statsArray.reduce((sum, s) => sum + s.totalTasks, 0);
        const completedTasksSum = statsArray.reduce((sum, s) => sum + s.completedTasks, 0);
        const inProgressTasksSum = statsArray.reduce((sum, s) => sum + s.inProgressTasks, 0);
        const pendingTasksSum = statsArray.reduce((sum, s) => sum + s.pendingTasks, 0);
        const overdueTasksSum = statsArray.reduce((sum, s) => sum + s.overdueTasks, 0);
        
        setOverallStats({
          totalTasks: totalTasksSum,
          completedTasks: completedTasksSum,
          inProgressTasks: inProgressTasksSum,
          pendingTasks: pendingTasksSum,
          overdueTasks: overdueTasksSum,
          avgCompletionRate: statsArray.length > 0
            ? Math.round(statsArray.reduce((sum, s) => sum + s.completionRate, 0) / statsArray.length)
            : 0,
          workloadBalance: calculateWorkloadBalance(statsArray),
        });
      }
    } catch (error) {
      console.error('Failed to fetch task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkloadBalance = (stats: TaskStats[]) => {
    if (stats.length === 0) return 100;
    const taskCounts = stats.map(s => s.totalTasks);
    const avg = taskCounts.reduce((sum, count) => sum + count, 0) / taskCounts.length;
    const variance = taskCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / taskCounts.length;
    const stdDev = Math.sqrt(variance);
    const balance = Math.max(0, Math.min(100, 100 - (stdDev / avg) * 50));
    return Math.round(balance);
  };

  const getWorkloadLevel = (score: number) => {
    if (score >= 8) return { label: '过载', color: 'text-red-600', bg: 'bg-red-100' };
    if (score >= 5) return { label: '适中', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: '空闲', color: 'text-blue-600', bg: 'bg-blue-100' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">任务管理画像</h1>
        <span className="px-3 py-1 border rounded text-sm">
          最后更新：{new Date().toLocaleString('zh-CN')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">总任务数</p>
              <p className="text-3xl font-bold">{overallStats.totalTasks}</p>
            </div>
            <TaskSquare className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        
        <div className="border rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">完成率</p>
              <p className="text-3xl font-bold text-green-600">{overallStats.avgCompletionRate}%</p>
              <div className="flex items-center mt-2">
                {overallStats.avgCompletionRate >= 80 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className="text-xs text-gray-500">平均</span>
              </div>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${overallStats.avgCompletionRate}%` }} />
          </div>
        </div>
        
        <div className="border rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">逾期任务</p>
              <p className="text-3xl font-bold text-red-600">{overallStats.overdueTasks}</p>
              <div className="flex items-center mt-2">
                <Clock className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-xs text-gray-500">需关注</span>
              </div>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>
        
        <div className="border rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">负载平衡度</p>
              <p className="text-3xl font-bold">{overallStats.workloadBalance}%</p>
              <div className="flex items-center mt-2">
                <Users className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-xs text-gray-500">
                  {overallStats.workloadBalance >= 80 ? '均衡' : '不均衡'}
                </span>
              </div>
            </div>
            <Users className="w-10 h-10 text-purple-500" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${overallStats.workloadBalance}%` }} />
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-white">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">团队成员任务分布</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">成员</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">负载状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">总任务</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">进行中</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">已完成</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">待处理</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">逾期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">完成率</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">负载分数</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">暂无任务数据</td>
                </tr>
              )}
              {teamStats.map((stat) => {
                const workloadLevel = getWorkloadLevel(stat.workloadScore);
                return (
                  <tr key={stat.assigneeId} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">{stat.assigneeName}</div>
                          <div className="text-xs text-gray-500">{stat.assigneeId === 'unassigned' ? '未分配' : '成员'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${workloadLevel.bg} ${workloadLevel.color}`}>
                        {workloadLevel.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{stat.totalTasks}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('in_progress')}`} />
                        {stat.inProgressTasks}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('completed')}`} />
                        {stat.completedTasks}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('pending')}`} />
                        {stat.pendingTasks}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {stat.overdueTasks > 0 ? (
                        <span className="text-red-600 font-semibold">{stat.overdueTasks}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stat.completionRate}%` }} />
                        </div>
                        <span className="text-sm font-medium">{stat.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 border rounded text-xs">{stat.workloadScore}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg bg-white">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">任务状态分布</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">已完成</span>
                <span className="text-sm font-medium">{overallStats.completedTasks} / {overallStats.totalTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: `${(overallStats.completedTasks / overallStats.totalTasks) * 100 || 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">进行中</span>
                <span className="text-sm font-medium">{overallStats.inProgressTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${(overallStats.inProgressTasks / overallStats.totalTasks) * 100 || 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">待处理</span>
                <span className="text-sm font-medium">{overallStats.pendingTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gray-500 h-3 rounded-full" style={{ width: `${(overallStats.pendingTasks / overallStats.totalTasks) * 100 || 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-red-600">逾期</span>
                <span className="text-sm font-medium text-red-600">{overallStats.overdueTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-red-500 h-3 rounded-full" style={{ width: `${(overallStats.overdueTasks / overallStats.totalTasks) * 100 || 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg bg-white">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Workload 分析</h2>
          </div>
          <div className="p-6 space-y-4">
            {teamStats.slice(0, 5).map((stat, index) => (
              <div key={stat.assigneeId}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {index + 1}. {stat.assigneeName}
                  </span>
                  <span className="text-sm text-gray-500">
                    {stat.totalTasks}个任务 ({stat.completionRate}%完成)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stat.workloadScore / 10) * 100}%` }} />
                  </div>
                  <span className="px-2 py-1 border rounded text-xs w-12 text-center">{stat.workloadScore}</span>
                </div>
              </div>
            ))}
            {teamStats.length === 0 && (
              <div className="text-center text-gray-500 py-10">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskProfilePage;
