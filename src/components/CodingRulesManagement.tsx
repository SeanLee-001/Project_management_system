"use client";

import { useState, useEffect } from "react";

interface CodingRule {
  id: string;
  category_name: string;
  category_code: string;
  first_digit: string;
  second_digit_range?: string;
  third_fourth_digit_range?: string;
  fifth_ninth_digit_range?: string;
  tenth_digit_range?: string;
  eleventh_digit_range?: string;
  total_length: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CodingCategory {
  id: string;
  rule_id: string;
  category_level: string;
  code: string;
  name: string;
  description?: string;
  parent_id: string | null;
  sequence_start: string;
  sequence_current: string;
  is_active: boolean;
}

export default function CodingRulesManagement() {
  const [rules, setRules] = useState<CodingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CodingRule | null>(null);
  const [categories, setCategories] = useState<CodingCategory[]>([]);

  // 分类表单状态
  const [categoryForm, setCategoryForm] = useState({
    category_level: "major",
    code: "",
    name: "",
    description: "",
    parent_id: "",
    sequence_start: "1",
    sequence_current: "1",
    is_active: true,
  });
  const [editingCategory, setEditingCategory] = useState<CodingCategory | null>(null);

  // 表单状态
  const [ruleForm, setRuleForm] = useState({
    category_name: "",
    category_code: "",
    first_digit: "",
    second_digit_range: "",
    third_fourth_digit_range: "",
    fifth_ninth_digit_range: "",
    tenth_digit_range: "",
    eleventh_digit_range: "",
    total_length: "11",
    description: "",
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/coding-rules");
      const json = await res.json();
      if (json.success) {
        setRules(json.data);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/coding-categories?ruleId=${ruleId}`);
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/coding-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });

      if (res.ok) {
        await fetchRules();
        setShowRuleModal(false);
        resetRuleForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating rule:", error);
      alert("创建失败");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("确定要删除此编码规则吗？")) return;
    try {
      const res = await fetch(`/api/coding-rules/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchRules();
        setSelectedRule(null);
      } else {
        const json = await res.json();
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      alert("删除失败");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;

    try {
      const res = await fetch("/api/coding-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...categoryForm,
          rule_id: selectedRule.id,
          parent_id: categoryForm.parent_id || null,
        }),
      });

      if (res.ok) {
        await fetchCategories(selectedRule.id);
        setShowCategoryModal(false);
        resetCategoryForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      alert("创建失败");
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const res = await fetch("/api/coding-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory.id,
          code: categoryForm.code,
          name: categoryForm.name,
          description: categoryForm.description,
          parent_id: categoryForm.parent_id || null,
          sequence_start: categoryForm.sequence_start,
          sequence_current: categoryForm.sequence_current,
          is_active: categoryForm.is_active,
        }),
      });

      if (res.ok) {
        if (selectedRule) {
          await fetchCategories(selectedRule.id);
        }
        setShowCategoryModal(false);
        setEditingCategory(null);
        resetCategoryForm();
      } else {
        const json = await res.json();
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("更新失败");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("确定要删除此分类吗？")) return;
    try {
      const res = await fetch(`/api/coding-categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (selectedRule) {
          await fetchCategories(selectedRule.id);
        }
      } else {
        const json = await res.json();
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("删除失败");
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      category_name: "",
      category_code: "",
      first_digit: "",
      second_digit_range: "",
      third_fourth_digit_range: "",
      fifth_ninth_digit_range: "",
      tenth_digit_range: "",
      eleventh_digit_range: "",
      total_length: "11",
      description: "",
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      category_level: "major",
      code: "",
      name: "",
      description: "",
      parent_id: "",
      sequence_start: "1",
      sequence_current: "1",
      is_active: true,
    });
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    resetCategoryForm();
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: CodingCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      category_level: category.category_level,
      code: category.code,
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id || "",
      sequence_start: category.sequence_start,
      sequence_current: category.sequence_current,
      is_active: category.is_active,
    });
    setShowCategoryModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            编码规则管理
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            管理产品编码规则和分类
          </p>
        </div>
        <button
          onClick={() => {
            resetRuleForm();
            setShowRuleModal(true);
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          新建编码规则
        </button>
      </div>

      {/* 编码规则列表 */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rule.category_name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {rule.is_active ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">编码格式：</span>
                      {rule.first_digit}
                      {rule.second_digit_range && ` ${rule.second_digit_range}`}
                      {rule.third_fourth_digit_range && ` ${rule.third_fourth_digit_range}`}
                      {rule.fifth_ninth_digit_range && ` ${rule.fifth_ninth_digit_range}`}
                      {rule.tenth_digit_range && ` ${rule.tenth_digit_range}`}
                      {rule.eleventh_digit_range && ` ${rule.eleventh_digit_range}`}
                    </div>
                    {rule.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rule.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRule(rule);
                        fetchCategories(rule.id);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      查看分类
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 分类列表 */}
                {selectedRule && selectedRule.id === rule.id && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        分类列表
                      </h4>
                      <button
                        onClick={openAddCategoryModal}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        添加分类
                      </button>
                    </div>
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        暂无分类
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          // 构建层级结构
                          const majorCategories = categories.filter(cat => cat.category_level === 'major');
                          return majorCategories.map((majorCat) => {
                            const subCategories = categories.filter(cat =>
                              cat.category_level === 'sub' && cat.parent_id === majorCat.id
                            );
                            return (
                              <div
                                key={majorCat.id}
                                className="border border-gray-200 rounded-lg overflow-hidden dark:border-gray-700"
                              >
                                {/* 大类 */}
                                <div className="bg-gray-100 p-3 dark:bg-gray-700">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                                        大类
                                      </span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {majorCat.code} - {majorCat.name}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openEditCategoryModal(majorCat)}
                                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(majorCat.id)}
                                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                                      >
                                        删除
                                      </button>
                                    </div>
                                  </div>
                                  {majorCat.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {majorCat.description}
                                    </p>
                                  )}
                                </div>

                                {/* 子类列表 */}
                                {subCategories.length > 0 && (
                                  <div className="p-2 space-y-2">
                                    {subCategories.map((subCat) => {
                                      const materialCategories = categories.filter(cat =>
                                        cat.category_level === 'material' && cat.parent_id === subCat.id
                                      );
                                      return (
                                        <div
                                          key={subCat.id}
                                          className="border-l-4 border-green-400 pl-3 dark:border-green-600"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                                                子类
                                              </span>
                                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {subCat.code} - {subCat.name}
                                              </span>
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => openEditCategoryModal(subCat)}
                                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                              >
                                                编辑
                                              </button>
                                              <button
                                                onClick={() => handleDeleteCategory(subCat.id)}
                                                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                                              >
                                                删除
                                              </button>
                                            </div>
                                          </div>
                                          {subCat.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-16">
                                              {subCat.description}
                                            </p>
                                          )}

                                          {/* 材质列表 */}
                                          {materialCategories.length > 0 && (
                                            <div className="ml-4 mt-2 space-y-1">
                                              {materialCategories.map((materialCat) => (
                                                <div
                                                  key={materialCat.id}
                                                  className="flex items-center justify-between py-1"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">
                                                      材质
                                                    </span>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                      {materialCat.code} - {materialCat.name}
                                                    </span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => openEditCategoryModal(materialCat)}
                                                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                                    >
                                                      编辑
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteCategory(materialCat.id)}
                                                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                                                    >
                                                      删除
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* 独立的材质（没有父类的材质） */}
                                {(() => {
                                  const standaloneMaterials = categories.filter(cat =>
                                    cat.category_level === 'material' &&
                                    !cat.parent_id &&
                                    cat.rule_id === selectedRule!.id
                                  );
                                  if (standaloneMaterials.length === 0) return null;
                                  return (
                                    <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                        独立材质
                                      </div>
                                      {standaloneMaterials.map((materialCat) => (
                                        <div
                                          key={materialCat.id}
                                          className="flex items-center justify-between py-1"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">
                                              材质
                                            </span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                              {materialCat.code} - {materialCat.name}
                                            </span>
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => openEditCategoryModal(materialCat)}
                                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                            >
                                              编辑
                                            </button>
                                            <button
                                              onClick={() => handleDeleteCategory(materialCat.id)}
                                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                                            >
                                              删除
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* 新建编码规则弹窗 */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 dark:bg-black/70 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto rounded-lg bg-white shadow-lg dark:bg-gray-800 flex flex-col max-h-[95vh]">
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                新建编码规则
              </h2>
            </div>
            <form onSubmit={handleCreateRule} className="flex flex-col max-h-[85vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    类别名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleForm.category_name}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, category_name: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    类别代码 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={1}
                    value={ruleForm.category_code}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, category_code: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    第一位 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={1}
                    value={ruleForm.first_digit}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, first_digit: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    第二位范围
                  </label>
                  <input
                    type="text"
                    value={ruleForm.second_digit_range}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, second_digit_range: e.target.value })
                    }
                    placeholder="如：01-99"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    第三四位范围
                  </label>
                  <input
                    type="text"
                    value={ruleForm.third_fourth_digit_range}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        third_fourth_digit_range: e.target.value,
                      })
                    }
                    placeholder="如：01-99"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    第五九位范围
                  </label>
                  <input
                    type="text"
                    value={ruleForm.fifth_ninth_digit_range}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        fifth_ninth_digit_range: e.target.value,
                      })
                    }
                    placeholder="如：00001-99999"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    第十位范围
                  </label>
                  <input
                    type="text"
                    value={ruleForm.tenth_digit_range}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        tenth_digit_range: e.target.value,
                      })
                    }
                    placeholder="如：1-9"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    第十一位范围
                  </label>
                  <input
                    type="text"
                    value={ruleForm.eleventh_digit_range}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        eleventh_digit_range: e.target.value,
                      })
                    }
                    placeholder="如：A-Z"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    编码总长度 *
                  </label>
                  <input
                    type="number"
                    required
                    value={ruleForm.total_length}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        total_length: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    描述
                  </label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex-none p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRuleModal(false);
                      resetRuleForm();
                    }}
                    className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto rounded-md bg-red-600 px-4 py-3 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 font-medium shadow-sm"
                  >
                    创建
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 添加/编辑分类弹窗 */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 dark:bg-black/70 overflow-y-auto">
          <div className="w-full max-w-md my-auto rounded-lg bg-white shadow-lg dark:bg-gray-800 flex flex-col max-h-[95vh]">
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCategory ? "编辑分类" : "添加分类"}
              </h2>
            </div>
            <form
              onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
              className="flex flex-col max-h-[85vh]"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    分类级别 *
                  </label>
                  <select
                    required
                    value={categoryForm.category_level}
                    onChange={(e) => {
                      setCategoryForm({
                        ...categoryForm,
                        category_level: e.target.value,
                        parent_id: "",
                      });
                    }}
                    disabled={!!editingCategory}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="major">大类</option>
                    <option value="sub">子类</option>
                    <option value="material">材质</option>
                  </select>
                </div>

                {/* 父类选择 - 仅在子类或材质时显示 */}
                {(categoryForm.category_level === 'sub' || categoryForm.category_level === 'material') && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {categoryForm.category_level === 'sub' ? '所属大类' : '所属子类'} *
                    </label>
                    <select
                      required
                      value={categoryForm.parent_id}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          parent_id: e.target.value,
                        })
                      }
                      disabled={!!editingCategory}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">请选择{categoryForm.category_level === 'sub' ? '大类' : '子类'}</option>
                      {(() => {
                        const parentLevel = categoryForm.category_level === 'sub' ? 'major' : 'sub';
                        return categories
                          .filter(cat => cat.category_level === parentLevel)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.code} - {cat.name}
                            </option>
                          ));
                      })()}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    分类代码 *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.code}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, code: e.target.value })
                    }
                    placeholder="如：01"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    分类名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    placeholder="如：有源模块"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    描述
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="分类描述"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    流水号起始值
                  </label>
                  <input
                    type="text"
                    value={categoryForm.sequence_start}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        sequence_start: e.target.value,
                      })
                    }
                    placeholder="如：1"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    当前流水号
                  </label>
                  <input
                    type="text"
                    value={categoryForm.sequence_current}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        sequence_current: e.target.value,
                      })
                    }
                    placeholder="如：1"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={categoryForm.is_active}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        is_active: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-red-600 focus:ring-red-600 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    启用
                  </label>
                </div>
              </div>
              <div className="flex-none p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                      resetCategoryForm();
                    }}
                    className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto rounded-md bg-red-600 px-4 py-3 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 font-medium shadow-sm"
                  >
                    {editingCategory ? "保存" : "创建"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
