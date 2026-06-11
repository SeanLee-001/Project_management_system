/**
 * 首页屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {apiService} from '../services/api';
import {User, Project, Message} from '../types';
import {formatDate} from '../utils/helpers';

const HomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // 加载项目列表
        const projectsRes = await apiService.getProjects();
        if (projectsRes.success) {
          setProjects(projectsRes.data || []);
        }

        // 加载消息列表
        const messagesRes = await apiService.getMessages(currentUser.id);
        if (messagesRes.success) {
          setMessages(messagesRes.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const unreadMessages = messages.filter(m => !m.read);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }>
        {/* 用户信息卡片 */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user?.fullName || user?.username || '用户'}
              </Text>
              <Text style={styles.userRole}>
                {user?.role === 'system_admin' ? '系统管理员' : '项目成员'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 统计数据 */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{projects.length}</Text>
            <Text style={styles.statLabel}>总项目</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeProjects.length}</Text>
            <Text style={styles.statLabel}>进行中</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unreadMessages.length}</Text>
            <Text style={styles.statLabel}>未读消息</Text>
          </View>
        </View>

        {/* 快捷功能 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷功能</Text>
          <View style={styles.gridContainer}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Projects')}>
              <View style={[styles.gridIcon, {backgroundColor: '#3B82F6'}]}>
                <Icon name="briefcase" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>项目管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Customers')}>
              <View style={[styles.gridIcon, {backgroundColor: '#10B981'}]}>
                <Icon name="account-group" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>客户管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Contracts')}>
              <View style={[styles.gridIcon, {backgroundColor: '#F59E0B'}]}>
                <Icon name="file-document" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>合同管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Orders')}>
              <View style={[styles.gridIcon, {backgroundColor: '#EF4444'}]}>
                <Icon name="cart" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>订单管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Products')}>
              <View style={[styles.gridIcon, {backgroundColor: '#8B5CF6'}]}>
                <Icon name="package" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>产品管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Messages')}>
              <View style={[styles.gridIcon, {backgroundColor: '#EC4899'}]}>
                <Icon name="message" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>消息中心</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Approvals')}>
              <View style={[styles.gridIcon, {backgroundColor: '#14B8A6'}]}>
                <Icon name="check-circle" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>审批中心</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Profile')}>
              <View style={[styles.gridIcon, {backgroundColor: '#6366F1'}]}>
                <Icon name="account" size={28} color="#fff" />
              </View>
              <Text style={styles.gridItemText}>个人中心</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近项目 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近项目</Text>
          {activeProjects.slice(0, 3).map(project => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectItem}
              onPress={() => navigation.navigate('Tasks', {projectId: project.id})}>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectCustomer}>{project.customerName}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          ))}
          {activeProjects.length === 0 && (
            <Text style={styles.emptyText}>暂无进行中的项目</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 15,
  },
  userCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  gridIcon: {
    width: 55,
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  projectItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  projectCustomer: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
});

export default HomeScreen;
