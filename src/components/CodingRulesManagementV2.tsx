'use client';

import { useState, useEffect } from 'react';

interface CodingRule {
  rule_id: number;
  code: string;
  name: string;
  description?: string;
}

interface CodingCategory {
  category_id: number;
  rule_id: number;
  category_level: 'second' | 'third' | 'process';
  code: string;
  name: string;
  parent_id?: number;
}

export default function CodingRulesManagementV2() {
  const [rules, setRules] = useState<CodingRule[]>([]);
  const [categories, setCategories] = useState<CodingCategory[]>([]);
  const [selectedRule, setSelectedRule] = useState<CodingRule | null>(null);

  // 产品大类表单状态
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CodingRule | null>(null);
  const [ruleCode, setRuleCode] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');

  // 分类表单状态
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CodingCategory | null>(null);
  const [formLevel, setFormLevel] = useState<'second' | 'third' | 'process'>('second');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    if (selectedRule) {
      fetchCategories(selectedRule.rule_id);
    }
  }, [selectedRule]);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/coding-rules-v2');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedRule(data[0]);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules([]);
    }
  };

  const fetchCategories = async (ruleId: number) => {
    try {
      const res = await fetch(`/api/coding-categories-v2?ruleId=${ruleId}`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  // 产品大类操作
  const handleAddRule = () => {
    setEditingRule(null);
    setRuleCode('');
    setRuleName('');
    setRuleDescription('');
    setShowRuleForm(true);
  };

  const handleEditRule = (rule: CodingRule) => {
    setEditingRule(rule);
    setRuleCode(rule.code);
    setRuleName(rule.name);
    setRuleDescription(rule.description || '');
    setShowRuleForm(true);
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('确定要删除这个产品大类吗？删除前请确保已删除该大类下的所有分类和编码记录。')) return;
    
    try {
      const res = await fetch(`/api/coding-rules-v2/${ruleId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert('删除成功');
        await fetchRules();
        if (selectedRule?.rule_id === ruleId) {
          setSelectedRule(null);
        }
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('删除失败');
    }
  };

  const handleSaveRule = async () => {
    if (!ruleCode || !ruleName) {
      alert('请填写代码和名称');
      return;
    }

    if (ruleCode.length !== 1 || !/^\d$/.test(ruleCode)) {
      alert('代码必须为1位数字（0-9）');
      return;
    }

    // 检查代码是否重复
    const existingRule = rules.find(r => 
      r.code === ruleCode && r.rule_id !== editingRule?.rule_id
    );
    
    if (existingRule) {
      alert(`代码 "${ruleCode}" 已被使用，请选择其他代码`);
      return;
    }

    try {
      const url = '/api/coding-rules-v2';
      const method = editingRule ? 'PUT' : 'POST';
      
      const body = {
        ruleId: editingRule?.rule_id,
        code: ruleCode,
        name: ruleName,
        description: ruleDescription || null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('保存成功');
        setShowRuleForm(false);
        await fetchRules();
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('保存失败');
    }
  };

  // 分类操作
  const handleAddCategory = () => {
    if (!selectedRule) {
      alert('请先选择产品大类');
      return;
    }
    setEditingCategory(null);
    setFormLevel('second');
    setFormCode('');
    setFormName('');
    setFormParentId(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: CodingCategory) => {
    setEditingCategory(category);
    setFormLevel(category.category_level);
    setFormCode(category.code);
    setFormName(category.name);
    setFormParentId(category.parent_id || null);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('确定要删除这个分类吗？')) return;
    
    try {
      const res = await fetch(`/api/coding-categories-v2/${categoryId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        alert('删除成功');
        if (selectedRule) {
          fetchCategories(selectedRule.rule_id);
        }
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('删除失败');
    }
  };

  const handleSaveCategory = async () => {
    if (!formCode || !formName) {
      alert('请填写代码和名称');
      return;
    }

    // third 和 process 级别需要选择父级
    if ((formLevel === 'third' || formLevel === 'process') && !formParentId) {
      alert('请选择所属分类');
      return;
    }

    try {
      const url = '/api/coding-categories-v2';
      const method = editingCategory ? 'PUT' : 'POST';
      
      const body = {
        rule_id: selectedRule?.rule_id,
        category_level: formLevel,
        code: formCode,
        name: formName,
        parent_id: formParentId || null
      };

      if (editingCategory) {
        (body as any).category_id = editingCategory.category_id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await res.json();

      if (res.ok) {
        alert('保存成功');
        setShowCategoryForm(false);
        if (selectedRule) {
          fetchCategories(selectedRule.rule_id);
        }
      } else {
        alert(json.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('保存失败');
    }
  };

  // 获取可用的父类
  const getParentOptions = () => {
    if (formLevel === 'second') {
      return rules;
    } else if (formLevel === 'third') {
      return categories.filter(c => c.category_level === 'second');
    } else {
      return [];
    }
  };

  const secondCategories = categories.filter(c => c.category_level === 'second');
  const thirdCategories = categories.filter(c => c.category_level === 'third');
  const processCategories = categories.filter(c => c.category_level === 'process');

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold mb-2">编码规则管理（13位）</h1>
        <p className="text-gray-600">
          管理13位产品编码规则，包括第一阶（产品大类）、第二阶（分类）、第三阶（子类）、工艺编码
        </p>
      </div>

      {/* 规则选择 - 横排布局 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">产品大类管理</h2>
          <button
            onClick={handleAddRule}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            添加产品大类
          </button>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {rules.map(rule => (
            <div
              key={rule.rule_id}
              className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedRule?.rule_id === rule.rule_id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span onClick={() => setSelectedRule(rule)} className="cursor-pointer">
                {rule.code} - {rule.name}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRule(rule);
                  }}
                  className={`text-xs px-1 py-0.5 rounded ${
                    selectedRule?.rule_id === rule.rule_id
                      ? 'bg-blue-400 text-white hover:bg-blue-300'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  编辑
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRule(rule.rule_id);
                  }}
                  className={`text-xs px-1 py-0.5 rounded ${
                    selectedRule?.rule_id === rule.rule_id
                      ? 'bg-red-400 text-white hover:bg-red-300'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分类管理 */}
      {selectedRule && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              分类管理 - {selectedRule.code} - {selectedRule.name}
            </h2>
            <button
              onClick={handleAddCategory}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              添加分类
            </button>
          </div>

          {/* 横排展示分类 */}
          <div className="space-y-6">
            {/* 第二阶分类 */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                第二阶编码（第2-3位）：分类
              </h3>
              <div className="flex gap-3 flex-wrap">
                {secondCategories.length === 0 ? (
                  <div className="text-gray-500 text-sm py-2">暂无分类</div>
                ) : (
                  secondCategories.map(cat => (
                    <div
                      key={cat.category_id}
                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                    >
                      <span className="font-mono font-semibold text-blue-600">{cat.code}</span>
                      <span className="text-gray-700">{cat.name}</span>
                      <button
                        onClick={() => handleEditCategory(cat)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.category_id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 第三阶分类 */}
            {secondCategories.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  第三阶编码（第4-6位）：子类
                </h3>
                <div className="space-y-2">
                  {secondCategories.map(parentCat => {
                    const children = thirdCategories.filter(c => c.parent_id === parentCat.category_id);
                    return (
                      <div key={parentCat.category_id}>
                        <div className="text-sm text-gray-600 mb-2">
                          {parentCat.code} - {parentCat.name}的子类：
                        </div>
                        <div className="flex gap-3 flex-wrap ml-4">
                          {children.length === 0 ? (
                            <div className="text-gray-500 text-sm py-2">暂无子类</div>
                          ) : (
                            children.map(cat => (
                              <div
                                key={cat.category_id}
                                className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                              >
                                <span className="font-mono font-semibold text-green-600">{cat.code}</span>
                                <span className="text-gray-700">{cat.name}</span>
                                <button
                                  onClick={() => handleEditCategory(cat)}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.category_id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  删除
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 工艺编码 */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                工艺编码（第7位）
              </h3>
              <div className="flex gap-3 flex-wrap">
                {processCategories.length === 0 ? (
                  <div className="text-gray-500 text-sm py-2">暂无工艺编码</div>
                ) : (
                  processCategories.map(cat => (
                    <div
                      key={cat.category_id}
                      className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2"
                    >
                      <span className="font-mono font-semibold text-purple-600">{cat.code}</span>
                      <span className="text-gray-700">{cat.name}</span>
                      <button
                        onClick={() => handleEditCategory(cat)}
                        className="text-purple-600 hover:text-purple-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.category_id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 产品大类表单对话框 */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingRule ? '编辑产品大类' : '添加产品大类'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  代码（第1位）<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ruleCode}
                  onChange={(e) => setRuleCode(e.target.value)}
                  placeholder="输入1位数字（0-9）"
                  maxLength={1}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">必须是1位数字（0-9）</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  名称<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="输入产品大类名称"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  描述
                </label>
                <textarea
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="输入描述信息（可选）"
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRuleForm(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分类表单对话框 */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingCategory ? '编辑分类' : '添加分类'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  分类级别
                </label>
                <select
                  value={formLevel}
                  onChange={(e) => {
                    setFormLevel(e.target.value as any);
                    setFormParentId(null);
                  }}
                  disabled={!!editingCategory}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="second">第二阶（分类）</option>
                  <option value="third">第三阶（子类）</option>
                  <option value="process">工艺编码</option>
                </select>
              </div>

              {formLevel === 'second' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    所属产品大类<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formParentId?.toString() || ''}
                    onChange={(e) => setFormParentId(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">选择产品大类</option>
                    {rules.map(rule => (
                      <option key={rule.rule_id} value={rule.rule_id}>
                        {rule.code} - {rule.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formLevel === 'third' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    所属分类<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formParentId || ''}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">选择分类</option>
                    {secondCategories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formLevel === 'process' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    所属分类<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formParentId || ''}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">选择分类</option>
                    {secondCategories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  代码<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="输入代码"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formLevel === 'second' && <p className="text-xs text-gray-500 mt-1">2 位数字（10-99）</p>}
                {formLevel === 'third' && <p className="text-xs text-gray-500 mt-1">3 位数字（100-999）</p>}
                {formLevel === 'process' && <p className="text-xs text-gray-500 mt-1">1 位数字（0-9）</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  名称<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="输入名称"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCategoryForm(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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
