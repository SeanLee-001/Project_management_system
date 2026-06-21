'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [generationMode, setGenerationMode] = useState<'standard' | 'ai'>('ai');

  const [generateForm, setGenerateForm] = useState({
    projectId: '',
    dateFrom: '',
    dateTo: '',
    description: '',
  });

  const [aiRequirements, setAiRequirements] = useState('');
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiStreamContent, setAiStreamContent] = useState('');
  const [aiStreamingStatus, setAiStreamingStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [aiStreamError, setAiStreamError] = useState('');
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamContentRef = useRef<HTMLDivElement>(null);

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

  const handleStandardGenerate = async () => {
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

  const handleAiGenerate = async () => {
    if (!generateForm.projectId) {
      alert('请选择项目');
      return;
    }

    setAiStreamingStatus('generating');
    setAiStreamContent('');
    setAiStreamError('');
    setShowAiPreview(true);
    setGenerating(true);

    try {
      const res = await fetch('/api/reports/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: generateForm.projectId,
          requirements: aiRequirements,
          files: aiFiles.map(f => ({ name: f.name, size: f.size })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '请求失败');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'generating') {
                setAiStreamingStatus('generating');
              } else if (parsed.content) {
                setAiStreamContent(prev => prev + parsed.content);
              } else if (parsed.status === 'completed') {
                setAiStreamingStatus('completed');
                setGeneratedReportId(parsed.reportId);
                setShowGenerateModal(false);
                setGenerateForm({ projectId: '', dateFrom: '', dateTo: '', description: '' });
                setAiRequirements('');
                setAiFiles([]);
                fetchReports();
              } else if (parsed.error) {
                setAiStreamError(parsed.error);
                setAiStreamingStatus('error');
              }
            } catch (e) {
              // ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err: any) {
      console.error('AI 生成报告失败:', err);
      setAiStreamError(err.message || '生成失败');
      setAiStreamingStatus('error');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setAiFiles(prev => [...prev, ...selectedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (streamContentRef.current) {
      streamContentRef.current.scrollTop = streamContentRef.current.scrollHeight;
    }
  }, [aiStreamContent]);

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <p className="text-gray-500">基于项目数据自动生成综合分析报告，支持 AI 智能分析</p>
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
                      <span className={`px-2 py-0.5 rounded ${report.type === 'ai_comprehensive' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {report.type === 'ai_comprehensive' ? 'AI 智能' : report.type}
                      </span>
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
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">生成项目综合报告</h2>

            {/* 生成模式切换 */}
            <div className="flex gap-2 mb-4">
              <button
                className={`px-4 py-2 rounded text-sm font-medium ${
                  generationMode === 'ai' ? 'bg-purple-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                onClick={() => setGenerationMode('ai')}
              >
                AI 智能生成
              </button>
              <button
                className={`px-4 py-2 rounded text-sm font-medium ${
                  generationMode === 'standard' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                onClick={() => setGenerationMode('standard')}
              >
                标准模板生成
              </button>
            </div>

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

              {generationMode === 'standard' && (
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
              )}

              {generationMode === 'ai' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">报告要求与说明</label>
                    <textarea
                      value={aiRequirements}
                      onChange={(e) => setAiRequirements(e.target.value)}
                      rows={4}
                      placeholder="请描述您希望报告包含的内容、关注的重点、特殊要求等。例如：重点关注项目延期风险、分析成本超支原因、对比行业趋势..."
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">补充文件</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600"
                      >
                        + 添加文件
                      </button>
                      <span className="text-xs text-gray-400">支持 PDF、Word、Excel、图片等格式</span>
                    </div>
                    {aiFiles.length > 0 && (
                      <div className="space-y-1">
                        {aiFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded text-sm">
                            <span className="text-gray-700 truncate flex-1">{file.name}</span>
                            <button
                              onClick={() => handleRemoveFile(i)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              移除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={generating}
              >
                取消
              </button>
              <button
                onClick={generationMode === 'ai' ? handleAiGenerate : handleStandardGenerate}
                disabled={generating}
                className={`px-4 py-2 text-white rounded disabled:opacity-50 ${
                  generationMode === 'ai'
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {generating
                  ? '生成中...'
                  : generationMode === 'ai'
                  ? 'AI 智能生成'
                  : '标准生成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 流式生成预览 */}
      {showAiPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {aiStreamingStatus === 'generating' && 'AI 正在生成报告...'}
                {aiStreamingStatus === 'completed' && '报告生成完成'}
                {aiStreamingStatus === 'error' && '报告生成失败'}
              </h2>
              <button
                onClick={() => setShowAiPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {aiStreamingStatus === 'generating' && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                  <span className="text-sm text-gray-500">正在调用 AI 模型分析数据并生成报告...</span>
                </div>
              </div>
            )}

            {aiStreamingStatus === 'completed' && generatedReportId && (
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => { handlePreview(generatedReportId); setShowAiPreview(false); }}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  查看完整报告
                </button>
                <button
                  onClick={() => setShowAiPreview(false)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            )}

            {aiStreamingStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {aiStreamError}
              </div>
            )}

            <div className="flex-1 border rounded-lg p-6 bg-gray-50 overflow-y-auto min-h-[300px] max-h-[50vh]">
              {aiStreamContent ? (
                <pre ref={streamContentRef} className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {aiStreamContent}
                </pre>
              ) : aiStreamingStatus === 'generating' ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  正在连接 AI 服务...
                </div>
              ) : null}
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
