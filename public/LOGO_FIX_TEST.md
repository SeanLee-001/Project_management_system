# 公司Logo上传显示问题修复说明

## 问题诊断

### 原因分析

1. **代理接口路由参数配置错误**
   - 上传接口返回的 `proxyUrl` 格式为：`/api/images/uploads/timestamp_random.jpg`
   - 代理接口使用 `[key]` 动态路由，只能匹配单层路径（如 `/api/images/abc.jpg`）
   - 当路径包含 `/` 时（如 `/api/images/uploads/abc.jpg`），Next.js 只会捕获第一个路径段 `uploads`，导致无法正确访问图片

2. **Admin页面缺少URL转换**
   - `admin/page.tsx` 在获取系统设置后，没有对 Logo URL 进行 `convertToProxyUrl` 转换
   - 可能导致某些情况下 Logo 无法正确显示

3. **IconUpload组件预览更新问题**
   - 当 `currentIconUrl` 从外部更新时，预览图片不会自动更新

## 修复内容

### 1. 修复代理接口路由参数 (`src/app/api/images/[...key]/route.ts`)

**修改前：**
```typescript
// 路由文件：[key]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  // ...
}
```

**修改后：**
```typescript
// 路由文件：[...key]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string | string[] }> }
) {
  const { key: keyParam } = await params;
  // key 可能是字符串（单层路径）或数组（多层路径）
  const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
  // ...
}
```

**关键变化：**
- 目录从 `[key]` 重命名为 `[...key]`（捕获所有路径段）
- 参数类型从 `string` 改为 `string | string[]`
- 添加数组处理逻辑，将多路径段用 `/` 连接

### 2. 在 Admin 页面添加 URL 转换 (`src/app/admin/page.tsx`)

**修改内容：**
```typescript
// 导入转换函数
import { convertToProxyUrl } from "@/lib/imageUtils";

// 在 fetchSystemSettings 中添加转换
if (res.ok) {
  const json = await res.json();
  const settings = json.data || {};
  
  // 转换图片 URL 为代理格式
  if (settings.companyLogo) {
    settings.companyLogo = convertToProxyUrl(settings.companyLogo);
  }
  
  setSystemSettings(settings);
}
```

### 3. 修复 IconUpload 组件预览更新 (`src/components/IconUpload.tsx`)

**修改内容：**
```typescript
// 导入 useEffect
import { useState, useRef, useEffect } from "react";

// 添加 useEffect 监听 currentIconUrl 变化
useEffect(() => {
  setPreviewUrl(currentIconUrl || "");
}, [currentIconUrl]);
```

## 测试验证

### 测试步骤

1. **上传测试**
   - 登录后台管理系统（http://localhost:5000/admin）
   - 进入"系统设置"
   - 上传一张公司Logo图片
   - 检查是否成功上传并显示预览

2. **显示测试**
   - 刷新页面，检查 Logo 是否正确显示
   - 访问应用端（http://localhost:5000/app），检查 Logo 是否正确显示
   - 再次返回后台管理，检查 Logo 是否正确显示

3. **代理接口测试**
   - 打开浏览器开发者工具 Network 标签
   - 观察 Logo 图片请求路径
   - 应该看到请求路径为：`/api/images/uploads/timestamp_random.jpg`
   - 状态码应为 302（重定向到签名URL）

### 预期结果

- ✅ 上传成功后立即显示预览
- ✅ 刷新页面后 Logo 正确显示
- ✅ 后台管理和应用端 Logo 显示一致
- ✅ Network 中可以看到正确的代理请求路径

## 技术说明

### Next.js 动态路由

- `[param]`：匹配单层路径，如 `/api/images/abc` → param = "abc"
- `[...param]`：匹配多层路径，如 `/api/images/uploads/abc.jpg` → param = ["uploads", "abc.jpg"]

### 图片代理流程

```
上传流程：
用户上传 → /api/upload → 返回 proxyUrl: /api/images/uploads/xxx.jpg
                                    ↓
                            保存到数据库

显示流程：
数据库读取 → /api/images/uploads/xxx.jpg → 生成签名URL → 302重定向 → 显示图片
```

## 相关文件

- `/workspace/projects/src/app/api/upload/route.ts` - 上传接口
- `/workspace/projects/src/app/api/images/[...key]/route.ts` - 图片代理接口
- `/workspace/projects/src/app/api/settings/route.ts` - 系统设置接口
- `/workspace/projects/src/app/admin/page.tsx` - 后台管理页面
- `/workspace/projects/src/app/app/page.tsx` - 应用端页面
- `/workspace/projects/src/components/IconUpload.tsx` - 图标上传组件
- `/workspace/projects/src/lib/imageUtils.ts` - 图片URL转换工具

## 修复时间

2026-03-27
