import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reservation, SubUser } from '../types';
import { useAuth } from '../context/AuthContext';

interface AddReservationScreenProps {
  navigation: any;
  route: any;
}

const AddReservationScreen: React.FC<AddReservationScreenProps> = ({ navigation, route }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [useTime, setUseTime] = useState(false);
  const [selectedSubUser, setSelectedSubUser] = useState<string>('');
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const { state } = useAuth();
  const { selectedDate, endDate, propertyId, editingReservation } = route.params || {};

  useEffect(() => {
    loadSubUsers();
    
    // Düzenleme modunda ise mevcut verileri doldur
    if (editingReservation) {
      console.log('Editing reservation:', editingReservation);
      setTitle(editingReservation.title);
      setDescription(editingReservation.description || '');
      if (editingReservation.startTime) {
        setUseTime(true);
        setStartTime(editingReservation.startTime);
        setEndTime(editingReservation.endTime || '');
      }
      setSelectedSubUser(editingReservation.subUserId || '');
    }
  }, [editingReservation]);

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

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Rezervasyon başlığı gerekli');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Hata', 'Tarih seçilmedi');
      return;
    }

    if (useTime && (!startTime.trim() || !endTime.trim())) {
      Alert.alert('Hata', 'Saat bilgileri gerekli');
      return;
    }

    try {
      if (editingReservation) {
        // Düzenleme modu
        const updatedReservation: Reservation = {
          ...editingReservation,
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: useTime ? startTime : undefined,
          endTime: useTime ? endTime : undefined,
          subUserId: selectedSubUser || undefined,
          updatedAt: new Date(),
        };

        const existingReservationsString = await AsyncStorage.getItem('reservations');
        const existingReservations = existingReservationsString 
          ? JSON.parse(existingReservationsString) 
          : [];

        const updatedReservations = existingReservations.map((r: Reservation) =>
          r.id === editingReservation.id ? updatedReservation : r
        );
        await AsyncStorage.setItem('reservations', JSON.stringify(updatedReservations));

        console.log('Reservation updated successfully:', updatedReservation);
        
        Alert.alert('Başarılı', 'Rezervasyon güncellendi', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Yeni rezervasyon
        const newReservation: Reservation = {
          id: Date.now().toString(),
          title: title.trim(),
          description: description.trim() || undefined,
          date: selectedDate,
          endDate: endDate || undefined,
          startTime: useTime ? startTime : undefined,
          endTime: useTime ? endTime : undefined,
          userId: state.user!.id,
          propertyId: propertyId || '1',
          subUserId: selectedSubUser || undefined,
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const existingReservationsString = await AsyncStorage.getItem('reservations');
        const existingReservations = existingReservationsString 
          ? JSON.parse(existingReservationsString) 
          : [];

        const updatedReservations = [...existingReservations, newReservation];
        await AsyncStorage.setItem('reservations', JSON.stringify(updatedReservations));

        console.log('Reservation saved successfully:', newReservation);
        
        Alert.alert('Başarılı', 'Rezervasyon oluşturuldu', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Save reservation error:', error);
      Alert.alert('Hata', 'Rezervasyon kaydedilemedi');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>
          {editingReservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
        </Text>
        
        <Text style={styles.dateText}>
          {endDate ? `Tarih Aralığı: ${selectedDate} - ${endDate}` : `Tarih: ${selectedDate}`}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Rezervasyon Başlığı *"
          value={title}
          onChangeText={setTitle}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Açıklama"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
        />

        <View style={styles.timeSection}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Saat Belirle</Text>
            <Switch
              value={useTime}
              onValueChange={setUseTime}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={useTime ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          {useTime && (
            <View style={styles.timeInputs}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="Başlangıç (HH:MM)"
                value={startTime}
                onChangeText={setStartTime}
                keyboardType="numeric"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="Bitiş (HH:MM)"
                value={endTime}
                onChangeText={setEndTime}
                keyboardType="numeric"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          )}
        </View>

        {subUsers.length > 0 && (
          <View style={styles.subUserSection}>
            <Text style={styles.sectionTitle}>Alt Kullanıcı Seç</Text>
            <View style={styles.subUserList}>
              <TouchableOpacity
                style={[
                  styles.subUserItem,
                  selectedSubUser === '' && styles.subUserItemSelected
                ]}
                onPress={() => setSelectedSubUser('')}
              >
                <Text style={[
                  styles.subUserText,
                  selectedSubUser === '' && styles.subUserTextSelected
                ]}>
                  Kendim
                </Text>
              </TouchableOpacity>
              {subUsers.map(subUser => (
                <TouchableOpacity
                  key={subUser.id}
                  style={[
                    styles.subUserItem,
                    selectedSubUser === subUser.id && styles.subUserItemSelected
                  ]}
                  onPress={() => setSelectedSubUser(subUser.id)}
                >
                  <Text style={[
                    styles.subUserText,
                    selectedSubUser === subUser.id && styles.subUserTextSelected
                  ]}>
                    {subUser.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeSection: {
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 0.48,
  },
  subUserSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subUserList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subUserItem: {
    padding: 8,
    margin: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  subUserItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  subUserText: {
    color: '#333',
    fontSize: 14,
  },
  subUserTextSelected: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddReservationScreen;