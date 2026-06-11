/**
 * 消息中心屏幕
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {Message} from '../types';
import {formatDateTime} from '../utils/helpers';

const MessagesScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadUserIdAndMessages();
  }, []);

  const loadUserIdAndMessages = async () => {
    try {
      const user = await apiService.getCurrentUser();
      if (user) {
        setUserId(user.id);
        loadMessages(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadMessages = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiService.getMessages(id);
      if (response.success) {
        setMessages(response.data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (message: Message) => {
    if (!message.read) {
      try {
        await apiService.markMessageAsRead(message.id);
        loadMessages(userId);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const renderMessageItem = ({item}: {item: Message}) => (
    <TouchableOpacity
      style={[styles.messageItem, !item.read && styles.unreadMessage]}
      onPress={() => handleMarkAsRead(item)}>
      <View style={styles.messageHeader}>
        <View style={styles.messageSender}>
          <Icon
            name="account-circle"
            size={24}
            color={item.read ? '#999' : '#3B82F6'}
          />
          <Text style={[styles.senderText, !item.read && styles.unreadText]}>
            {item.senderName}
          </Text>
        </View>
        <Text style={styles.messageDate}>{formatDateTime(item.createdAt)}</Text>
      </View>
      <Text style={[styles.messageSubject, !item.read && styles.unreadText]}>
        {item.subject}
      </Text>
      <Text style={styles.messageContent} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUserIdAndMessages} />
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
  messageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  unreadMessage: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageSender: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  unreadText: {
    color: '#333',
    fontWeight: 'bold',
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  messageContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default MessagesScreen;
