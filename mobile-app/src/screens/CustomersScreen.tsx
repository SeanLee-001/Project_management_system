/**
 * 客户管理屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {Customer} from '../types';

const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCustomers();
      if (response.success) {
        setCustomers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerItem = ({item}: {item: Customer}) => (
    <View style={styles.customerItem}>
      <View style={styles.customerHeader}>
        <Text style={styles.customerCode}>{item.customerCode}</Text>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: item.status === 'active' ? '#10B981' : '#EF4444'},
          ]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? '活跃' : '停用'}
          </Text>
        </View>
      </View>
      <Text style={styles.customerName}>{item.name}</Text>
      {item.contactName && (
        <Text style={styles.contactInfo}>联系人: {item.contactName}</Text>
      )}
      {item.contactPhone && (
        <Text style={styles.contactInfo}>电话: {item.contactPhone}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCustomers} />
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
  customerItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerCode: {
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
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default CustomersScreen;
