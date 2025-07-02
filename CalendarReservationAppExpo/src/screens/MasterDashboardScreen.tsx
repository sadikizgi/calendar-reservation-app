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
import { collection, getDocs, query, updateDoc, doc, deleteDoc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import firebaseService from '../services/firebaseService';
import { useLanguage } from '../context/LanguageContext';

interface FirebaseUser {
  id: string;
  email: string;
  businessName?: string;
  role: 'master' | 'employee';
  createdAt: any;
  isApproved?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
}

interface MasterDashboardScreenProps {
  navigation: any;
}

const MasterDashboardScreen: React.FC<MasterDashboardScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout, deleteUser } = useAuth();
  const { t } = useLanguage();

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
      
      // Tüm Firebase kullanıcılarını getir
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseUser[];
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Load users error:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Kullanıcıyı Onayla',
      `${userEmail} kullanıcısını onaylamak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Onayla', 
          onPress: async () => {
            try {
              setLoading(true);
              await firebaseService.approveUser(userId);
              Alert.alert('Başarılı', 'Kullanıcı onaylandı');
              loadUsers();
            } catch (error) {
              console.error('Approve user error:', error);
              Alert.alert('Hata', 'Kullanıcı onaylanamadı');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const rejectUser = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Kullanıcıyı Reddet',
      `${userEmail} kullanıcısını reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Reddet', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await firebaseService.rejectUser(userId);
              Alert.alert('Başarılı', 'Kullanıcı reddedildi');
              loadUsers();
            } catch (error) {
              console.error('Reject user error:', error);
              Alert.alert('Hata', 'Kullanıcı reddedilemedi');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const unapproveUser = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Onayı Kaldır',
      `${userEmail} kullanıcısının onayını kaldırmak istediğinizden emin misiniz? Kullanıcı tekrar pending duruma geçecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Onayı Kaldır', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await firebaseService.unapproveUser(userId);
              Alert.alert('Başarılı', 'Kullanıcının onayı kaldırıldı');
              loadUsers();
            } catch (error) {
              console.error('Unapprove user error:', error);
              Alert.alert('Hata', 'Onay kaldırılamadı');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const deleteUserCompletely = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Kullanıcıyı Sil',
      `${userEmail} kullanıcısını ve tüm verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'SİL', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteUser(userId);
              Alert.alert('Başarılı', 'Kullanıcı ve tüm verileri kalıcı olarak silindi');
              loadUsers();
            } catch (error) {
              console.error('Delete user error:', error);
              Alert.alert('Hata', 'Kullanıcı silinemedi');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getPendingUsers = () => {
    return users.filter(u => u.status === 'pending' || (!u.isApproved || u.isApproved === false));
  };

  const getApprovedUsers = () => {
    return users.filter(u => u.isApproved === true);
  };

  const renderUser = ({ item, isPending }: { item: FirebaseUser, isPending: boolean }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.email}</Text>
        {item.businessName && (
          <Text style={styles.businessName}>İşletme: {item.businessName}</Text>
        )}
        <Text style={styles.userDate}>
          Kayıt: {item.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        {isPending ? (
          <View style={styles.pendingActions}>
            <View style={styles.pendingButtonsRow}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => approveUser(item.id, item.email)}
                disabled={loading}
              >
                <Text style={styles.approveButtonText}>Onayla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => rejectUser(item.id, item.email)}
                disabled={loading}
              >
                <Text style={styles.rejectButtonText}>Reddet</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteUserCompletely(item.id, item.email)}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>Sil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.approvedActions}>
            <View style={styles.approvedBadge}>
              <Text style={styles.approvedText}>Onaylandı</Text>
            </View>
            <TouchableOpacity
              style={styles.unapproveButton}
              onPress={() => unapproveUser(item.id, item.email)}
              disabled={loading}
            >
              <Text style={styles.unapproveButtonText}>Onayı Kaldır</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteUserCompletely(item.id, item.email)}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>Sil</Text>
            </TouchableOpacity>
          </View>
        )}
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

  const pendingUsers = getPendingUsers();
  const approvedUsers = getApprovedUsers();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservas Master</Text>
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
          <Text style={styles.statLabel}>Onaylanmış</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
      </View>

      <View style={styles.sectionsContainer}>
        {pendingUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Onay Bekleyen Kullanıcılar</Text>
            <FlatList
              data={pendingUsers}
              renderItem={({ item }) => renderUser({ item, isPending: true })}
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
            renderItem={({ item }) => renderUser({ item, isPending: false })}
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
  businessName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    alignItems: 'flex-end',
  },
  pendingActions: {
    alignItems: 'flex-end',
  },
  pendingButtonsRow: {
    flexDirection: 'row',
    marginBottom: 4,
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
  approvedActions: {
    alignItems: 'flex-end',
  },
  approvedBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
  },
  approvedText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unapproveButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unapproveButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 2,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 11,
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