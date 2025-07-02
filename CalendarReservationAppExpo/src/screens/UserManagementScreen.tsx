import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { collection, getDocs, query, where, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import firebaseService, { UserProfile } from '../services/firebaseService';

interface FirebaseUser {
  id: string;
  email: string;
  businessId?: string;
  businessName?: string;
  role: 'master' | 'employee';
  createdAt: any;
}

const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const { state, addEmployee, getPendingUsers, approveUser, rejectUser, unapproveUser, toggleUserActive, getApprovedUsers } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    loadUsers();
    if (state.user?.role === 'master' && state.user?.username === 'master') {
      loadPendingUsers();
      loadApprovedUsers();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      console.log('Loading users, current user:', state.user?.id, 'role:', state.user?.role);
      
      let allUsers: FirebaseUser[] = [];

      if (state.user?.role === 'master' && state.user?.username === 'master') {
        // Sadece offline master - Firebase kullanıcıları göster
        try {
          const usersQuery = query(collection(db, 'users'));
          const usersSnapshot = await getDocs(usersQuery);
          const firebaseUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as FirebaseUser[];
          
          allUsers = firebaseUsers;
        } catch (firebaseError) {
          console.log('Firebase error:', firebaseError);
        }
      }

      // Tüm kullanıcılar için (master ve normal): Firebase'den sub users'ları yükle
      try {
        const subUsersQuery = query(
          collection(db, 'subUsers'),
          where('parentUserId', '==', state.user?.id)
        );
        const subUsersSnapshot = await getDocs(subUsersQuery);
        const firebaseSubUsers = subUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().name, // name'i email alanında göster
          role: 'employee' as const,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as FirebaseUser[];

        console.log('Firebase sub users:', firebaseSubUsers);
        allUsers = [...allUsers, ...firebaseSubUsers];
      } catch (subUsersError) {
        console.log('Sub users Firebase error:', subUsersError);
        
        // Firebase hatası varsa AsyncStorage'dan yükle (fallback)
        const subUsersString = await AsyncStorage.getItem('subUsers');
        if (subUsersString) {
          const localSubUsers = JSON.parse(subUsersString);
          const localSubUsersFormatted = localSubUsers
            .filter((su: any) => su.parentUserId === state.user?.id)
            .map((su: any) => ({
              id: su.id,
              email: su.name,
              role: 'employee' as const,
              createdAt: su.createdAt ? new Date(su.createdAt) : new Date()
            }));
          allUsers = [...allUsers, ...localSubUsersFormatted];
        }
      }

      console.log('All users loaded:', allUsers);
      setUsers(allUsers);
    } catch (error) {
      console.error('Load users error:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
      console.log('Loading pending users...');
      const pending = await getPendingUsers();
      console.log('Pending users loaded:', pending);
      console.log('Pending users count:', pending.length);
      
      // Her pending user için detaylı bilgi
      pending.forEach((user, index) => {
        console.log(`Pending user ${index + 1}:`, {
          id: user.id,
          email: user.email,
          status: user.status,
          businessName: user.businessName
        });
      });
      
      setPendingUsers(pending);
    } catch (error) {
      console.error('Load pending users error:', error);
      Alert.alert('Hata', 'Onay bekleyen kullanıcılar yüklenemedi: ' + (error as Error).message);
    }
  };

  const loadApprovedUsers = async () => {
    try {
      console.log('Loading approved users...');
      const approved = await getApprovedUsers();
      console.log('Approved users loaded:', approved);
      console.log('Approved users count:', approved.length);
      setApprovedUsers(approved);
    } catch (error) {
      console.error('Load approved users error:', error);
      Alert.alert('Hata', 'Onaylanmış kullanıcılar yüklenemedi: ' + (error as Error).message);
    }
  };

  const handleAddEmployee = async () => {
    if (!newUserName.trim()) {
      Alert.alert('Hata', 'İsim gerekli');
      return;
    }

    try {
      setLoading(true);
      
      const userName = newUserName.trim();
      
      const newSubUser = {
        name: userName,
        parentUserId: state.user?.id,
        createdAt: new Date(),
      };

      console.log('Adding new sub user to Firebase:', newSubUser);

      // Firebase'e kaydet
      try {
        const docRef = await addDoc(collection(db, 'subUsers'), newSubUser);
        console.log('Sub user added to Firebase with ID:', docRef.id);
        
        // Başarılı ise AsyncStorage'e de kaydet (sync için)
        const existingSubUsersString = await AsyncStorage.getItem('subUsers');
        const existingSubUsers = existingSubUsersString 
          ? JSON.parse(existingSubUsersString) 
          : [];

        const subUserWithId = {
          id: docRef.id,
          ...newSubUser
        };

        const updatedSubUsers = [...existingSubUsers, subUserWithId];
        await AsyncStorage.setItem('subUsers', JSON.stringify(updatedSubUsers));

        Alert.alert('Başarılı', `${userName} çalışan olarak eklendi`, [
          { text: 'OK', onPress: () => {
            setNewUserName('');
            setNewUserEmail('');
            setShowAddModal(false);
            loadUsers(); // Listeyi yenile
          }}
        ]);
      } catch (firebaseError) {
        console.log('Firebase error, saving locally:', firebaseError);
        
        // Firebase hatası varsa sadece local kaydet
        const existingSubUsersString = await AsyncStorage.getItem('subUsers');
        const existingSubUsers = existingSubUsersString 
          ? JSON.parse(existingSubUsersString) 
          : [];

        const localSubUser = {
          id: Date.now().toString(),
          ...newSubUser
        };

        const updatedSubUsers = [...existingSubUsers, localSubUser];
        await AsyncStorage.setItem('subUsers', JSON.stringify(updatedSubUsers));

        Alert.alert('Başarılı', `${userName} çalışan olarak eklendi (yerel)`, [
          { text: 'OK', onPress: () => {
            setNewUserName('');
            setNewUserEmail('');
            setShowAddModal(false);
            loadUsers(); // Listeyi yenile
          }}
        ]);
      }
    } catch (error: any) {
      console.error('Add employee error:', error);
      Alert.alert('Hata', error.message || 'Çalışan eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const debugAllUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await firebaseService.getAllUsers();
      Alert.alert(
        'Debug: Tüm Kullanıcılar', 
        `Toplam ${allUsers.length} kullanıcı bulundu. Console'u kontrol edin.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Hata', 'Debug hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async () => {
    try {
      const email = await new Promise<string>((resolve) => {
        Alert.prompt(
          'User Status Check',
          'Email adresini girin:',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Kontrol Et', onPress: (text) => resolve(text || '') }
          ],
          'plain-text'
        );
      });

      if (!email) return;

      setLoading(true);
      const userData = await firebaseService.checkUserStatus(email);
      
      if (userData) {
        Alert.alert(
          'User Status',
          `Email: ${userData.email}\nStatus: ${userData.status}\nBusiness: ${userData.businessName}\nID: ${userData.id}`,
          [{ text: 'OK' }]
        );
      } else {
        // Kullanıcı bulunamazsa ghost user kontrolü yap
        const isGhost = await firebaseService.cleanupGhostUser(email);
        if (isGhost) {
          Alert.alert(
            'User Status', 
            `Kullanıcı Firestore'da bulunamadı ancak Firebase Auth'da mevcut olabilir (Ghost User). Bu durumda kullanıcı kayıt olamaz.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('User Status', 'Kullanıcı hiçbir yerde bulunamadı - kayıt yapabilir');
        }
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Status check hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      console.log('UserManagement: Approving user:', userId, userName);
      
      // Önce kullanıcının mevcut durumunu kontrol et
      const userStatusBefore = await firebaseService.checkUserStatus(pendingUsers.find(u => u.id === userId)?.email || '');
      console.log('UserManagement: User status before approval:', userStatusBefore);
      
      await approveUser(userId);
      console.log('UserManagement: User approved, checking status after approval');
      
      // Onay sonrası durumu kontrol et
      const userStatusAfter = await firebaseService.checkUserStatus(pendingUsers.find(u => u.id === userId)?.email || '');
      console.log('UserManagement: User status after approval:', userStatusAfter);
      
      // Kısa bekleme sonrası listeyi yenile
      setTimeout(async () => {
        console.log('UserManagement: Refreshing lists after approval');
        await loadPendingUsers();
        await loadUsers();
        await loadApprovedUsers();
      }, 1500);
      
      Alert.alert('Başarılı', `${userName} kullanıcısı onaylandı`);
    } catch (error: any) {
      console.error('UserManagement: Approve user error:', error);
      Alert.alert('Hata', error.message || 'Kullanıcı onaylanamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Kullanıcıyı Reddet',
      `${userName} kullanıcısını reddetmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Reddet', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            await rejectUser(userId);
            
            Alert.alert('Başarılı', `${userName} kullanıcısı reddedildi`, [
              { text: 'OK', onPress: () => {
                loadPendingUsers(); // Pending listeyi yenile
                loadApprovedUsers(); // Approved listeyi de yenile
              }}
            ]);
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'Kullanıcı reddedilemedi');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const handleToggleUserActive = async (userId: string, userName: string, currentlyActive: boolean) => {
    const actionText = currentlyActive ? 'pasife al' : 'aktif et';
    const statusText = currentlyActive ? 'Pasif' : 'Aktif';
    
    Alert.alert(
      'Kullanıcı Durumunu Değiştir',
      `${userName} kullanıcısını ${actionText}mak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: statusText, onPress: async () => {
          try {
            setLoading(true);
            await toggleUserActive(userId, !currentlyActive);
            
            Alert.alert('Başarılı', `${userName} kullanıcısı ${currentlyActive ? 'pasife alındı' : 'aktif edildi'}`, [
              { text: 'OK', onPress: () => {
                loadApprovedUsers(); // Approved listeyi yenile
              }}
            ]);
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'Kullanıcı durumu değiştirilemedi');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const handleUnapproveUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Onayı Kaldır',
      `${userName} kullanıcısının onayını kaldırmak istediğinizden emin misiniz? Kullanıcı tekrar pending duruma geçecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Onayı Kaldır', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            await unapproveUser(userId);
            
            Alert.alert('Başarılı', `${userName} kullanıcısının onayı kaldırıldı`, [
              { text: 'OK', onPress: () => {
                loadPendingUsers(); // Pending listeyi yenile
                loadApprovedUsers(); // Approved listeyi de yenile
              }}
            ]);
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'Onay kaldırılamadı');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const testDirectApproval = async () => {
    try {
      const email = await new Promise<string>((resolve) => {
        Alert.prompt(
          'Test Direct Approval',
          'Test edilecek kullanıcının email adresini girin:',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Test Et', onPress: (text) => resolve(text || '') }
          ],
          'plain-text'
        );
      });

      if (!email) return;

      setLoading(true);
      
      // Önce kullanıcıyı bul
      const userData = await firebaseService.checkUserStatus(email);
      if (!userData) {
        Alert.alert('Hata', 'Kullanıcı bulunamadı');
        return;
      }

      console.log('Test: Found user for approval test:', userData);
      
      // Doğrudan approve et
      await firebaseService.approveUser(userData.id);
      
      // Sonucu kontrol et
      const updatedData = await firebaseService.checkUserStatus(email);
      
      Alert.alert(
        'Test Sonucu',
        `Email: ${email}\nÖnceki Status: ${userData.status}\nYeni Status: ${updatedData?.status}\nisActive: ${updatedData?.isActive}`,
        [{ text: 'OK' }]
      );
      
      // Listeleri yenile
      await loadPendingUsers();
      await loadApprovedUsers();
      
    } catch (error: any) {
      console.error('Test error:', error);
      Alert.alert('Test Hatası', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (userId: string, userName: string) => {
    Alert.alert(
      'Çalışanı Sil',
      `${userName} çalışanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            // SubUser'ı Firebase'den sil
            await firebaseService.deleteSubUser(userId);
            Alert.alert('Başarılı', `${userName} çalışanı silindi`, [
              { text: 'OK', onPress: () => {
                loadUsers(); // Listeyi yenile
              }}
            ]);
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'Çalışan silinemedi');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const getStatusText = (user: FirebaseUser) => {
    if (user.role === 'master') return 'Master';
    if (user.role === 'employee') return 'Çalışan';
    return 'Kullanıcı';
  };

  const getStatusColor = (user: FirebaseUser) => {
    if (user.role === 'master') return '#FF6B6B';
    if (user.role === 'employee') return '#4ECDC4';
    return '#95A5A6';
  };

  const renderUserItem = ({ item }: { item: FirebaseUser }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.email}</Text>
        {item.businessName && (
          <Text style={styles.businessName}>{item.businessName}</Text>
        )}
        <Text style={styles.userDate}>
          Kayıt: {item.createdAt instanceof Date ? item.createdAt.toLocaleDateString('tr-TR') : (item.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor')}
        </Text>
      </View>
      <View style={styles.userActions}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
          <Text style={styles.statusText}>{getStatusText(item)}</Text>
        </View>
        {item.role === 'employee' && (
          <TouchableOpacity
            style={styles.deleteEmployeeButton}
            onPress={() => handleDeleteEmployee(item.id, item.email)}
            disabled={loading}
          >
            <Text style={styles.deleteEmployeeButtonText}>Sil</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPendingUserItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.pendingUserItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.email}</Text>
        {item.businessName && (
          <Text style={styles.businessName}>{item.businessName}</Text>
        )}
        <Text style={styles.userDate}>
          Kayıt: {item.createdAt instanceof Date ? item.createdAt.toLocaleDateString('tr-TR') : (item.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor')}
        </Text>
      </View>
      <View style={styles.pendingActions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveUser(item.id, item.businessName || item.email)}
          disabled={loading}
        >
          <Text style={styles.approveButtonText}>Onayla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectUser(item.id, item.businessName || item.email)}
          disabled={loading}
        >
          <Text style={styles.rejectButtonText}>Reddet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApprovedUserItem = ({ item }: { item: UserProfile }) => {
    const isActive = item.isActive !== false; // undefined veya true ise aktif
    
    return (
      <View style={styles.approvedUserItem}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.email}</Text>
          {item.businessName && (
            <Text style={styles.businessName}>{item.businessName}</Text>
          )}
          <Text style={styles.userDate}>
            Kayıt: {(item.createdAt as any)?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}
          </Text>
        </View>
        <View style={styles.approvedActions}>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#28A745' : '#6C757D' }]}>
            <Text style={styles.statusText}>{isActive ? 'Aktif' : 'Pasif'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: isActive ? '#FFC107' : '#28A745' }]}
            onPress={() => handleToggleUserActive(item.id, item.businessName || item.email, isActive)}
            disabled={loading}
          >
            <Text style={styles.toggleButtonText}>{isActive ? 'Pasife Al' : 'Aktif Et'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unapproveButton]}
            onPress={() => handleUnapproveUser(item.id, item.businessName || item.email)}
            disabled={loading}
          >
            <Text style={styles.unapproveButtonText}>Onayı Kaldır</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kullanıcı Yönetimi</Text>
        <View style={styles.headerButtons}>
          {(state.user?.role === 'master' || state.user?.businessId) && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ Çalışan Ekle</Text>
            </TouchableOpacity>
          )}
          {state.user?.role === 'master' && state.user?.username === 'master' && (
            <>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={debugAllUsers}
              >
                <Text style={styles.debugButtonText}>Debug</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.debugButton, { backgroundColor: '#28A745', marginLeft: 5 }]}
                onPress={checkUserStatus}
              >
                <Text style={styles.debugButtonText}>Check</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.debugButton, { backgroundColor: '#DC3545', marginLeft: 5 }]}
                onPress={testDirectApproval}
              >
                <Text style={styles.debugButtonText}>Test</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Pending kullanıcılar - sadece offline master için */}
      {state.user?.role === 'master' && state.user?.username === 'master' && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Onay Bekleyen Kullanıcılar ({pendingUsers.length})</Text>
          {pendingUsers.length > 0 ? (
            <FlatList
              data={pendingUsers}
              renderItem={renderPendingUserItem}
              keyExtractor={item => item.id}
              style={styles.pendingList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.emptyText}>
              {loading ? 'Yükleniyor...' : 'Onay bekleyen kullanıcı yok'}
            </Text>
          )}
        </View>
      )}

      {/* Onaylanmış kullanıcılar - sadece offline master için */}
      {state.user?.role === 'master' && state.user?.username === 'master' && (
        <View style={styles.approvedSection}>
          <Text style={styles.sectionTitle}>Onaylanmış Kullanıcılar ({approvedUsers.length})</Text>
          {approvedUsers.length > 0 ? (
            <FlatList
              data={approvedUsers}
              renderItem={renderApprovedUserItem}
              keyExtractor={item => item.id}
              style={styles.approvedList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.emptyText}>
              {loading ? 'Yükleniyor...' : 'Onaylanmış kullanıcı yok'}
            </Text>
          )}
        </View>
      )}

      {/* Normal kullanıcılar için liste */}
      {!(state.user?.role === 'master' && state.user?.username === 'master') && (
        <View style={styles.normalUsersSection}>
          <Text style={styles.sectionTitle}>Kullanıcılarım</Text>
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            style={styles.list}
            refreshing={loading}
            onRefresh={() => {
              loadUsers();
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {loading ? 'Yükleniyor...' : 'Henüz kullanıcı yok'}
                </Text>
              </View>
            }
          />
        </View>
      )}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Çalışan Ekle</Text>
            <TouchableOpacity onPress={handleAddEmployee} disabled={loading}>
              <Text style={[styles.saveButton, loading && styles.disabledButton]}>
                {loading ? 'Ekleniyor...' : 'Ekle'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Çalışanın Adı *"
              placeholderTextColor="#999"
              value={newUserName}
              onChangeText={setNewUserName}
              autoCapitalize="words"
              autoCorrect={false}
              spellCheck={false}
            />
            <Text style={styles.helpText}>
              Çalışan bilgileri sisteme kaydedilecek
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  debugButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    color: '#999',
  },
  modalContent: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pendingSection: {
    backgroundColor: '#FFF3CD',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  approvedSection: {
    flex: 1,
    margin: 15,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  pendingList: {
    maxHeight: 200,
  },
  pendingUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  pendingActions: {
    flexDirection: 'row',
  },
  approveButton: {
    backgroundColor: '#28A745',
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
    backgroundColor: '#DC3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approvedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#28A745',
  },
  approvedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  toggleButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unapproveButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    marginTop: 4,
  },
  unapproveButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  approvedList: {
    maxHeight: 300,
  },
  normalUsersSection: {
    flex: 1,
    margin: 15,
    marginTop: 0,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteEmployeeButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteEmployeeButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default UserManagementScreen;