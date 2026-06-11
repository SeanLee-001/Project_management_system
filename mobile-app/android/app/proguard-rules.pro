# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/gradle/7.5.1/libexec/caches/transforms-3/files-3.1/8e4e3e623c9f0199d24b336e081c3759/AndroidManifest.xml

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation class * implements com.facebook.react.bridge.NativeModule
-keep,allowobfuscation class * implements com.facebook.react.bridge.JavaScriptModule
-keep class com.facebook.react {*;}
-keep class com.facebook.hermes.reactexecutor.HermesExecutorFactory {*;}
-keep class com.facebook.hermes.jsc.JSCExecutor {*;}

# Hermes
-keep class com.facebook.hermes.** {*;}
-keep class com.facebook.jni.** {*;}
-keep class com.google.android.gms.internal.** { *; }
-dontwarn com.google.android.gms.internal.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
-keep class okhttp3.{public,private,protected} *;

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Axios
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-keep class okio.** { *; }
-keep interface okio.** { *; }
-dontwarn okio.**
