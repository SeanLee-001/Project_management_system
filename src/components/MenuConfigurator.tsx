"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// 菜单项定义
export interface MenuItem {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // 是否必需显示（不可隐藏）
}

// 默认菜单配置
export const defaultMenuItems: MenuItem[] = [
  { id: "dashboard", label: "项目看板", visible: true },
  { id: "projects", label: "项目列表", visible: true },
  { id: "tasks", label: "项目详情", visible: true },
  { id: "contracts", label: "合同管理", visible: true },
  { id: "orders_dashboard", label: "订单看板", visible: true },
  { id: "orders", label: "订单管理", visible: true },
  { id: "customers", label: "客户管理", visible: true },
  { id: "products", label: "产品管理", visible: true },
  { id: "users", label: "用户管理", visible: true },
  { id: "permissions", label: "权限管理", visible: true },
  { id: "messages", label: "消息中心", visible: true },
  { id: "system_logs", label: "系统日志", visible: true },
];

interface MenuConfiguratorProps {
  userId: string;
  userRole: string;
  onSave?: (config: MenuItem[]) => void;
  onCancel?: () => void;
}

export default function MenuConfigurator({ userId, userRole, onSave, onCancel }: MenuConfiguratorProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 根据用户角色过滤菜单项
  const getAvailableMenuItems = (): MenuItem[] => {
    return defaultMenuItems.map(item => {
      // 系统管理员可以访问所有菜单
      if (userRole === "system_admin") {
        return { ...item };
      }

      // 其他用户：users和permissions菜单不可见
      if (item.id === "users" || item.id === "permissions") {
        return { ...item, visible: false };
      }

      // 系统日志：只有系统管理员、部门经理、项目经理可见
      if (item.id === "system_logs" && !["system_admin", "department_manager", "project_manager"].includes(userRole)) {
        return { ...item, visible: false };
      }

      return { ...item };
    });
  };

  // 加载用户的菜单配置
  useEffect(() => {
    loadMenuConfiguration();
  }, [userId]);

  const loadMenuConfiguration = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/menu-configuration`, { credentials: "include" });
      const json = await res.json();

      if (json.success && json.data) {
        // 合并用户配置和默认配置
        const userConfig = JSON.parse(json.data);
        const mergedItems = defaultMenuItems.map(defaultItem => {
          const userItem = userConfig.find((item: MenuItem) => item.id === defaultItem.id);
          if (userItem) {
            return { ...defaultItem, visible: userItem.visible };
          }
          return defaultItem;
        });

        // 重新排序以匹配用户的顺序
        const sortedItems: MenuItem[] = [];
        userConfig.forEach((userItem: MenuItem) => {
          const item = mergedItems.find(i => i.id === userItem.id);
          if (item) sortedItems.push(item);
        });
        // 添加新项目（如果有）
        mergedItems.forEach(item => {
          if (!sortedItems.find(i => i.id === item.id)) {
            sortedItems.push(item);
          }
        });

        setMenuItems(sortedItems);
      } else {
        // 使用默认配置
        setMenuItems(getAvailableMenuItems());
      }
    } catch (error) {
      console.error("加载菜单配置失败:", error);
      setMenuItems(getAvailableMenuItems());
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMenuItems(items);
  };

  const handleToggleVisibility = (id: string) => {
    setMenuItems(items =>
      items.map(item =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/menu-configuration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          menuConfiguration: JSON.stringify(menuItems),
        }),
      });

      const json = await res.json();

      if (json.success) {
        alert("菜单配置保存成功！");
        onSave?.(menuItems);
      } else {
        alert("保存失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("保存菜单配置失败:", error);
      alert("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("确定要重置为默认菜单配置吗？")) {
      setMenuItems(getAvailableMenuItems());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">菜单配置</h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            重置默认
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              取消
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isSaving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          提示：拖拽菜单项可调整显示顺序，勾选复选框可控制菜单项的显示/隐藏。
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="menu-items">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {menuItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between p-4 bg-white border-2 rounded-lg transition-all ${
                        snapshot.isDragging
                          ? "border-blue-500 shadow-lg"
                          : "border-gray-200 dark:border-gray-700 dark:bg-gray-800"
                      } ${!item.visible ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <input
                          type="checkbox"
                          checked={item.visible}
                          onChange={() => handleToggleVisibility(item.id)}
                          disabled={item.required}
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.label}
                        </span>
                        {item.required && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">(必需)</span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ID: {item.id}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.visible ? "可见" : "隐藏"}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          注意：某些菜单项可能因权限限制而不可见。隐藏的菜单项在页面上不会显示。
        </p>
      </div>
    </div>
  );
}
