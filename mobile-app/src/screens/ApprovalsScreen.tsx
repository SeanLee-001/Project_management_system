/**
 * 审批中心屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {Approval} from '../types';
import {formatDateTime} from '../utils/helpers';

const ApprovalsScreen: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadUserIdAndApprovals();
  }, []);

  const loadUserIdAndApprovals = async () => {
    try {
      const user = await apiService.getCurrentUser();
      if (user) {
        setUserId(user.id);
        loadApprovals(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadApprovals = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiService.getApprovals(id);
      if (response.success) {
        setApprovals(response.data || []);
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: Approval) => {
    Alert.alert('确认', '确定通过此审批吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        onPress: async () => {
          try {
            const response = await apiService.approveApproval(approval.id);
            if (response.success) {
              Alert.alert('成功', '审批已通过');
              loadApprovals(userId);
            } else {
              Alert.alert('失败', response.error || '审批失败');
            }
          } catch (error) {
            Alert.alert('失败', '网络错误，请稍后重试');
          }
        },
      },
    ]);
  };

  const handleReject = async (approval: Approval) => {
    Alert.prompt('拒绝原因', '请输入拒绝原因（可选）', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        onPress: async (comment?: string) => {
          try {
            const response = await apiService.rejectApproval(
              approval.id,
              comment
            );
            if (response.success) {
              Alert.alert('成功', '审批已拒绝');
              loadApprovals(userId);
            } else {
              Alert.alert('失败', response.error || '审批失败');
            }
          } catch (error) {
            Alert.alert('失败', '网络错误，请稍后重试');
          }
        },
      },
    ]);
  };

  const renderApprovalItem = ({item}: {item: Approval}) => (
    <View style={styles.approvalItem}>
      <View style={styles.approvalHeader}>
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor:
                item.type === 'project'
                  ? '#3B82F6'
                  : item.type === 'contract'
                  ? '#10B981'
                  : '#F59E0B',
            },
          ]}>
          <Text style={styles.typeText}>
            {item.type === 'project'
              ? '项目'
              : item.type === 'contract'
              ? '合同'
              : '订单'}
          </Text>
        </View>
        <Text style={styles.approvalDate}>{formatDateTime(item.createdAt)}</Text>
      </View>

      <Text style={styles.approvalTarget}>{item.targetName}</Text>
      <Text style={styles.approvalRequester}>申请人: {item.requesterName}</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${(item.currentStep / item.totalSteps) * 100}%`},
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {item.currentStep} / {item.totalSteps}
        </Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}>
            <Icon name="check" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>通过</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}>
            <Icon name="close" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>拒绝</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'approved' ? '#10B981' : '#EF4444',
            },
          ]}>
          <Text style={styles.statusText}>
            {item.status === 'approved' ? '已通过' : '已拒绝'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={approvals}
        renderItem={renderApprovalItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUserIdAndApprovals} />
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
  listContent: {
    padding: 15,
  },
  approvalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  approvalDate: {
    fontSize: 12,
    color: '#999',
  },
  approvalTarget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  approvalRequester: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ApprovalsScreen;
