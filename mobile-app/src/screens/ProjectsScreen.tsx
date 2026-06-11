/**
 * 项目管理屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {Project} from '../types';
import {formatDate, getOverdueDays, getStatusText} from '../utils/helpers';

const ProjectsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const filtered = projects.filter(
        p =>
          p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          p.customerName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          p.projectCode.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [searchKeyword, projects]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await apiService.getProjects();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProjectItem = ({item}: {item: Project}) => {
    const overdueDays = getOverdueDays(item.endDate);

    return (
      <TouchableOpacity
        style={styles.projectItem}
        onPress={() => navigation.navigate('Tasks', {projectId: item.id})}>
        <View style={styles.projectHeader}>
          <Text style={styles.projectCode}>{item.projectCode}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === 'active'
                    ? '#3B82F6'
                    : item.status === 'completed'
                    ? '#10B981'
                    : item.status === 'paused'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.projectName}>{item.name}</Text>
        <Text style={styles.projectCustomer}>{item.customerName}</Text>

        <View style={styles.projectDates}>
          <View style={styles.dateItem}>
            <Icon name="calendar-start" size={14} color="#666" />
            <Text style={styles.dateText}>
              {formatDate(item.startDate)} ~ {formatDate(item.endDate)}
            </Text>
          </View>
        </View>

        {overdueDays !== null && (
          <View style={styles.overdueBadge}>
            <Icon name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.overdueText}>延期{overdueDays}天</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索项目..."
          placeholderTextColor="#999"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
        />
        {searchKeyword.length > 0 && (
          <TouchableOpacity onPress={() => setSearchKeyword('')}>
            <Icon name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* 项目列表 */}
      <FlatList
        data={filteredProjects}
        renderItem={renderProjectItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadProjects} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-off" size={60} color="#ddd" />
            <Text style={styles.emptyText}>暂无项目数据</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    padding: 15,
  },
  projectItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectCode: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
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
    marginBottom: 8,
  },
  projectDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  overdueText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default ProjectsScreen;
