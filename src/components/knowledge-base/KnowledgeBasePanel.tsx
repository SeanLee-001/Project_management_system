'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Clock,
  UserCheck,
  Users,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  summary: string;
  url: string;
  publishTime: string;
  relevance: 'high' | 'medium' | 'low';
}

interface RiskItem {
  type: string;
  level: 'high' | 'medium' | 'low';
  description: string;
  details?: any;
}

interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
}

interface ProjectRiskAnalysis {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
  risks: RiskItem[];
  recommendations: Recommendation[];
  riskCount: number;
  highRiskCount: number;
}

const RISK_TYPE_LABELS: Record<string, string> = {
  schedule_overdue: '项目延期',
  schedule_warning: '到期预警',
  task_imbalance: '任务分配不均衡',
  resource_idle: '成员空闲',
  stale_project: '项目长期未更新',
  obsolete_project: '技术/设备淘汰预警',
  financial_risk: '客户财务风险',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '紧急',
  medium: '重要',
  low: '建议',
};

export default function KnowledgeBasePanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<ProjectRiskAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'risks'>('news');
  const [summary, setSummary] = useState<any>(null);
  const [nextScheduleTime, setNextScheduleTime] = useState<string>('');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/news-fetch');
      const data = await response.json();
      if (data.success) {
        setNews(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskAnalysis = async (force = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/project-risk-analysis?force=${force}`);
      const data = await response.json();
      if (data.success) {
        setRiskAnalysis(data.data.analyses);
        setSummary(data.data.summary);
        setNextScheduleTime(data.data.nextScheduleTime || '');
        return data.data;
      }
    } catch (error) {
      console.error('Failed to fetch risk analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRiskAnalysis = async () => {
    setRefreshing(true);
    try {
      await fetchRiskAnalysis(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    } else {
      fetchRiskAnalysis();
    }
  }, [activeTab]);

  const getRelevanceColor = (relevance: string) => {
    if (relevance === 'high') return 'bg-red-500';
    if (relevance === 'medium') return 'bg-yellow-500';
    if (relevance === 'low') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getRiskLevelColor = (level: string) => {
    if (level === 'high') return 'bg-red-500 text-white';
    if (level === 'medium') return 'bg-yellow-500 text-black';
    if (level === 'low') return 'bg-blue-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getRiskIcon = (type: string) => {
    if (type === 'schedule_overdue' || type === 'schedule_warning') {
      return <Calendar className="w-5 h-5" />;
    }
    if (type === 'task_imbalance' || type === 'resource_idle') {
      return <Users className="w-5 h-5" />;
    }
    if (type === 'stale_project') {
      return <Clock className="w-5 h-5" />;
    }
    if (type === 'obsolete_project') {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    if (type === 'financial_risk') {
      return <ShieldAlert className="w-5 h-5 text-orange-500" />;
    }
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getRiskDetailText = (risk: RiskItem) => {
    if (!risk.details) return null;
    
    switch (risk.type) {
      case 'task_imbalance':
        return `${risk.details.overloadedPerson} 承担 ${risk.details.maxTasks} 个任务，平均值 ${risk.details.avgTasks} 个`;
      case 'resource_idle':
        return `${risk.details.idleCount} 名成员目前没有分配任务`;
      case 'schedule_overdue':
        return `截止日期：${risk.details?.endDate ? new Date(risk.details.endDate).toLocaleDateString('zh-CN') : '未知'}`;
      case 'schedule_warning':
        return `截止日期：${risk.details?.endDate ? new Date(risk.details.endDate).toLocaleDateString('zh-CN') : '未知'}`;
      case 'stale_project':
        return `最后更新时间：${risk.details?.updatedAt ? new Date(risk.details.updatedAt).toLocaleDateString('zh-CN') : '未知'}`;
      case 'obsolete_project':
        return `匹配关键词：${risk.details.keyword || '行业报告预警'}`;
      case 'financial_risk':
        return `客户：${risk.details.customer || '未知'}，来源：${risk.details.source || '公开数据'}`;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow">
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">知识库与智能分析</h2>
          <button
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            onClick={() => activeTab === 'news' ? fetchNews() : fetchRiskAnalysis()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === 'news' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('news')}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            行业新闻 ({news.length})
          </button>
          <button
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === 'risks' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('risks')}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            项目风险 {summary?.highRisks ? `(${summary.highRisks}个高危)` : ''}
          </button>
        </div>
        {activeTab === 'risks' && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              下次定时分析：{nextScheduleTime}
            </div>
            <button
              className={`px-4 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                refreshing ? 'animate-pulse' : ''
              }`}
              onClick={handleRefreshRiskAnalysis}
              disabled={loading || refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 inline ${refreshing ? 'animate-spin' : ''}`} />
              立即刷新分析
            </button>
          </div>
        )}
      </div>

      <div className="p-6 overflow-y-auto h-[calc(100vh-280px)]">
        {activeTab === 'news' && (
          <div className="space-y-4">
            {news.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-10">
                暂无新闻数据，点击刷新获取
              </div>
            )}
            {news.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs font-medium">{item.category}</span>
                      <span className="text-sm text-gray-500">{item.source}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${getRelevanceColor(item.relevance)}`}
                        title={`相关度：${item.relevance}`}
                      />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{item.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(item.publishTime).toLocaleString('zh-CN')}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm inline-flex items-center"
                      >
                        阅读原文 <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-6">
            {summary && (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{summary.totalProjects}</div>
                    <div className="text-sm text-gray-500">总项目数</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {summary.projectsWithRisks}
                    </div>
                    <div className="text-sm text-gray-500">有风险项目</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{summary.highRisks}</div>
                    <div className="text-sm text-gray-500">高危风险</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{summary.totalRisks}</div>
                    <div className="text-sm text-gray-500">总风险数</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="border rounded-lg p-3 bg-orange-50">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-orange-500" />
                      <div className="text-lg font-bold text-orange-700">{summary.riskTypes?.financial_risk || 0}</div>
                    </div>
                    <div className="text-sm text-gray-600">客户财务风险</div>
                  </div>
                  <div className="border rounded-lg p-3 bg-red-50">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      <div className="text-lg font-bold text-red-700">{summary.riskTypes?.obsolete_project || 0}</div>
                    </div>
                    <div className="text-sm text-gray-600">淘汰预警</div>
                  </div>
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <div className="text-lg font-bold text-blue-700">{summary.riskTypes?.schedule_overdue || 0}</div>
                    </div>
                    <div className="text-sm text-gray-600">项目延期</div>
                  </div>
                  <div className="border rounded-lg p-3 bg-purple-50">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      <div className="text-lg font-bold text-purple-700">{summary.riskTypes?.task_imbalance || 0}</div>
                    </div>
                    <div className="text-sm text-gray-600">人员负载不均</div>
                  </div>
                </div>
              </div>
            )}

            {riskAnalysis.length === 0 && !loading && (
              <div className="text-center text-green-600 py-10">
                <UserCheck className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl font-semibold">所有项目运行正常！</p>
                <p className="text-gray-500 mt-2">未发现风险项</p>
              </div>
            )}

            {riskAnalysis.map((analysis) => {
              const hasObsolete = analysis.risks.some(r => r.type === 'obsolete_project');
              const hasFinancial = analysis.risks.some(r => r.type === 'financial_risk');
              let borderColor = 'border-l-red-500';
              if (hasFinancial) borderColor = 'border-l-orange-500';
              if (hasObsolete) borderColor = 'border-l-purple-500';
              
              return (
                <div key={analysis.projectId} className={`border-l-4 ${borderColor} border rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <div>
                      <h3 className="text-lg font-semibold">{analysis.projectName}</h3>
                      <p className="text-sm text-gray-500">{analysis.projectCode}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      analysis.highRiskCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {analysis.riskCount}个风险 ({analysis.highRiskCount}高危)
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                        风险项
                      </h4>
                      <div className="space-y-2">
                        {analysis.risks.map((risk, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-2 bg-gray-50 rounded"
                          >
                            {getRiskIcon(risk.type)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${getRiskLevelColor(risk.level)}`}
                                >
                                  {risk.level === 'high' ? '高危' : risk.level === 'medium' ? '中危' : '低危'}
                                </span>
                                <span className="font-medium text-sm">{RISK_TYPE_LABELS[risk.type] || risk.type}</span>
                                <span className="text-sm text-gray-600">- {risk.description}</span>
                              </div>
                              {getRiskDetailText(risk) && (
                                <div className="ml-2 mt-1 text-xs text-gray-500">
                                  {getRiskDetailText(risk)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                          建议措施
                        </h4>
                        <div className="space-y-2">
                          {analysis.recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded border-l-4 ${
                                rec.priority === 'high'
                                  ? 'bg-red-50 border-red-500'
                                  : rec.priority === 'medium'
                                  ? 'bg-yellow-50 border-yellow-500'
                                  : 'bg-blue-50 border-blue-500'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{rec.title}</span>
                                <span className={`px-2 py-0.5 rounded text-xs border ${
                                  rec.priority === 'high' ? 'border-red-500 text-red-600' :
                                  rec.priority === 'medium' ? 'border-yellow-500 text-yellow-600' :
                                  'border-blue-500 text-blue-600'
                                }`}>
                                  {PRIORITY_LABELS[rec.priority] || rec.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{rec.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
