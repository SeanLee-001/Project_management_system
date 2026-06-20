'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProjectOption {
  id: string;
  name: string;
  status: string;
}

interface Report {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: string;
  status: string;
  format: string;
  content: string;
  generatedBy: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReportPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    projectId: '',
    dateFrom: '',
    dateTo: '',
    description: '',
  });

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
        setTotal(json.pagination.total);
      }
    } catch (err) {
      console.error('获取报告列表失败:', err);
    }
  }, [page]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?limit=200');
      const json = await res.json();
      if (json.success) {
        setProjects(Array.isArray(json.data) ? json.data : []);
      }
    } catch (err) {
      console.error('获取项目列表失败:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!generateForm.projectId) {
      alert('请选择项目');
      return;
    }

    setGenerating(true);
    try {
      const params = new URLSearchParams({
        projectId: generateForm.projectId,
        description: generateForm.description,
      });
      if (generateForm.dateFrom) params.append('dateFrom', generateForm.dateFrom);
      if (generateForm.dateTo) params.append('dateTo', generateForm.dateTo);

      const res = await fetch(`/api/reports/generate?${params}`);
      const json = await res.json();

      if (json.success) {
        setShowGenerateModal(false);
        setGenerateForm({ projectId: '', dateFrom: '', dateTo: '', description: '' });
        fetchReports();
        alert('报告生成成功');
      } else {
        alert(json.error || '生成失败');
      }
    } catch (err) {
      console.error('生成报告失败:', err);
      alert('生成报告失败');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      const json = await res.json();
      if (json.success) {
        setPreviewReport(json.data);
        setShowPreviewModal(true);
      }
    } catch (err) {
      console.error('获取报告详情失败:', err);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('确定要删除该报告吗？')) return;

    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchReports();
        if (previewReport?.id === reportId) {
          setPreviewReport(null);
          setShowPreviewModal(false);
        }
      } else {
        alert(json.error || '删除失败');
      }
    } catch (err) {
      console.error('删除报告失败:', err);
    }
  };

  const handleRegenerate = async (reportId: string) => {
    if (!confirm('重新生成将创建一份新的报告，是否继续？')) return;

    try {
      const res = await fetch('/api/reports/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchReports();
        alert('报告已重新生成');
      } else {
        alert(json.error || '重新生成失败');
      }
    } catch (err) {
      console.error('重新生成失败:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <p className="text-gray-500">基于项目数据自动生成综合分析报告</p>
        <button
          onClick={() => {
            fetchProjects();
            setShowGenerateModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          生成报告
        </button>
      </div>

      {/* 报告列表 */}
      <div className="bg-white rounded-lg shadow">
        {reports.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            暂无报告，点击"生成报告"按钮创建第一份报告
          </div>
        ) : (
          <div className="divide-y">
            {reports.map((report) => (
              <div key={report.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>生成人: {report.generatedBy}</span>
                      <span>生成时间: {new Date(report.generatedAt).toLocaleString('zh-CN')}</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{report.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handlePreview(report.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      预览
                    </button>
                    <button
                      onClick={() => handleRegenerate(report.id)}
                      className="text-orange-600 hover:text-orange-800 text-sm"
                    >
                      重新生成
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > pageSize && (
          <div className="p-4 border-t flex justify-between items-center">
            <span className="text-sm text-gray-500">共 {total} 条记录</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1">第 {page} 页</span>
              <button
                onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 生成报告模态框 */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">生成项目综合报告</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">选择项目 *</label>
                <select
                  value={generateForm.projectId}
                  onChange={(e) => setGenerateForm({ ...generateForm, projectId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">报告开始日期</label>
                  <input
                    type="date"
                    value={generateForm.dateFrom}
                    onChange={(e) => setGenerateForm({ ...generateForm, dateFrom: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">报告结束日期</label>
                  <input
                    type="date"
                    value={generateForm.dateTo}
                    onChange={(e) => setGenerateForm({ ...generateForm, dateTo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={generateForm.description}
                  onChange={(e) => setGenerateForm({ ...generateForm, description: e.target.value })}
                  rows={3}
                  placeholder="报告描述或前言..."
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {generating ? '生成中...' : '生成报告'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 报告预览模态框 */}
      {showPreviewModal && previewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{previewReport.title}</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-500">
              生成人: {previewReport.generatedBy} | 生成时间: {new Date(previewReport.generatedAt).toLocaleString('zh-CN')}
            </div>

            <div className="border rounded p-4 bg-gray-50 overflow-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {previewReport.content || '暂无内容'}
              </pre>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
