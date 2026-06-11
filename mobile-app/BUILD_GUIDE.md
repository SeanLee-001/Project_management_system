# 项目管理系统 - 移动端APP完整打包指南

本指南将帮助你从零开始构建项目管理系统移动端APP。

## 目录

- [前置条件](#前置条件)
- [快速开始](#快速开始)
- [Android打包](#android打包)
- [iOS打包](#ios打包)
- [签名与发布](#签名与发布)
- [常见问题](#常见问题)
- [自动化脚本](#自动化脚本)

---

## 前置条件

### 必需软件

#### 1. Node.js
```bash
# 检查版本
node --version  # 需要 >= 16.0

# 如果未安装，从 https://nodejs.org 下载安装
```

#### 2. Python (Windows必须)
```bash
# 检查版本
python --version  # 需要 >= 3.8

# 如果未安装，从 https://www.python.org/downloads 下载安装
# 安装时勾选 "Add Python to PATH"
```

#### 3. JDK (Java Development Kit)
```bash
# 检查版本
java -version  # 需要 JDK 11

# 如果未安装：
# - Windows: 从 https://adoptium.net/ 下载 JDK 11
# - macOS: brew install openjdk@11
# - Linux: sudo apt install openjdk-11-jdk
```

#### 4. Android Studio
```bash
# 下载地址: https://developer.android.com/studio
# 安装后需要:
# 1. 打开 Android Studio
# 2. 进入 SDK Manager (Appearance & Behavior > System Settings > Android SDK)
# 3. 在 SDK Platforms 选项卡中安装:
#    - Android 13.0 (API 33)
# 4. 在 SDK Tools 选项卡中安装:
#    - Android SDK Build-Tools 33.0.0
#    - Android Emulator
#    - Android SDK Platform-Tools
#    - Intel x86 Emulator Accelerator (HAXM installer) [Windows需要]
```

#### 5. Android SDK环境变量
```bash
# Windows - 添加到系统环境变量:
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
# 并在PATH中添加:
# %ANDROID_HOME%\platform-tools
# %ANDROID_HOME%\emulator
# %ANDROID_HOME%\tools
# %ANDROID_HOME%\tools\bin

# macOS/Linux - 添加到 ~/.bashrc 或 ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 可选软件 (iOS打包)

#### 1. macOS系统
- iOS打包必须在macOS系统上进行

#### 2. Xcode
```bash
# 从 Mac App Store 下载安装
# 需要版本 >= 14.0

# 检查安装
xcode-select --version
```

#### 3. CocoaPods
```bash
# 安装CocoaPods
sudo gem install cocoapods

# 检查版本
pod --version
```

#### 4. Ruby
```bash
# 检查版本
ruby --version

# macOS已自带，Linux可能需要安装
# Ubuntu: sudo apt install ruby-full
```

---

## 快速开始

### 步骤1: 安装项目依赖

```bash
# 进入项目目录
cd mobile-app

# 安装依赖
pnpm install

# 如果遇到依赖冲突，尝试:
pnpm install --legacy-peer-deps
```

### 步骤2: 配置API地址

编辑 `src/services/api.ts` 文件：

```typescript
// 找到这一行
const BASE_URL = 'http://localhost:5000/api';

// 修改为你的实际后端地址:
// 开发环境:
const BASE_URL = 'http://192.168.1.100:5000/api';  // 使用局域网IP

// 生产环境:
const BASE_URL = 'https://your-production-domain.com/api';
```

**提示**: 开发测试时，建议使用局域网IP地址，这样可以在真机上调试。

### 步骤3: 配置应用信息 (可选)

编辑 `app.config.json`:

```json
{
  "appName": "项目管理系统",
  "appId": "com.projectmanagement.app",
  "version": "1.0.0",
  "buildNumber": 1,
  "api": {
    "baseUrl": "http://localhost:5000/api",
    "timeout": 30000
  }
}
```

### 步骤4: 启动开发服务器

```bash
# 启动Metro bundler
pnpm start

# 或者使用yarn
yarn start

# 或使用npm
npm start
```

Metro bundler会在 http://localhost:8081 启动。

---

## Android打包

### 方法1: 使用Android Studio (推荐新手)

#### 1. 导入项目
```
1. 打开 Android Studio
2. 选择 File > Open
3. 浏览到 mobile-app/android 目录
4. 点击 OK
5. 等待Gradle同步完成 (首次可能需要几分钟)
```

#### 2. 连接真机或模拟器
```
真机调试:
1. 在手机设置中开启"开发者选项"和"USB调试"
2. 使用USB连接手机
3. 在手机上允许USB调试

使用模拟器:
1. 在Android Studio中点击 Device Manager
2. 创建新的虚拟设备
3. 选择设备型号 (推荐 Pixel 5)
4. 选择系统镜像 (API 33)
5. 完成创建并启动
```

#### 3. 调试运行
```
1. 在Android Studio顶部选择设备
2. 点击绿色的运行按钮 (▶)
3. 等待应用安装并启动
```

#### 4. 构建Debug APK
```
1. 在顶部菜单选择 Build > Build Bundle(s) / APK(s) > Build APK(s)
2. 等待构建完成
3. 点击通知中的 "locate"
4. APK文件位置:
   android/app/build/outputs/apk/debug/app-debug.apk
```

#### 5. 构建Release APK
```
1. 选择 Build > Generate Signed Bundle / APK
2. 选择 APK
3. 点击 Next

如果没有密钥库:
  选择 "Create new..." 创建新密钥库

如果有密钥库:
  1. 选择现有的密钥库文件 (.keystore)
  2. 输入密钥库密码、密钥别名、密钥密码
  3. 点击 Next

4. 选择 release 构建类型
5. 点击 Finish
6. 等待构建完成
7. 点击通知中的 "locate"
8. APK文件位置:
   android/app/build/outputs/apk/release/app-release.apk
```

### 方法2: 使用命令行 (推荐熟练用户)

#### 1. 检查设备连接
```bash
# 查看已连接的设备
adb devices

# 如果设备未显示:
# - 检查USB调试是否开启
# - 检查USB连接模式是否为"文件传输(MTP)"
# - 尝试重新连接USB
```

#### 2. 清理构建
```bash
cd android
./gradlew clean

# Windows用户:
gradlew.bat clean
```

#### 3. 构建Debug APK
```bash
# 构建debug版本
./gradlew assembleDebug

# Windows用户:
gradlew.bat assembleDebug

# 构建完成后，APK位置:
# android/app/build/outputs/apk/debug/app-debug.apk
```

#### 4. 构建Release APK
```bash
# 构建release版本
./gradlew assembleRelease

# Windows用户:
gradlew.bat assembleRelease

# 构建完成后，APK位置:
# android/app/build/outputs/apk/release/app-release.apk
```

#### 5. 安装APK到设备
```bash
# 安装debug版本
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 安装release版本
adb install android/app/build/outputs/apk/release/app-release.apk

# 如果安装失败，尝试强制安装
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 生成App Bundle (AAB) - Google Play需要

```bash
cd android

# 构建AAB文件
./gradlew bundleRelease

# Windows用户:
gradlew.bat bundleRelease

# 构建完成后，AAB位置:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## iOS打包 (仅macOS)

### 步骤1: 安装依赖

```bash
cd mobile-app

# 安装CocoaPods依赖
cd ios
pod install
cd ..
```

### 步骤2: 配置开发团队

```
1. 在Xcode中打开项目
   open ios/ProjectManagementMobile.xcworkspace

2. 选择项目 (ProjectManagementMobile)

3. 在 "Signing & Capabilities" 选项卡中:
   - 选择开发团队 (Development Team)
   - 选择 "Automatically manage signing"

4. 如果报错，点击 "Fix Issue"
```

### 步骤3: 选择运行设备

```
1. 在Xcode顶部选择设备:
   - 选择你的真机 (推荐用于测试)
   - 或选择 Generic iOS Device (用于打包)
```

### 步骤4: 构建应用

```bash
# 方式1: 使用React Native CLI (简单测试)
npx react-native run-ios

# 方式2: 使用Xcode (完整功能)
# 在Xcode中点击运行按钮 (▶)
```

### 步骤5: 导出IPA (发布版本)

```
1. 在Xcode中选择 Generic iOS Device

2. 选择 Product > Archive

3. 等待归档完成

4. 在 Organizer 窗口中:
   - 选择刚创建的归档
   - 点击 "Distribute App"

5. 选择分发方式:
   - App Store Connect (上传到App Store)
   - Ad Hoc (测试分发)
   - Enterprise (企业内部分发)
   - Development (开发测试)

6. 按照向导完成配置
   - 选择对应的证书和描述文件
   - 配置应用信息
   - 点击 Export

7. 选择保存位置
   - IPA文件位置:
     ~/Desktop/ProjectManagementMobile.ipa
```

---

## 签名与发布

### Android签名配置

#### 1. 生成发布密钥库

```bash
# 在android/app目录下执行
cd android/app

# 生成密钥库
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 按照提示输入:
# - 密钥库密码 (至少6个字符)
# - 再次确认密码
# - 姓名、组织等 (可按Enter跳过)
# - 密钥密码 (可以与密钥库密码相同)

# 安全提示:
# - 将密钥库文件妥善保存
# - 不要将密钥库提交到Git
# - 备份密钥库文件
```

#### 2. 配置签名

编辑 `android/gradle.properties`:

```properties
# 添加签名配置 (注意: 密码应该明文存储，确保文件不被提交到Git)
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

编辑 `android/app/build.gradle`:

```gradle
android {
    // ... 其他配置

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

#### 3. 更新.gitignore

确保以下文件不会被提交到Git:

```gitignore
*.keystore
*.jks
gradle.properties
```

### 发布到Google Play

#### 1. 创建开发者账号
```
访问: https://play.google.com/console
注册费用: $25 (一次性)

需要提供:
- Google账号
- 开发者名称
- 联系邮箱
- 银行账户 (用于收款)
- 税务信息
```

#### 2. 创建应用

```
1. 登录Google Play Console
2. 点击 "创建应用"
3. 输入应用名称、语言等基本信息
4. 选择应用类型 (免费/付费)
5. 选择是否包含广告
```

#### 3. 上传应用包

```
1. 在"生产"环境中:
   - 点击"创建新发布"
   - 上传AAB文件 (不是APK)
   - AAB文件位置:
     android/app/build/outputs/bundle/release/app-release.aab

2. 填写商店信息:
   - 应用描述
   - 屏幕截图 (至少2张)
   - 应用图标
   - 横幅图片 (1024x500)

3. 填写内容分级:
   - 回答问卷问题
   - 系统自动计算分级

4. 填写目标受众
   - 选择目标用户群体
```

#### 4. 配置发布

```
1. 选择发布类型:
   - 标准发布 (立即发布)
   - 分阶段发布 (先发布给部分用户)
   - 内测 (内部测试)
   - 封闭测试 (指定测试用户)

2. 审核时间:
   - 通常1-3个工作日
   - 首次审核可能需要更长时间
```

### 发布到Apple App Store

#### 1. 注册开发者账号
```
访问: https://developer.apple.com/programs/
费用:
- 个人账号: $99/年
- 企业账号: $299/年 (仅用于企业内部分发)

需要提供:
- Apple ID
- 企业/个人信息
- 信用卡
```

#### 2. 创建应用

```
1. 登录 App Store Connect
2. 点击 "我的App"
3. 点击 "+" > "新建App"
4. 填写应用信息:
   - 平台 (iOS)
   - 名称
   - 主要语言
   - Bundle ID
   - SKU
```

#### 3. 上传IPA

```
1. 在Xcode中:
   - Product > Archive
   - 选择归档
   - Distribute App > App Store Connect

2. 在App Store Connect中:
   - 进入"准备提交"
   - 填写应用信息:
     - 屏幕截图 (6.5" 和 5.5" 设备)
     - 描述
     - 关键词
     - 支持URL
     - 营销URL
     - 隐私政策URL

3. 配置版本信息:
   - 版本号
   - 发布类型 (手动发布/自动发布)
```

#### 4. 提交审核

```
1. 完成所有必填项
2. 点击"提交以供审核"

3. 审核时间:
   - 通常1-3个工作日
   - 首次审核可能需要更长时间
```

---

## 常见问题

### Android相关

#### 问题1: Gradle构建失败

```bash
# 清理缓存
cd android
./gradlew clean
rm -rf ~/.gradle/caches

# 重新构建
cd ..
pnpm install
cd android
./gradlew assembleDebug
```

#### 问题2: Metro服务器端口被占用

```bash
# 查找占用8081端口的进程
# macOS/Linux:
lsof -ti:8081
kill -9 $(lsof -ti:8081)

# Windows:
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

#### 问题3: 设备连接失败

```bash
# 重启ADB服务
adb kill-server
adb start-server

# 查看设备
adb devices

# 如果设备未显示，尝试:
# 1. 重新插拔USB线
# 2. 检查USB调试是否开启
# 3. 在开发者选项中切换USB调试
# 4. 重启手机
```

#### 问题4: 构建时内存不足

编辑 `android/gradle.properties`:

```properties
# 增加JVM内存
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m

# 启用并行构建
org.gradle.parallel=true

# 启用配置缓存
org.gradle.configuration-cache=true
```

#### 问题5: React Native版本不匹配

```bash
# 清理并重新安装依赖
cd mobile-app
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/Podfile.lock

pnpm install

# iOS需要重新安装Pods
cd ios
pod install
cd ..
```

### iOS相关

#### 问题1: CocoaPods安装失败

```bash
# 更新CocoaPods
sudo gem install cocoapods

# 清理缓存
pod cache clean --all

# 重新安装
cd ios
pod deintegrate
pod install
```

#### 问题2: 构建时签名错误

```
解决方案:
1. 在Xcode中删除签名配置
2. 重新选择开发团队
3. 勾选"Automatically manage signing"
4. 如果仍然报错，点击"Fix Issue"
```

#### 问题3: Xcode找不到模拟器

```bash
# 重置模拟器
xcrun simctl erase all

# 在Xcode中:
# Window > Devices and Simulators
# 点击左下角的"+"创建新模拟器
```

### 通用问题

#### 问题1: 依赖安装失败

```bash
# 尝试使用legacy-peer-deps
pnpm install --legacy-peer-deps

# 或使用yarn
yarn install

# 或使用npm
npm install --legacy-peer-deps
```

#### 问题2: TypeScript类型错误

```bash
# 重新生成类型定义
cd mobile-app
npx tsc --noEmit

# 如果有错误，修复后再次运行
```

#### 问题3: 修改代码后不生效

```bash
# 清理Metro缓存
pnpm start -- --reset-cache

# 或完全重启Metro服务器
# 按 Ctrl+C 停止
# 然后重新启动
pnpm start
```

---

## 自动化脚本

### 构建脚本

提供了以下自动化脚本 (在mobile-app目录下):

```bash
# 构建Android Debug APK
pnpm build:android:debug

# 构建Android Release APK
pnpm build:android

# 构建Android App Bundle (AAB)
pnpm build:android:bundle

# 清理构建
pnpm clean

# 启动开发服务器
pnpm start
```

### CI/CD集成

可以使用以下工具实现自动化构建:

- GitHub Actions
- GitLab CI/CD
- Jenkins
- CircleCI

示例GitHub Actions配置文件:

```yaml
name: Build Android APK

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Set up JDK
        uses: actions/setup-java@v2
        with:
          distribution: 'temurin'
          java-version: '11'

      - name: Install dependencies
        run: |
          cd mobile-app
          npm install -g pnpm
          pnpm install

      - name: Build APK
        run: |
          cd mobile-app/android
          ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v2
        with:
          name: app-release
          path: mobile-app/android/app/build/outputs/apk/release/*.apk
```

---

## 版本管理

### 版本号规则

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)
例如: 1.0.0

- MAJOR: 重大更新，不兼容的API变更
- MINOR: 新功能，向后兼容
- PATCH: Bug修复，向后兼容
```

### 更新版本

1. 更新 `package.json` 中的版本号
2. 更新 `app.config.json` 中的版本号
3. Android: 更新 `android/app/build.gradle` 中的 `versionCode`
4. iOS: 在Xcode中更新版本号
5. 重新构建应用

---

## 性能优化

### Android优化

```gradle
// android/app/build.gradle

android {
    buildTypes {
        release {
            // 启用代码混淆
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### iOS优化

```bash
# 在Xcode中:
# 1. Build Settings > Optimization Level
# 2. Release 模式设置为 -O3

# 3. Build Settings > Enable Bitcode
# 4. 设置为 NO (React Native不需要)
```

---

## 支持与帮助

- 官方文档: https://reactnative.dev/
- Android文档: https://developer.android.com/
- iOS文档: https://developer.apple.com/documentation/
- 问题反馈: 提交Issue到项目仓库

---

## 附录

### 目录结构

```
mobile-app/
├── android/                 # Android原生代码和配置
│   ├── app/
│   │   ├── build.gradle     # 应用级构建配置
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── AndroidManifest.xml
│   │   │       ├── java/    # Java源代码
│   │   │       └── res/     # 资源文件
│   │   └── proguard-rules.pro
│   ├── build.gradle         # 项目级构建配置
│   ├── gradle.properties    # Gradle属性
│   └── settings.gradle      # 项目设置
├── ios/                     # iOS原生代码和配置
│   ├── Podfile             # CocoaPods依赖配置
│   └── ProjectManagementMobile/
│       ├── AppDelegate.h/mm
│       ├── Info.plist      # 应用配置
│       └── .xcodeproj/     # Xcode项目文件
├── src/                     # React Native源代码
│   ├── components/         # 组件
│   ├── navigation/         # 导航
│   ├── screens/           # 页面
│   ├── services/          # 服务 (API等)
│   ├── types/             # TypeScript类型定义
│   └── utils/             # 工具函数
├── App.tsx                 # 应用入口
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript配置
├── babel.config.js         # Babel配置
├── metro.config.js         # Metro配置
└── app.config.json         # 应用配置
```

### 有用的命令

```bash
# Android
adb devices                    # 查看已连接设备
adb install app.apk            # 安装APK
adb uninstall com.app.package  # 卸载应用
adb logcat                     # 查看日志
adb shell pm list packages     # 列出已安装应用

# iOS
xcrun simctl list devices      # 列出模拟器
xcrun simctl boot <device>    # 启动模拟器
xcrun simctl shutdown all      # 关闭所有模拟器

# React Native
npx react-native doctor        # 检查环境配置
npx react-native clean         # 清理缓存
npx react-native start         # 启动Metro服务器
```

---

**祝你打包顺利！如有问题，请参考常见问题部分或提交Issue。**
