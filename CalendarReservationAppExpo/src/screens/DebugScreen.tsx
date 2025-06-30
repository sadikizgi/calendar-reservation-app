import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DebugScreen: React.FC = () => {
  const showAsyncStorageData = async () => {
    try {
      const properties = await AsyncStorage.getItem('properties');
      const reservations = await AsyncStorage.getItem('reservations');
      const subUsers = await AsyncStorage.getItem('subUsers');
      const user = await AsyncStorage.getItem('user');
      const registeredUsers = await AsyncStorage.getItem('registeredUsers');

      console.log('=== AsyncStorage Debug ===');
      console.log('Properties:', properties);
      console.log('Reservations:', reservations);
      console.log('SubUsers:', subUsers);
      console.log('User:', user);
      console.log('Registered Users:', registeredUsers);

      let userInfo = '';
      let propertiesInfo = '';
      
      if (user) {
        const userObj = JSON.parse(user);
        userInfo = `User ID: ${userObj.id}\nUsername: ${userObj.username}`;
        
        let userPropertiesCount = 0;
        let userReservationsCount = 0;
        let userSubUsersCount = 0;
        
        if (properties) {
          const propertiesObj = JSON.parse(properties);
          const userProperties = propertiesObj.filter((p: any) => p.userId === userObj.id);
          userPropertiesCount = userProperties.length;
        }
        
        if (reservations) {
          const reservationsObj = JSON.parse(reservations);
          const userReservations = reservationsObj.filter((r: any) => r.userId === userObj.id);
          userReservationsCount = userReservations.length;
        }
        
        if (subUsers) {
          const subUsersObj = JSON.parse(subUsers);
          const userSubUsers = subUsersObj.filter((su: any) => su.parentUserId === userObj.id);
          userSubUsersCount = userSubUsers.length;
        }
        
        propertiesInfo = `Evlerim: ${userPropertiesCount}\nRezervasyon: ${userReservationsCount}\nAlt Kullanıcı: ${userSubUsersCount}`;
      }

      Alert.alert(
        'Verilerim',
        `${userInfo}\n\n${propertiesInfo}`
      );
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Hata', 'Veri okunamadı');
    }
  };



  const showMySubUsers = async () => {
    try {
      const subUsers = await AsyncStorage.getItem('subUsers');
      const user = await AsyncStorage.getItem('user');
      
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
        return;
      }

      const userObj = JSON.parse(user);
      
      if (!subUsers) {
        Alert.alert('Bilgi', 'Henüz alt kullanıcı eklenmemiş');
        return;
      }

      const subUsersObj = JSON.parse(subUsers);
      const mySubUsers = subUsersObj.filter((su: any) => su.parentUserId === userObj.id);
      
      if (mySubUsers.length === 0) {
        Alert.alert('Bilgi', 'Henüz alt kullanıcı eklenmemiş');
        return;
      }

      const subUserList = mySubUsers.map((subUser: any, index: number) => 
        `${index + 1}. ${subUser.name}${subUser.email ? ` (${subUser.email})` : ''}`
      ).join('\n');

      Alert.alert('Alt Kullanıcılarım', subUserList);
    } catch (error) {
      console.error('Show sub users error:', error);
      Alert.alert('Hata', 'Alt kullanıcılar görüntülenemedi');
    }
  };


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Ekranı</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={showAsyncStorageData}>
          <Text style={styles.buttonText}>Verileri Görüntüle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoButton} onPress={showMySubUsers}>
          <Text style={styles.buttonText}>Alt Kullanıcılarımı Göster</Text>
        </TouchableOpacity>




        <View style={styles.info}>
          <Text style={styles.infoTitle}>Bilgi:</Text>
          <Text style={styles.infoText}>
            • Console'da detaylı logları görebilirsiniz{'\n'}
            • Veri silme işlemleri geri alınamaz{'\n'}
            • AsyncStorage'ı React Native'in local database'i olarak kullanıyoruz
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  infoButton: {
    backgroundColor: '#5AC8FA',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default DebugScreen;