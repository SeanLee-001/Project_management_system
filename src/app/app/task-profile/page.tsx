'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  TaskSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export function TaskProfilePage() {
  const [teamStats, setTeamStats] = useState<TaskStats[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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
      // 获取所有任务
      const tasksResponse = await fetch('/api/project-tasks');
      const tasksData = await tasksResponse.json();
      
      if (tasksData.success) {
        const tasks = tasksData.data;
        
        // 按负责人统计
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
          
          if (task.status === 'completed') {
            stat.completedTasks++;
          } else if (task.status === 'in_progress') {
            stat.inProgressTasks++;
          } else if (task.status === 'pending') {
            stat.pendingTasks++;
          }
          
          // 检查是否逾期
          if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed') {
            stat.overdueTasks++;
          }
        });
        
        // 计算完成率和负载分数
        const statsArray = Object.values(statsMap).map(stat => {
          stat.completionRate = stat.totalTasks > 0 
            ? Math.round((stat.completedTasks / stat.totalTasks) * 100) 
            : 0;
          
          // 负载分数 = 总任务数 * 0.4 + 进行中任务 * 0.3 + 逾期任务 * 0.3
          stat.workloadScore = Math.round(
            stat.totalTasks * 0.4 + 
            stat.inProgressTasks * 0.3 + 
            stat.overdueTasks * 0.3
          );
          
          return stat;
        });
        
        // 按负载分数排序
        statsArray.sort((a, b) => b.workloadScore - a.workloadScore);
        
        setTeamStats(statsArray);
        
        // 计算整体统计
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
    
    // 标准差越小，负载越平衡
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
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">任务管理画像</h1>
        <Badge variant="outline" className="text-sm">
          最后更新：{new Date().toLocaleString('zh-CN')}
        </Badge>
      </div>

      {/* 整体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">总任务数</p>
                <p className="text-3xl font-bold">{overallStats.totalTasks}</p>
              </div>
              <TaskSquare className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
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
            <Progress value={overallStats.avgCompletionRate} className="mt-4" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
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
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">负载平衡度</p>
                <p className="text-3xl font-bold">
                  {overallStats.workloadBalance}%
                </p>
                <div className="flex items-center mt-2">
                  <Users className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-xs text-gray-500">
                    {overallStats.workloadBalance >= 80 ? '均衡' : '不均衡'}
                  </span>
                </div>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
            <Progress value={overallStats.workloadBalance} className="mt-4" />
          </CardContent>
        </Card>
      </div>

      {/* 团队成员任务分布 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">团队成员任务分布</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成员</TableHead>
                <TableHead>负载状态</TableHead>
                <TableHead>总任务</TableHead>
                <TableHead>进行中</TableHead>
                <TableHead>已完成</TableHead>
                <TableHead>待处理</TableHead>
                <TableHead>逾期</TableHead>
                <TableHead>完成率</TableHead>
                <TableHead>负载分数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                    暂无任务数据
                  </TableCell>
                </TableRow>
              )}
              {teamStats.map((stat) => {
                const workloadLevel = getWorkloadLevel(stat.workloadScore);
                return (
                  <TableRow key={stat.assigneeId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">{stat.assigneeName}</div>
                          <div className="text-xs text-gray-500">{stat.assigneeId === 'unassigned' ? '未分配' : '成员'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${workloadLevel.bg} ${workloadLevel.color}`}>
                        {workloadLevel.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{stat.totalTasks}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('in_progress')}`} />
                        {stat.inProgressTasks}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('completed')}`} />
                        {stat.completedTasks}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor('pending')}`} />
                        {stat.pendingTasks}
                      </div>
                    </TableCell>
                    <TableCell>
                      {stat.overdueTasks > 0 ? (
                        <span className="text-red-600 font-semibold">{stat.overdueTasks}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={stat.completionRate} className="w-24" />
                        <span className="text-sm font-medium">{stat.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{stat.workloadScore}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 负载分析图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">任务状态分布</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">已完成</span>
                  <span className="text-sm font-medium">
                    {overallStats.completedTasks} / {overallStats.totalTasks}
                  </span>
                </div>
                <Progress
                  value={(overallStats.completedTasks / overallStats.totalTasks) * 100 || 0}
                  className="h-3"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">进行中</span>
                  <span className="text-sm font-medium">{overallStats.inProgressTasks}</span>
                </div>
                <Progress
                  value={(overallStats.inProgressTasks / overallStats.totalTasks) * 100 || 0}
                  className="h-3 bg-blue-200"
                  indicatorClassName="bg-blue-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">待处理</span>
                  <span className="text-sm font-medium">{overallStats.pendingTasks}</span>
                </div>
                <Progress
                  value={(overallStats.pendingTasks / overallStats.totalTasks) * 100 || 0}
                  className="h-3 bg-gray-200"
                  indicatorClassName="bg-gray-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-red-600">逾期</span>
                  <span className="text-sm font-medium text-red-600">{overallStats.overdueTasks}</span>
                </div>
                <Progress
                  value={(overallStats.overdueTasks / overallStats.totalTasks) * 100 || 0}
                  className="h-3 bg-red-200"
                  indicatorClassName="bg-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold"> workload 分析</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                    <Progress value={(stat.workloadScore / 10) * 100} className="flex-1 h-2" />
                    <Badge variant="outline" className="text-xs w-12 justify-center">
                      {stat.workloadScore}
                    </Badge>
                  </div>
                </div>
              ))}
              {teamStats.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
