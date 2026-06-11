
'use client';

import { useState, useEffect, useMemo } from 'react';
import { pinyin } from 'pinyin-pro';

interface CodingRule {
  rule_id: string;
  code: string;
  name: string;
}

interface CodingCategory {
  category_id: string;
  rule_id: string;
  category_level: 'second' | 'third' | 'process';
  code: string;
  name: string;
  parent_id?: string;
}

interface GeneratedCode {
  record_id: string;
  code: string;
  material_name: string;
  sequence_number: number;
  version: string;
  rule_name?: string;
  second_category_name?: string;
  third_category_name?: string;
  process_category_name?: string;
  project_name?: string;
  created_at: string;
}

export default function ProductCodeGenerationV2() {
  const [rules, setRules] = useState<CodingRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const [secondCategories, setSecondCategories] = useState<CodingCategory[]>([]);
  const [selectedSecondId, setSelectedSecondId] = useState<string | null>(null);

  const [thirdCategories, setThirdCategories] = useState<CodingCategory[]>([]);
  const [selectedThirdId, setSelectedThirdId] = useState<string | null>(null);

  const [processCategories, setProcessCategories] = useState<CodingCategory[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  const [materialName, setMaterialName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [version, setVersion] = useState('A');

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [codeBreakdown, setCodeBreakdown] = useState<any>(null);

  const [codeRecords, setCodeRecords] = useState<GeneratedCode[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  const [editingRecord, setEditingRecord] = useState<GeneratedCode | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMaterialName, setEditMaterialName] = useState('');

  const [changingVersionRecord, setChangingVersionRecord] = useState<GeneratedCode | null>(null);
  const [showVersionChangeModal, setShowVersionChangeModal] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [versionChangeReason, setVersionChangeReason] = useState('');

  const recordsWithPinyin = useMemo(() => {
    return codeRecords.map(record => ({
      ...record,
      materialPinyin: pinyin(record.material_name, { toneType: 'none', type: 'array' }).join(' '),
      projectNamePinyin: pinyin(record.project_name || '', { toneType: 'none', type: 'array' }).join(' ')
    }));
  }, [codeRecords]);

  const filteredRecords = useMemo(() => {
    if (!searchKeyword.trim()) return recordsWithPinyin;
    const keyword = searchKeyword.toLowerCase();
    return recordsWithPinyin.filter(record =>
      record.material_name.toLowerCase().includes(keyword) ||
      record.code.includes(keyword) ||
      record.materialPinyin.toLowerCase().includes(keyword) ||
      record.projectNamePinyin.toLowerCase().includes(keyword)
    );
  }, [recordsWithPinyin, searchKeyword]);

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    if (selectedRuleId) {
      fetchSecondCategories(selectedRuleId);
      fetchProcessCategories(selectedRuleId);
    }
  }, [selectedRuleId]);

  useEffect(() => {
    if (selectedSecondId) {
      fetchThirdCategories(selectedSecondId);
    } else {
      setThirdCategories([]);
      setSelectedThirdId(null);
    }
  }, [selectedSecondId]);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/coding-rules-v2');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedRuleId(data[0].rule_id);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules([]);
    }
  };

  const fetchSecondCategories = async (ruleId: string) => {
    try {
      setSecondCategories([]);
      const res = await fetch(`/api/coding-categories-v2?ruleId=${ruleId}&level=second`);
      const data = await res.json();
      setSecondCategories(Array.isArray(data) ? data : []);
      setSelectedSecondId(null);
    } catch (error) {
      console.error('Error fetching second categories:', error);
      setSecondCategories([]);
    }
  };

  const fetchThirdCategories = async (secondId: string) => {
    try {
      setThirdCategories([]);
      const res = await fetch(`/api/coding-categories-v2?parentId=${secondId}&level=third`);
      const data = await res.json();
      setThirdCategories(Array.isArray(data) ? data : []);
      setSelectedThirdId(null);
    } catch (error) {
      console.error('Error fetching third categories:', error);
      setThirdCategories([]);
    }
  };

  const fetchProcessCategories = async (ruleId: string) => {
    try {
      setProcessCategories([]);
      const res = await fetch(`/api/coding-categories-v2?ruleId=${ruleId}&level=process`);
      const data = await res.json();
      setProcessCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching process categories:', error);
      setProcessCategories([]);
    }
  };

  const fetchCodeRecords = async () => {
    try {
      const res = await fetch('/api/generated-codes-v2');
      const data = await res.json();
      setCodeRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching code records:', error);
      setCodeRecords([]);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedRuleId || !selectedSecondId || !materialName || !version) {
      alert('请填写必填项');
      return;
    }

    try {
      const res = await fetch('/api/coding-rules-v2/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: selectedRuleId,
          secondCategoryId: selectedSecondId,
          thirdCategoryId: selectedThirdId || null,
          processCategoryId: selectedProcessId || null,
          materialName,
          projectName,
          version
        })
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedCode(data.code);
        setCodeBreakdown(data.breakdown);
        fetchCodeRecords();
      } else {
        alert(data.error || '生成失败');
      }
    } catch (error) {
      console.error('Error generating code:', error);
      alert('生成失败');
    }
  };

  const resetForm = () => {
    setMaterialName('');
    setProjectName('');
    setVersion('A');
    setGeneratedCode('');
    setCodeBreakdown(null);
    setSelectedSecondId(null);
    setSelectedThirdId(null);
    setSelectedProcessId(null);
  };

  const handleEditRecord = (record: GeneratedCode) => {
    setEditingRecord(record);
    setEditMaterialName(record.material_name);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !editMaterialName.trim()) {
      alert('请输入物料名称');
      return;
    }

    try {
      const res = await fetch('/api/generated-codes-v2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: editingRecord.record_id,
          materialName: editMaterialName.trim()
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('保存成功');
        setShowEditModal(false);
        fetchCodeRecords();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('保存失败');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除这条编码记录吗？')) return;

    try {
      const res = await fetch(`/api/generated-codes-v2/${recordId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('删除成功');
        fetchCodeRecords();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('删除失败');
    }
  };

  const handleChangeVersion = (record: GeneratedCode) => {
    setChangingVersionRecord(record);
    setNewVersion(record.version);
    setShowVersionChangeModal(true);
  };

  const handleSaveVersionChange = async () => {
    if (!changingVersionRecord || !newVersion) {
      alert('请选择新版本号');
      return;
    }

    try {
      const res = await fetch(`/api/generated-codes-v2/${changingVersionRecord.record_id}/change-version`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: changingVersionRecord.record_id,
          newVersion: newVersion,
          reason: versionChangeReason
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('版本变更成功');
        setShowVersionChangeModal(false);
        fetchCodeRecords();
      } else {
        alert(data.error || '版本变更失败');
      }
    } catch (error) {
      console.error('Error changing version:', error);
      alert('版本变更失败');
    }
  };

  useEffect(() => {
    fetchCodeRecords();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">产品编码生成（13 位）</h1>
        <p className="text-gray-600">
          编码格式：第 1 位（产品大类）+ 第 2-3 位（分类）+ 第 4-6 位（子类）+ 第 7 位（工艺）+ 第 8-12 位（流水号）+ 第 13 位（版本）
        </p>
      </div>

      {/* 编码生成表单 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">编码生成</h2>
        <p className="text-gray-600 text-sm mb-6">填写物料信息和编码参数，自动生成唯一编码</p>
        
        {/* 物料名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            物料名称<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            placeholder="输入物料名称"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 项目名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            项目名称
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="输入项目名称（选填）"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 选择器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {/* 产品大类 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">产品大类（第 1 位）<span className="text-red-500">*</span></label>
            <select value={selectedRuleId || ''} onChange={(e) => setSelectedRuleId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">选择</option>
              {rules.map(rule => (<option key={rule.rule_id} value={rule.rule_id}>{rule.code} - {rule.name}</option>))}
            </select>
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">分类（第 2-3 位）<span className="text-red-500">*</span></label>
            <select value={selectedSecondId || ''} onChange={(e) => setSelectedSecondId(e.target.value)} disabled={!selectedRuleId}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">选择</option>
              {secondCategories.map(cat => (<option key={cat.category_id} value={cat.category_id}>{cat.code} - {cat.name}</option>))}
            </select>
          </div>

          {/* 子类 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">子类（第 4-6 位）</label>
            <select value={selectedThirdId || ''} onChange={(e) => setSelectedThirdId(e.target.value)} disabled={!selectedSecondId}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">选择（可选）</option>
              {thirdCategories.map(cat => (<option key={cat.category_id} value={cat.category_id}>{cat.code} - {cat.name}</option>))}
            </select>
          </div>

          {/* 工艺 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">工艺（第 7 位）</label>
            <select value={selectedProcessId || ''} onChange={(e) => setSelectedProcessId(e.target.value)} disabled={!selectedRuleId}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">选择（可选）</option>
              {processCategories.map(cat => (<option key={cat.category_id} value={cat.category_id}>{cat.code} - {cat.name}</option>))}
            </select>
          </div>

          {/* 版本 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">版本（第 13 位）<span className="text-red-500">*</span></label>
            <select value={version} onChange={(e) => setVersion(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                <option key={letter} value={letter}>{letter}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button onClick={handleGenerateCode} disabled={!selectedRuleId || !selectedSecondId || !materialName || !version}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50">生成编码</button>
          <button onClick={resetForm} className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50">重置</button>
        </div>
      </div>

      {/* 生成结果 */}
      {generatedCode && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
            <div className="text-sm text-gray-600 mb-2">生成的 13 位编码：</div>
            <div className="text-4xl font-mono font-bold text-blue-600 tracking-wider text-center py-2">{generatedCode}</div>
          </div>
          {codeBreakdown && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-gray-50 p-4 rounded border"><div className="text-xs text-gray-600">第 1 位<br/>产品大类</div><div className="font-mono font-bold text-2xl text-blue-600">{codeBreakdown.first}</div></div>
              <div className="bg-gray-50 p-4 rounded border"><div className="text-xs text-gray-600">第 2-3 位<br/>分类</div><div className="font-mono font-bold text-2xl text-blue-600">{codeBreakdown.second}</div></div>
              <div className="bg-gray-50 p-4 rounded border"><div className="text-xs text-gray-600">第 4-6 位<br/>子类</div><div className="font-mono font-bold text-2xl text-blue-600">{codeBreakdown.third}</div></div>
              <div className="bg-gray-50 p-4 rounded border"><div className="text-xs text-gray-600">第 7 位<br/>工艺</div><div className="font-mono font-bold text-2xl text-blue-600">{codeBreakdown.process}</div></div>
              <div className="bg-gray-50 p-4 rounded border"><div className="text-xs text-gray-600">第 8-12 位<br/>流水号</div><div className="font-mono font-bold text-2xl text-blue-600">{codeBreakdown.sequence}</div></div>
              <div className="bg-gray-50 p-4 rounded border"><div className="text-xs text-gray-600">第 13 位<br/>版本</div><div className="font-mono font-bold text-2xl text-blue-600">{codeBreakdown.version}</div></div>
            </div>
          )}
        </div>
      )}

      {/* 编码记录表格 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">编码记录</h2>
          <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="搜索..." className="border rounded px-3 py-2 text-sm"/>
        </div>
        <table className="w-full"><thead><tr className="border-t border-b">
          <th className="text-left p-3">编码</th><th className="text-left p-3">物料名称</th><th className="text-left p-3">项目名称</th>
          <th className="text-left p-3">大类</th><th className="text-left p-3">分类</th><th className="text-left p-3">子类</th><th className="text-left p-3">工艺</th>
          <th className="text-left p-3">流水号</th><th className="text-left p-3">版本</th><th className="text-left p-3">时间</th><th className="text-left p-3">操作</th>
        </tr></thead><tbody>
          {filteredRecords.length === 0 ? <tr><td colSpan={11} className="text-center p-8 text-gray-500">暂无记录</td></tr> :
            filteredRecords.map(record => (<tr key={record.record_id} className="border-t hover:bg-gray-50">
              <td className="p-3 font-mono text-blue-600">{record.code}</td><td className="p-3">{record.material_name}</td>
              <td className="p-3">{record.project_name||'-'}</td><td className="p-3">{record.rule_name||'-'}</td>
              <td className="p-3">{record.second_category_name||'-'}</td><td className="p-3">{record.third_category_name||'-'}</td>
              <td className="p-3">{record.process_category_name||'-'}</td><td className="p-3 font-mono">{String(record.sequence_number).padStart(5,'0')}</td>
              <td className="p-3 font-mono">{record.version}</td><td className="p-3 text-sm">{new Date(record.created_at).toLocaleString('zh-CN')}</td>
              <td className="p-3"><button className="text-blue-500" onClick={()=>handleEditRecord(record)}>编辑</button>
                <button className="text-green-500 ml-2" onClick={()=>handleChangeVersion(record)}>变更</button>
                <button className="text-red-500 ml-2" onClick={()=>handleDeleteRecord(record.record_id)}>删除</button>
              </td>
            </tr>))}
        </tbody></table>
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded p-6 w-96"><h3 className="text-lg font-semibold mb-4">编辑物料名称</h3>
          <input type="text" value={editMaterialName} onChange={(e)=>setEditMaterialName(e.target.value)} className="w-full border rounded p-2 mb-4"/>
          <div className="flex justify-end gap-2"><button onClick={()=>setShowEditModal(false)} className="border px-4 py-2 rounded">取消</button>
            <button onClick={handleSaveEdit} className="bg-blue-500 text-white px-4 py-2 rounded">保存</button></div></div></div>)}

      {/* 版本变更弹窗 */}
      {showVersionChangeModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded p-6 w-96"><h3 className="text-lg font-semibold mb-4">变更版本</h3>
          <p className="text-sm mb-4">当前编码：<span className="font-mono text-blue-600">{changingVersionRecord?.code}</span></p>
          <label className="block text-sm mb-1">新版本号：</label>
          <select value={newVersion} onChange={(e)=>setNewVersion(e.target.value)} className="w-full border rounded p-2 mb-4">
            {Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).map(l=><option key={l} value={l}>{l}</option>)}
          </select>
          <label className="block text-sm mb-1">变更原因：</label>
          <textarea value={versionChangeReason} onChange={(e)=>setVersionChangeReason(e.target.value)} className="w-full border rounded p-2 mb-4" rows={3}/>
          <div className="flex justify-end gap-2"><button onClick={()=>{setShowVersionChangeModal(false);setVersionChangeReason('')}} className="border px-4 py-2 rounded">取消</button>
            <button onClick={handleSaveVersionChange} disabled={!newVersion||!versionChangeReason.trim()} className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50">确认变更</button></div></div></div>)}
    </div>
  );
}
