'use client';

import { useState, useEffect } from 'react';

interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  taskId: string | null;
  category: string;
  tags: string | null;
  createdBy: string;
  viewCount: string;
  createdAt: string;
  updatedAt: string;
  attachments?: KnowledgeBaseAttachment[];
}

interface KnowledgeBaseAttachment {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  fileType: string;
  uploadedBy: string;
  createdAt: string;
}

export default function KnowledgeBaseManagement() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
  });

  // 用户角色（模拟，实际应从用户状态获取）
  const [userRole, setUserRole] = useState('project_member'); // 默认为普通用户

  useEffect(() => {
    fetchKnowledgeBases();
    // TODO: 从用户session获取实际角色
    // setUserRole(currentUser.role);
  }, [currentPage, selectedCategory, searchKeyword]);

  const fetchKnowledgeBases = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchKeyword) params.append('search', searchKeyword);

      const res = await fetch(`/api/knowledge-base?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setKnowledgeBases(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('获取知识库列表失败:', error);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge-base/${id}`);
      const data = await res.json();
      
      if (data.success) {
        setSelectedKb(data.data);
      }
    } catch (error) {
      console.error('获取知识库详情失败:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? JSON.stringify(formData.tags.split(',').map((t: string) => t.trim())) : null,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', content: '', category: 'general', tags: '' });
        fetchKnowledgeBases();
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建知识库失败:', error);
      alert('创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedKb) return;

    try {
      const res = await fetch(`/api/knowledge-base/${selectedKb.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? JSON.stringify(formData.tags.split(',').map((t: string) => t.trim())) : null,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowEditModal(false);
        setFormData({ title: '', content: '', category: 'general', tags: '' });
        fetchKnowledgeBases();
        if (selectedKb.id) handleViewDetail(selectedKb.id);
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新知识库失败:', error);
      alert('更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个知识库吗？')) return;

    try {
      const res = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('删除成功');
        if (selectedKb?.id === id) {
          setSelectedKb(null);
        }
        fetchKnowledgeBases();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除知识库失败:', error);
      alert('删除失败');
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!selectedKb) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/knowledge-base/${selectedKb.id}/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        handleViewDetail(selectedKb.id);
      } else {
        alert(data.error || '上传失败');
      }
    } catch (error) {
      console.error('上传附件失败:', error);
      alert('上传失败');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedKb) return;

    try {
      const res = await fetch(`/api/knowledge-base/${selectedKb.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (data.success) {
        handleViewDetail(selectedKb.id);
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除附件失败:', error);
      alert('删除失败');
    }
  };

  const openEditModal = () => {
    if (selectedKb) {
      setFormData({
        title: selectedKb.title,
        content: selectedKb.content || '',
        category: selectedKb.category,
        tags: selectedKb.tags ? JSON.parse(selectedKb.tags).join(', ') : '',
      });
      setShowEditModal(true);
    }
  };

  const isAdmin = userRole === 'system_admin';

  const categoryLabels: Record<string, string> = {
    general: '通用',
    project: '项目',
    task: '任务',
    technical: '技术',
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        {/* 左侧列表 */}
        <div className="w-2/3">
          {/* 搜索和筛选 */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索知识库..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有分类</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 知识库列表 */}
          <div className="bg-white rounded-lg shadow">
            {isAdmin && (
              <div className="p-4 border-b">
                <button
                  onClick={() => {
                    setFormData({ title: '', content: '', category: 'general', tags: '' });
                    setShowCreateModal(true);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  新建知识库
                </button>
              </div>
            )}
            
            {knowledgeBases.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                暂无知识库
              </div>
            ) : (
              <div className="divide-y">
                {knowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewDetail(kb.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{kb.title}</h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {categoryLabels[kb.category] || kb.category}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                      {kb.content || '暂无内容'}
                    </p>
                    <div className="flex items-center text-xs text-gray-400">
                      <span>浏览 {kb.viewCount}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(kb.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {total > pageSize && (
              <div className="p-4 border-t flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  共 {total} 条记录
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1">
                    第 {currentPage} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(total / pageSize), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="w-1/3">
          {selectedKb ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-start">
                <h2 className="text-xl font-bold">{selectedKb.title}</h2>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={openEditModal}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(selectedKb.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {categoryLabels[selectedKb.category] || selectedKb.category}
                  </span>
                </div>

                <div className="prose prose-sm max-w-none mb-4">
                  <div dangerouslySetInnerHTML={{ __html: selectedKb.content || '暂无内容' }} />
                </div>

                {/* 附件列表 */}
                {selectedKb.attachments && selectedKb.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-semibold mb-2">附件 ({selectedKb.attachments.length})</h3>
                    <div className="space-y-2">
                      {selectedKb.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">📄</span>
                            <div>
                              <div className="text-sm font-medium">{attachment.fileName}</div>
                              <div className="text-xs text-gray-500">
                                {attachment.fileType.toUpperCase()} • {(parseInt(attachment.fileSize) / 1024).toFixed(2)} KB
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 上传附件按钮（仅管理员） */}
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="block mb-2">
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAttachment(file);
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <span className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded block text-center">
                        上传附件
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      支持 PDF、PPT、PPTX、XLS、XLSX、DOC、DOCX 格式
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                  <div>创建时间: {new Date(selectedKb.createdAt).toLocaleString('zh-CN')}</div>
                  {selectedKb.updatedAt && selectedKb.updatedAt !== selectedKb.createdAt && (
                    <div>更新时间: {new Date(selectedKb.updatedAt).toLocaleString('zh-CN')}</div>
                  )}
                  <div>浏览次数: {selectedKb.viewCount}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              请选择一个知识库查看详情
            </div>
          )}
        </div>
      </div>

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">新建知识库</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="例如：技术文档, 项目资料"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && selectedKb && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">编辑知识库</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="例如：技术文档, 项目资料"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
