/**
 * 合同管理屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {apiService} from '../services/api';
import {Contract} from '../types';
import {formatDate} from '../utils/helpers';

const ContractsScreen: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await apiService.getContracts();
      if (response.success) {
        setContracts(response.data || []);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContractItem = ({item}: {item: Contract}) => (
    <View style={styles.contractItem}>
      <View style={styles.contractHeader}>
        <Text style={styles.contractCode}>{item.contractCode}</Text>
        <Text style={styles.contractAmount}>¥{item.amount.toLocaleString()}</Text>
      </View>
      <Text style={styles.contractName}>{item.contractName}</Text>
      <Text style={styles.contractCustomer}>{item.customerName}</Text>
      <View style={styles.contractDates}>
        <Text style={styles.dateText}>签订: {formatDate(item.contractDate)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contracts}
        renderItem={renderContractItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadContracts} />
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
  contractItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contractCode: {
    fontSize: 12,
    color: '#999',
  },
  contractAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  contractName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  contractCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contractDates: {
    flexDirection: 'row',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ContractsScreen;
