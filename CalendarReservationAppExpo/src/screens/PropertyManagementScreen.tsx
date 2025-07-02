import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import firebaseService from '../services/firebaseService';

interface PropertyManagementScreenProps {
  navigation: any;
  route: any;
}

const PropertyManagementScreen: React.FC<PropertyManagementScreenProps> = ({ navigation, route }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [propertyDescription, setPropertyDescription] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [currency, setCurrency] = useState('₺');
  const { state } = useAuth();
  const { t } = useLanguage();
  const { editingProperty: routeEditingProperty } = route.params || {};

  useEffect(() => {
    if (routeEditingProperty) {
      // Tek property düzenleme modu
      setProperties([routeEditingProperty]);
      openEditModal(routeEditingProperty);
    } else {
      // Normal liste modu
      loadProperties();
    }
  }, [routeEditingProperty]);

  // Reload data when screen comes into focus (sadece normal mod için)
  useFocusEffect(
    useCallback(() => {
      const params = route.params;
      if (params?.editingProperty) {
        // Navigation'dan gelen editing property varsa
        setProperties([params.editingProperty]);
        openEditModal(params.editingProperty);
        // Params'ı temizle ki tekrar açıldığında normal mod olsun
        navigation.setParams({ editingProperty: undefined });
      } else if (!routeEditingProperty) {
        loadProperties();
      }
    }, [route.params, routeEditingProperty])
  );

  const loadProperties = async () => {
    try {
      if (!state.user?.id) return;
      
      console.log('Loading properties for user:', state.user.id, 'role:', state.user.role);
      
      if (state.user.role === 'master') {
        // Master user - AsyncStorage kullan
        const propertiesString = await AsyncStorage.getItem('properties');
        console.log('Loading properties from AsyncStorage:', propertiesString);
        if (propertiesString) {
          const allProperties = JSON.parse(propertiesString);
          const userProperties = allProperties.filter(
            (p: Property) => p.userId === state.user?.id
          );
          console.log('User properties found:', userProperties.length);
          setProperties(userProperties);
        } else {
          console.log('No properties found in AsyncStorage');
          setProperties([]);
        }
      } else {
        // Firebase user - Firebase'den çek
        const userProperties = await firebaseService.getProperties(state.user.id);
        console.log('Firebase properties loaded:', userProperties.length);
        setProperties(userProperties);
      }
    } catch (error) {
      console.error('Load properties error:', error);
    }
  };

  const handleAddProperty = async () => {
    if (!propertyName.trim()) {
      Alert.alert('Hata', 'Ev adı gerekli');
      return;
    }

    if (!state.user?.id) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.');
      return;
    }

    try {
      if (state.user.role === 'master') {
        // Master user - AsyncStorage kullan
        const newProperty: Property = {
          id: Date.now().toString(),
          name: propertyName.trim(),
          description: propertyDescription.trim() || undefined,
          address: propertyAddress.trim() || undefined,
          userId: state.user.id,
          pricing: {
            defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
            currency: currency,
            dailyPrices: {}
          },
          createdAt: new Date(),
        };

        console.log('Adding new property to AsyncStorage:', newProperty);

        const existingPropertiesString = await AsyncStorage.getItem('properties');
        const existingProperties = existingPropertiesString 
          ? JSON.parse(existingPropertiesString) 
          : [];

        const updatedProperties = [...existingProperties, newProperty];
        await AsyncStorage.setItem('properties', JSON.stringify(updatedProperties));

        setProperties(prev => [...prev, newProperty]);
      } else {
        // Firebase user - Firebase'e kaydet
        const newProperty = {
          name: propertyName.trim(),
          description: propertyDescription.trim() || undefined,
          address: propertyAddress.trim() || undefined,
          userId: state.user.id,
          pricing: {
            defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
            currency: currency,
            dailyPrices: {}
          },
          createdAt: new Date(),
        };

        console.log('Adding new property to Firebase:', newProperty);
        const propertyId = await firebaseService.addProperty(state.user.id, newProperty);
        
        // Local state'i güncelle
        setProperties(prev => [...prev, { ...newProperty, id: propertyId }]);
      }

      resetForm();
      setShowAddModal(false);

      Alert.alert('Başarılı', 'Ev eklendi', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Add property error:', error);
      Alert.alert('Hata', 'Ev eklenemedi');
    }
  };

  const handleEditProperty = async () => {
    if (!propertyName.trim() || !editingProperty) {
      Alert.alert('Hata', 'Ev adı gerekli');
      return;
    }

    try {
      const updatedProperty: Property = {
        ...editingProperty,
        name: propertyName.trim(),
        description: propertyDescription.trim() || undefined,
        address: propertyAddress.trim() || undefined,
        pricing: {
          ...editingProperty.pricing,
          defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
          currency: currency,
          dailyPrices: editingProperty.pricing?.dailyPrices || {}
        },
      };

      const existingPropertiesString = await AsyncStorage.getItem('properties');
      if (existingPropertiesString) {
        const existingProperties = JSON.parse(existingPropertiesString);
        const updatedProperties = existingProperties.map((p: Property) =>
          p.id === editingProperty.id ? updatedProperty : p
        );
        await AsyncStorage.setItem('properties', JSON.stringify(updatedProperties));

        setProperties(prev => 
          prev.map(p => p.id === editingProperty.id ? updatedProperty : p)
        );
      }

      resetForm();
      setShowAddModal(false);
      setEditingProperty(null);

      if (routeEditingProperty) {
        // Tek property düzenleme modundaysa önceki ekrana dön
        // Güncellenen property'yi geri gönder
        navigation.navigate('PropertyCalendar', {
          property: updatedProperty
        });
        Alert.alert('Başarılı', 'Ev güncellendi');
      } else {
        Alert.alert('Başarılı', 'Ev güncellendi');
      }
    } catch (error) {
      console.error('Edit property error:', error);
      Alert.alert('Hata', 'Ev güncellenemedi');
    }
  };

  const handleDeleteProperty = (propertyId: string, propertyName: string) => {
    Alert.alert(
      'Evi Sil',
      `"${propertyName}" evini silmek istediğinizden emin misiniz? Bu ev ile ilgili tüm rezervasyonlar da silinecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteProperty(propertyId) }
      ]
    );
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      // Delete property
      const existingPropertiesString = await AsyncStorage.getItem('properties');
      if (existingPropertiesString) {
        const existingProperties = JSON.parse(existingPropertiesString);
        const updatedProperties = existingProperties.filter(
          (p: Property) => p.id !== propertyId
        );
        await AsyncStorage.setItem('properties', JSON.stringify(updatedProperties));
        setProperties(prev => prev.filter(p => p.id !== propertyId));
      }

      // Delete related reservations
      const existingReservationsString = await AsyncStorage.getItem('reservations');
      if (existingReservationsString) {
        const existingReservations = JSON.parse(existingReservationsString);
        const updatedReservations = existingReservations.filter(
          (r: any) => r.propertyId !== propertyId
        );
        await AsyncStorage.setItem('reservations', JSON.stringify(updatedReservations));
      }

      Alert.alert('Başarılı', 'Ev ve ilgili rezervasyonlar silindi');
    } catch (error) {
      console.error('Delete property error:', error);
      Alert.alert('Hata', 'Ev silinemedi');
    }
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setPropertyName(property.name);
    setPropertyDescription(property.description || '');
    setPropertyAddress(property.address || '');
    setDefaultPrice(property.pricing?.defaultPrice?.toString() || '');
    setCurrency(property.pricing?.currency || '₺');
    setShowAddModal(true);
  };

  const resetForm = () => {
    setPropertyName('');
    setPropertyDescription('');
    setPropertyAddress('');
    setDefaultPrice('');
    setCurrency('₺');
    setEditingProperty(null);
  };

  const closeModal = () => {
    resetForm();
    setShowAddModal(false);
  };

  const renderPropertyItem = ({ item }: { item: Property }) => (
    <View style={styles.propertyItem}>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName}>{item.name}</Text>
        {item.address && <Text style={styles.propertyAddress}>{item.address}</Text>}
        {item.description && <Text style={styles.propertyDescription}>{item.description}</Text>}
        <Text style={styles.propertyDate}>
          Eklendi: {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <View style={styles.propertyActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.editButtonText}>Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteProperty(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {routeEditingProperty ? 'Ev Düzenle' : 'Ev Yönetimi'}
        </Text>
        {!routeEditingProperty && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Ev Ekle</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={properties}
        renderItem={renderPropertyItem}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz ev eklenmemiş</Text>
            <Text style={styles.emptySubText}>
              İlk evinizi ekleyerek başlayın
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
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelButton}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingProperty ? 'Evi Düzenle' : 'Yeni Ev Ekle'}
            </Text>
            <TouchableOpacity onPress={editingProperty ? handleEditProperty : handleAddProperty}>
              <Text style={styles.saveButton}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Ev Adı *"
              placeholderTextColor="#999"
              value={propertyName}
              onChangeText={setPropertyName}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Adres"
              placeholderTextColor="#999"
              value={propertyAddress}
              onChangeText={setPropertyAddress}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Açıklama"
              placeholderTextColor="#999"
              value={propertyDescription}
              onChangeText={setPropertyDescription}
              multiline
              numberOfLines={3}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
            />
            
            <View style={styles.pricingSection}>
              <Text style={styles.sectionTitle}>Fiyatlandırma</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Günlük Fiyat"
                  placeholderTextColor="#999"
                  value={defaultPrice}
                  onChangeText={setDefaultPrice}
                  keyboardType="numeric"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <View style={styles.currencyContainer}>
                  <TouchableOpacity 
                    style={[styles.currencyButton, currency === '₺' && styles.currencyButtonActive]}
                    onPress={() => setCurrency('₺')}
                  >
                    <Text style={[styles.currencyText, currency === '₺' && styles.currencyTextActive]}>₺</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.currencyButton, currency === '€' && styles.currencyButtonActive]}
                    onPress={() => setCurrency('€')}
                  >
                    <Text style={[styles.currencyText, currency === '€' && styles.currencyTextActive]}>€</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.currencyButton, currency === '$' && styles.currencyButtonActive]}
                    onPress={() => setCurrency('$')}
                  >
                    <Text style={[styles.currencyText, currency === '$' && styles.currencyTextActive]}>$</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.priceNote}>Bu fiyat takvimde gösterilecek olan varsayılan günlük fiyattır</Text>
            </View>
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
  propertyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  propertyDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  propertyDate: {
    fontSize: 11,
    color: '#999',
  },
  propertyActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pricingSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceInput: {
    flex: 1,
    marginRight: 15,
    marginBottom: 0,
  },
  currencyContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  currencyButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  currencyButtonActive: {
    backgroundColor: '#007AFF',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  currencyTextActive: {
    color: '#FFF',
  },
  priceNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PropertyManagementScreen;