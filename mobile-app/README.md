# 项目管理系统 - 移动端APP

基于React Native开发的跨平台移动应用，提供项目管理、任务管理、客户管理、合同管理、订单管理、产品管理等功能。

## 功能特性

### 核心功能
- ✅ 用户登录/登出
- ✅ 项目管理 (创建、查看、编辑、删除)
- ✅ 任务管理 (查看详情、更新状态)
- ✅ 客户管理
- ✅ 合同管理
- ✅ 订单管理
- ✅ 产品管理
- ✅ 消息中心
- ✅ 审批中心
- ✅ 个人中心

### 技术特性
- 🔐 JWT认证
- 📱 跨平台支持 (iOS & Android)
- 🎨 现代化UI设计
- 🌓 深色模式支持
- 📤 离线数据缓存
- 🔄 实时数据同步
- 📷 二维码扫描
- 📋 消息推送

## 技术栈

### 核心框架
- **React Native** 0.72.6
- **React** 18.2.0
- **TypeScript** 5.2.2

### 导航
- React Navigation 6.x
- Stack Navigator
- Bottom Tabs Navigator
- Native Stack Navigator

### UI组件
- React Native Vector Icons
- React Native Modal
- React Native Picker Select
- React Native Date Picker
- React Native Linear Gradient
- React Native SVG

### 功能库
- Axios (HTTP客户端)
- AsyncStorage (本地存储)
- React Native Camera (相机)
- React Native Permissions (权限管理)
- React Native QR Code SVG (二维码生成)

## 快速开始

### 环境要求

- Node.js >= 16.0
- Python >= 3.8 (Android)
- JDK 11
- Android Studio (Android)
- Xcode 14+ (iOS, 仅macOS)

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd mobile-app

# 安装依赖
pnpm install

# iOS需要额外安装CocoaPods依赖 (仅macOS)
cd ios
pod install
cd ..
```

### 配置API地址

编辑 `src/services/api.ts`:

```typescript
// 开发环境 (使用局域网IP)
const BASE_URL = 'http://192.168.1.100:5000/api';

// 生产环境
const BASE_URL = 'https://your-production-domain.com/api';
```

### 启动开发服务器

```bash
# 启动Metro bundler
pnpm start

# 在另一个终端运行应用
# Android
pnpm android

# iOS (仅macOS)
pnpm ios
```

## 项目结构

```
mobile-app/
├── android/                 # Android原生代码和配置
│   ├── app/
│   │   ├── build.gradle     # 应用级构建配置
│   │   └── src/
│   │       └── main/
│   │           ├── AndroidManifest.xml
│   │           ├── java/    # Java源代码
│   │           └── res/     # 资源文件
│   ├── build.gradle         # 项目级构建配置
│   └── gradle.properties    # Gradle属性
├── ios/                     # iOS原生代码和配置
│   ├── Podfile             # CocoaPods依赖配置
│   └── ProjectManagementMobile/
│       ├── AppDelegate.h/mm
│       ├── Info.plist      # 应用配置
│       └── .xcodeproj/     # Xcode项目文件
├── scripts/                 # 自动化脚本
│   ├── build-android.sh    # Android构建脚本
│   ├── build-android.bat   # Windows版Android构建脚本
│   └── build-ios.sh        # iOS构建脚本
├── src/                     # React Native源代码
│   ├── components/         # 可复用组件
│   ├── navigation/         # 导航配置
│   ├── screens/           # 页面组件
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ProjectsScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── CustomersScreen.tsx
│   │   ├── ContractsScreen.tsx
│   │   ├── OrdersScreen.tsx
│   │   ├── ProductsScreen.tsx
│   │   ├── ApprovalsScreen.tsx
│   │   ├── MessagesScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/          # 服务层
│   │   └── api.ts         # API服务
│   ├── types/             # TypeScript类型定义
│   │   └── index.ts
│   └── utils/             # 工具函数
│       └── helpers.ts
├── App.tsx                 # 应用入口
├── app.config.json         # 应用配置
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript配置
├── babel.config.js         # Babel配置
├── metro.config.js         # Metro配置
└── README.md               # 项目说明
```

## 开发指南

### 添加新页面

1. 在 `src/screens/` 创建新页面组件:

```typescript
import React from 'react';
import { View, Text } from 'react-native';

export default function NewScreen() {
  return (
    <View>
      <Text>New Screen</Text>
    </View>
  );
}
```

2. 在 `src/navigation/AppNavigator.tsx` 中注册路由:

```typescript
import NewScreen from '../screens/NewScreen';

<Stack.Screen
  name="New"
  component={NewScreen}
  options={{ title: '新页面' }}
/>
```

### 调用API

```typescript
import { api } from '../services/api';

// GET请求
const fetchData = async () => {
  try {
    const response = await api.get('/projects');
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// POST请求
const createProject = async (data) => {
  try {
    const response = await api.post('/projects', data);
    return response.data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 本地存储

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 保存数据
const saveData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

// 读取数据
const loadData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
};
```

## 打包发布

详细的打包指南请参考 [BUILD_GUIDE.md](./BUILD_GUIDE.md)。

### 快速打包命令

#### Android

```bash
# 构建Debug APK
./scripts/build-android.sh debug

# 构建Release APK
./scripts/build-android.sh release

# 构建App Bundle (AAB)
./scripts/build-android.sh bundle

# 安装到设备
./scripts/build-android.sh install

# 清理构建
./scripts/build-android.sh clean
```

#### iOS (仅macOS)

```bash
# 运行Debug版本
./scripts/build-ios.sh debug

# 归档应用
./scripts/build-ios.sh archive

# 导出IPA
./scripts/build-ios.sh export

# 安装依赖
./scripts/build-ios.sh install
```

## 配置说明

### 应用配置 (app.config.json)

```json
{
  "appName": "项目管理系统",
  "appId": "com.projectmanagement.app",
  "version": "1.0.0",
  "buildNumber": 1,
  "api": {
    "baseUrl": "http://localhost:5000/api",
    "timeout": 30000
  },
  "features": {
    "enableNotifications": false,
    "enableOfflineMode": false,
    "enableBiometricLogin": false
  },
  "theme": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#667eea",
    "backgroundColor": "#F5F5F5",
    "textColor": "#333333",
    "darkMode": true
  }
}
```

### Android签名配置

编辑 `android/gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

### iOS配置

在Xcode中配置:
1. 选择项目
2. 在 "Signing & Capabilities" 选项卡中配置签名团队
3. 选择 Bundle Identifier
4. 配置版本号和Build号

## 常见问题

### Metro服务器启动失败

```bash
# 清理Metro缓存
pnpm start -- --reset-cache

# 或清理node_modules
rm -rf node_modules
pnpm install
```

### Android构建失败

```bash
# 清理Gradle缓存
cd android
./gradlew clean
cd ..
```

### iOS依赖安装失败

```bash
cd ios
pod deintegrate
pod install
cd ..
```

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用 MIT 许可证。

## 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 邮箱: support@example.com

## 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- ✅ 实现核心功能模块
- ✅ 支持iOS和Android平台
- ✅ 集成API服务和本地存储
- 🎨 完善UI/UX设计

---

**如有问题或建议，欢迎提交Issue或Pull Request！**
