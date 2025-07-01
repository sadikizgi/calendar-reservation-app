import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';

interface MasterDashboardScreenProps {
  navigation: any;
}

const MasterDashboardScreen: React.FC<MasterDashboardScreenProps> = ({ navigation }) => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersString = await AsyncStorage.getItem('registeredUsers');
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      
      // Filter out master user and separate pending/approved
      const regularUsers = users.filter(u => u.role !== 'master');
      const pending = regularUsers.filter(u => u.isPending === true);
      const approved = regularUsers.filter(u => u.isActive === true && !u.isPending);
      
      setPendingUsers(pending);
      setApprovedUsers(approved);
    } catch (error) {
      console.error('Load users error:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const usersString = await AsyncStorage.getItem('registeredUsers');
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            isActive: true,
            isPending: false,
            updatedAt: new Date()
          };
        }
        return user;
      });
      
      await AsyncStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      await loadUsers(); // Refresh the lists
      
      Alert.alert('Başarılı', 'Kullanıcı onaylandı');
    } catch (error) {
      console.error('Approve user error:', error);
      Alert.alert('Hata', 'Kullanıcı onaylanamadı');
    }
  };

  const rejectUser = async (userId: string) => {
    Alert.alert(
      'Kullanıcıyı Reddet',
      'Bu kullanıcının kaydını reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Reddet', 
          style: 'destructive',
          onPress: async () => {
            try {
              const usersString = await AsyncStorage.getItem('registeredUsers');
              const users: User[] = usersString ? JSON.parse(usersString) : [];
              
              const updatedUsers = users.filter(user => user.id !== userId);
              
              await AsyncStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
              await loadUsers(); // Refresh the lists
              
              Alert.alert('Başarılı', 'Kullanıcı reddedildi ve silindi');
            } catch (error) {
              console.error('Reject user error:', error);
              Alert.alert('Hata', 'Kullanıcı reddedilemedi');
            }
          }
        }
      ]
    );
  };

  const deactivateUser = async (userId: string) => {
    Alert.alert(
      'Kullanıcıyı Devre Dışı Bırak',
      'Bu kullanıcının hesabını devre dışı bırakmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Devre Dışı Bırak', 
          style: 'destructive',
          onPress: async () => {
            try {
              const usersString = await AsyncStorage.getItem('registeredUsers');
              const users: User[] = usersString ? JSON.parse(usersString) : [];
              
              const updatedUsers = users.map(user => {
                if (user.id === userId) {
                  return {
                    ...user,
                    isActive: false,
                    updatedAt: new Date()
                  };
                }
                return user;
              });
              
              await AsyncStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
              await loadUsers(); // Refresh the lists
              
              Alert.alert('Başarılı', 'Kullanıcı devre dışı bırakıldı');
            } catch (error) {
              console.error('Deactivate user error:', error);
              Alert.alert('Hata', 'Kullanıcı devre dışı bırakılamadı');
            }
          }
        }
      ]
    );
  };

  const renderPendingUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userDate}>
          Kayıt Tarihi: {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => approveUser(item.id)}
        >
          <Text style={styles.approveButtonText}>Onayla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => rejectUser(item.id)}
        >
          <Text style={styles.rejectButtonText}>Reddet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApprovedUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userDate}>
          Kayıt: {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </Text>
        {item.lastLoginAt && (
          <Text style={styles.userDate}>
            Son Giriş: {new Date(item.lastLoginAt).toLocaleDateString('tr-TR')}
          </Text>
        )}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.deactivateButton}
          onPress={() => deactivateUser(item.id)}
        >
          <Text style={styles.deactivateButtonText}>Devre Dışı</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ReservaHub Master</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
          <Text style={styles.logoutButtonText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingUsers.length}</Text>
          <Text style={styles.statLabel}>Onay Bekleyen</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{approvedUsers.length}</Text>
          <Text style={styles.statLabel}>Aktif Kullanıcı</Text>
        </View>
      </View>

      <View style={styles.sectionsContainer}>
        {pendingUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Onay Bekleyen Kullanıcılar</Text>
            <FlatList
              data={pendingUsers}
              renderItem={renderPendingUser}
              keyExtractor={item => item.id}
              style={styles.usersList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onaylanmış Kullanıcılar</Text>
          <FlatList
            data={approvedUsers}
            renderItem={renderApprovedUser}
            keyExtractor={item => item.id}
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz onaylanmış kullanıcı yok</Text>
              </View>
            }
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sectionsContainer: {
    flex: 1,
    padding: 20,
  },
  section: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  approveButton: {
    backgroundColor: '#00B383',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deactivateButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deactivateButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default MasterDashboardScreen;