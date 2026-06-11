# 快速开始指南

本指南将帮助你在10分钟内运行项目管理系统移动端APP。

## Windows用户

### 步骤1: 安装必需软件

1. **Node.js**
   - 下载: https://nodejs.org/
   - 安装LTS版本 (推荐18.x)
   - 安装后重启命令行

2. **JDK 11**
   - 下载: https://adoptium.net/
   - 选择 Temurin 11 版本
   - 安装后配置JAVA_HOME环境变量

3. **Android Studio**
   - 下载: https://developer.android.com/studio
   - 安装后打开SDK Manager
   - 安装 Android 13.0 (API 33)
   - 安装 Android SDK Build-Tools 33.0.0

4. **配置环境变量**
   - 添加到Path: `%ANDROID_HOME%\platform-tools`
   - 添加到Path: `%ANDROID_HOME%\emulator`

### 步骤2: 安装项目依赖

```bash
# 进入项目目录
cd mobile-app

# 安装依赖
pnpm install
```

### 步骤3: 配置API地址

编辑 `src/services/api.ts`，修改BASE_URL:

```typescript
// 开发环境 - 使用你的电脑局域网IP
const BASE_URL = 'http://192.168.1.100:5000/api';

// 查看你的IP地址:
# Windows: ipconfig
# 查找 "IPv4 地址"
```

### 步骤4: 启动模拟器或连接真机

**使用模拟器:**
```bash
# 在Android Studio中启动模拟器
# 或使用命令行
emulator -avd <模拟器名称>
```

**使用真机:**
1. 在手机设置中开启"开发者选项"
2. 开启"USB调试"
3. 用USB连接手机
4. 允许USB调试授权

### 步骤5: 运行应用

```bash
# 在项目根目录打开第一个命令行窗口
pnpm start

# 在第二个命令行窗口
pnpm android
```

### 步骤6: 打包APK

```bash
# 构建Debug APK (用于测试)
scripts\build-android.bat debug

# 构建Release APK (用于发布)
scripts\build-android.bat release

# APK文件位置:
# android\app\build\outputs\apk\debug\app-debug.apk
# android\app\build\outputs\apk\release\app-release.apk
```

## macOS用户

### 步骤1: 安装必需软件

1. **Node.js**
   ```bash
   brew install node
   ```

2. **JDK 11**
   ```bash
   brew install openjdk@11
   ```

3. **Xcode**
   - 从Mac App Store安装Xcode
   - 安装命令行工具: `xcode-select --install`

4. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

5. **Android Studio** (如需打包Android版本)
   - 下载: https://developer.android.com/studio
   - 按照Windows用户的步骤2-4安装

### 步骤2: 安装项目依赖

```bash
cd mobile-app
pnpm install
```

### 步骤3: 安装iOS依赖

```bash
cd ios
pod install
cd ..
```

### 步骤4: 配置API地址

编辑 `src/services/api.ts`:

```typescript
// 开发环境
const BASE_URL = 'http://192.168.1.100:5000/api';

# 查看你的IP地址:
# macOS: ifconfig | grep "inet "
# 查找 "inet " 后面的IP地址
```

### 步骤5: 运行应用

**iOS模拟器:**
```bash
# 启动Metro bundler
pnpm start

# 运行iOS应用 (在新终端)
pnpm ios
```

**Android:**
```bash
# 启动Metro bundler
pnpm start

# 运行Android应用 (在新终端)
pnpm android
```

### 步骤6: 打包应用

**Android:**
```bash
./scripts/build-android.sh release
```

**iOS:**
```bash
./scripts/build-ios.sh archive
./scripts/build-ios.sh export
```

## 常见问题

### 问题1: npm install失败

```bash
# 尝试使用legacy-peer-deps
pnpm install --legacy-peer-deps
```

### 问题2: Metro服务器启动失败

```bash
# 清理缓存
pnpm start -- --reset-cache
```

### 问题3: Android构建失败

```bash
# 清理Gradle缓存
cd android
./gradlew clean
cd ..
```

### 问题4: iOS Pods安装失败

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### 问题5: 设备连接失败

```bash
# 重启ADB
adb kill-server
adb start-server

# 查看设备
adb devices
```

## 后续步骤

1. ✅ 应用已成功运行
2. 📖 阅读完整文档: [README.md](./README.md)
3. 🔨 查看打包指南: [BUILD_GUIDE.md](./BUILD_GUIDE.md)
4. 🚀 开始自定义和开发

## 需要帮助?

- 查看完整文档: [BUILD_GUIDE.md](./BUILD_GUIDE.md)
- 提交Issue: [GitHub Issues]
- 联系支持: support@example.com

---

**祝你开发愉快！** 🎉
