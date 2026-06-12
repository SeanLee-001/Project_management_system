'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Clock,
  UserCheck,
  Users,
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

export function KnowledgeBasePanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<ProjectRiskAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'risks'>('news');
  const [summary, setSummary] = useState<any>(null);

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

  const fetchRiskAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/project-risk-analysis');
      const data = await response.json();
      if (data.success) {
        setRiskAnalysis(data.data.analyses);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch risk analysis:', error);
    } finally {
      setLoading(false);
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
    switch (relevance) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'schedule_overdue':
      case 'schedule_warning':
        return <Calendar className="w-5 h-5" />;
      case 'task_imbalance':
      case 'resource_idle':
        return <Users className="w-5 h-5" />;
      case 'stale_project':
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">知识库与智能分析</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === 'news' ? fetchNews : fetchRiskAnalysis}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'news' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('news')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            行业新闻 ({news.length})
          </Button>
          <Button
            variant={activeTab === 'risks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('risks')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            项目风险 {summary?.highRisks ? `(${summary.highRisks}个高危)` : ''}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 h-[calc(100%-120px)] overflow-y-auto">
        {activeTab === 'news' && (
          <div className="space-y-4">
            {news.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-10">
                暂无新闻数据，点击刷新获取
              </div>
            )}
            {news.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{item.category}</Badge>
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
                        <Button variant="link" size="sm" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            阅读原文 <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-6">
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{summary.totalProjects}</div>
                    <div className="text-sm text-gray-500">总项目数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {summary.projectsWithRisks}
                    </div>
                    <div className="text-sm text-gray-500">有风险项目</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{summary.highRisks}</div>
                    <div className="text-sm text-gray-500">高危风险</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{summary.totalRisks}</div>
                    <div className="text-sm text-gray-500">总风险数</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {riskAnalysis.length === 0 && !loading && (
              <div className="text-center text-green-600 py-10">
                <UserCheck className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl font-semibold">所有项目运行正常！</p>
                <p className="text-gray-500 mt-2">未发现风险项</p>
              </div>
            )}

            {riskAnalysis.map((analysis) => (
              <Card key={analysis.projectId} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{analysis.projectName}</h3>
                      <p className="text-sm text-gray-500">{analysis.projectCode}</p>
                    </div>
                    <Badge variant={analysis.highRiskCount > 0 ? 'destructive' : 'secondary'}>
                      {analysis.riskCount}个风险 ({analysis.highRiskCount}高危)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                                className={`px-2 py-0.5 rounded text-xs ${getRiskLevelColor(
                                  risk.level
                                )}`}
                              >
                                {risk.level === 'high' ? '高危' : risk.level === 'medium' ? '中危' : '低危'}
                              </span>
                              <span className="text-sm">{risk.description}</span>
                            </div>
                            {risk.details && (
                              <div className="text-xs text-gray-500 mt-1 ml-12">
                                {JSON.stringify(risk.details, null, 2)}
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
                              <Badge variant="outline" className="text-xs">
                                {rec.priority === 'high' ? '紧急' : rec.priority === 'medium' ? '重要' : '建议'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">{rec.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
