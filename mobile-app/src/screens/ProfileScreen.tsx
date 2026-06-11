/**
 * 个人中心屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {apiService} from '../services/api';
import {User} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        onPress: async () => {
          try {
            await apiService.logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (error) {
            Alert.alert('退出失败', '请稍后重试');
          }
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: 'account-edit',
      title: '编辑资料',
      onPress: () => Alert.alert('提示', '功能开发中'),
    },
    {
      icon: 'lock-reset',
      title: '修改密码',
      onPress: () => Alert.alert('提示', '功能开发中'),
    },
    {
      icon: 'bell-outline',
      title: '消息通知',
      onPress: () => Alert.alert('提示', '功能开发中'),
    },
    {
      icon: 'cog-outline',
      title: '系统设置',
      onPress: () => Alert.alert('提示', '功能开发中'),
    },
    {
      icon: 'information-outline',
      title: '关于我们',
      onPress: () => Alert.alert('关于', '项目管理系统移动端 v1.0.0'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* 用户信息卡片 */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.fullName || user?.username || '用户'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || '暂无邮箱'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'system_admin' ? '系统管理员' : '项目成员'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* 菜单列表 */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}>
            <Icon name={item.icon as any} size={24} color="#666" />
            <Text style={styles.menuText}>{item.title}</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* 退出登录按钮 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={24} color="#fff" />
        <Text style={styles.logoutButtonText}>退出登录</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>项目管理系统 v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  userCard: {
    margin: 15,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  menuContainer: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    borderRadius: 15,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    margin: 15,
    paddingVertical: 15,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;
