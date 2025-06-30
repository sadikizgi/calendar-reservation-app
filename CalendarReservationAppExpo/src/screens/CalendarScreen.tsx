import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 80) / 2; // 80 = container padding (40) + row padding (20) + spacing (20)

interface CalendarScreenProps {
  navigation: any;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const { state } = useAuth();

  useEffect(() => {
    loadProperties();
    loadReservations();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProperties();
      loadReservations();
    }, [])
  );

  const loadProperties = async () => {
    try {
      const propertiesString = await AsyncStorage.getItem('properties');
      if (propertiesString) {
        const allProperties = JSON.parse(propertiesString);
        const userProperties = allProperties.filter(
          (p: Property) => p.userId === state.user?.id
        );
        setProperties(userProperties);
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error('Load properties error:', error);
    }
  };

  const loadReservations = async () => {
    try {
      const reservationsString = await AsyncStorage.getItem('reservations');
      if (reservationsString) {
        const allReservations = JSON.parse(reservationsString);
        const userReservations = allReservations.filter(
          (r: Reservation) => r.userId === state.user?.id
        );
        setReservations(userReservations);
      }
    } catch (error) {
      console.error('Load reservations error:', error);
    }
  };

  const getReservationCountForProperty = (propertyId: string) => {
    return reservations.filter(r => r.propertyId === propertyId).length;
  };

  const handlePropertyPress = (property: Property) => {
    console.log('Navigating to PropertyCalendar for:', property.name);
    navigation.navigate('PropertyCalendar', { property });
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{properties.length}</Text>
            <Text style={styles.statLabel}>Toplam Ev</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{reservations.length}</Text>
            <Text style={styles.statLabel}>Aktif Rezervasyon</Text>
          </View>
        </View>

        {properties.length > 0 && (
          <View style={styles.quickAccess}>
            <FlatList
              data={properties}
              numColumns={2}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.quickPropertyCard}
                  onPress={() => handlePropertyPress(item)}
                >
                  <Text style={styles.quickPropertyName}>{item.name}</Text>
                  <Text style={styles.quickPropertyReservations}>
                    {getReservationCountForProperty(item.id)} rezervasyon
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.propertiesListContent}
              columnWrapperStyle={styles.row}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quickAccess: {
    flex: 1,
    marginTop: 10,
  },
  propertiesListContent: {
    paddingHorizontal: 5,
  },
  row: {
    justifyContent: 'space-evenly',
    paddingHorizontal: 10,
  },
  quickPropertyCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: CARD_WIDTH,
    height: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'center',
  },
  quickPropertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  quickPropertyReservations: {
    fontSize: 12,
    color: '#666',
  },
});

export default CalendarScreen;