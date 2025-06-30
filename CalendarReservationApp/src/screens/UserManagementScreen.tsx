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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubUser } from '../types';
import { useAuth } from '../context/AuthContext';

const UserManagementScreen: React.FC = () => {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const { state } = useAuth();

  useEffect(() => {
    loadSubUsers();
  }, []);

  const loadSubUsers = async () => {
    try {
      const subUsersString = await AsyncStorage.getItem('subUsers');
      if (subUsersString) {
        const allSubUsers = JSON.parse(subUsersString);
        const userSubUsers = allSubUsers.filter(
          (su: SubUser) => su.parentUserId === state.user?.id
        );
        setSubUsers(userSubUsers);
      }
    } catch (error) {
      console.error('Load sub users error:', error);
    }
  };

  const handleAddSubUser = async () => {
    if (!newUserName.trim()) {
      Alert.alert('Hata', 'İsim gerekli');
      return;
    }

    try {
      const newSubUser: SubUser = {
        id: Date.now().toString(),
        name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        parentUserId: state.user!.id,
        createdAt: new Date(),
      };

      const existingSubUsersString = await AsyncStorage.getItem('subUsers');
      const existingSubUsers = existingSubUsersString 
        ? JSON.parse(existingSubUsersString) 
        : [];

      const updatedSubUsers = [...existingSubUsers, newSubUser];
      await AsyncStorage.setItem('subUsers', JSON.stringify(updatedSubUsers));

      setSubUsers(prev => [...prev, newSubUser]);
      setNewUserName('');
      setNewUserEmail('');
      setShowAddModal(false);

      Alert.alert('Başarılı', 'Alt kullanıcı eklendi');
    } catch (error) {
      console.error('Add sub user error:', error);
      Alert.alert('Hata', 'Alt kullanıcı eklenemedi');
    }
  };

  const handleDeleteSubUser = (subUserId: string) => {
    Alert.alert(
      'Kullanıcıyı Sil',
      'Bu kullanıcıyı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteSubUser(subUserId) }
      ]
    );
  };

  const deleteSubUser = async (subUserId: string) => {
    try {
      const existingSubUsersString = await AsyncStorage.getItem('subUsers');
      if (existingSubUsersString) {
        const existingSubUsers = JSON.parse(existingSubUsersString);
        const updatedSubUsers = existingSubUsers.filter(
          (su: SubUser) => su.id !== subUserId
        );
        await AsyncStorage.setItem('subUsers', JSON.stringify(updatedSubUsers));
        setSubUsers(prev => prev.filter(su => su.id !== subUserId));
      }
    } catch (error) {
      console.error('Delete sub user error:', error);
      Alert.alert('Hata', 'Alt kullanıcı silinemedi');
    }
  };

  const renderSubUserItem = ({ item }: { item: SubUser }) => (
    <View style={styles.subUserItem}>
      <View style={styles.subUserInfo}>
        <Text style={styles.subUserName}>{item.name}</Text>
        {item.email && <Text style={styles.subUserEmail}>{item.email}</Text>}
        <Text style={styles.subUserDate}>
          Eklendi: {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteSubUser(item.id)}
      >
        <Text style={styles.deleteButtonText}>Sil</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alt Kullanıcılar</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={subUsers}
        renderItem={renderSubUserItem}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz alt kullanıcı eklenmemiş</Text>
            <Text style={styles.emptySubText}>
              Alt kullanıcılar rezervasyon yaparken seçilebilir
            </Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButton}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Alt Kullanıcı Ekle</Text>
            <TouchableOpacity onPress={handleAddSubUser}>
              <Text style={styles.saveButton}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="İsim *"
              value={newUserName}
              onChangeText={setNewUserName}
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta (isteğe bağlı)"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
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
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  subUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  subUserInfo: {
    flex: 1,
  },
  subUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subUserEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  subUserDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
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
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
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
});

export default UserManagementScreen;