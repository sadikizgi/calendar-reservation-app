import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reservation } from '../types';
import { useAuth } from '../context/AuthContext';

interface CalendarScreenProps {
  navigation: any;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const { state } = useAuth();

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    updateMarkedDates();
  }, [reservations, selectedDate]);

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

  const updateMarkedDates = () => {
    const marked: any = {};
    
    reservations.forEach(reservation => {
      marked[reservation.date] = {
        marked: true,
        dotColor: reservation.status === 'confirmed' ? '#00B383' : '#FF6B6B',
      };
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
      };
    }

    setMarkedDates(marked);
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const getReservationsForSelectedDate = () => {
    return reservations.filter(r => r.date === selectedDate);
  };

  const handleAddReservation = () => {
    navigation.navigate('AddReservation', { selectedDate });
  };

  const handleReservationPress = (reservation: Reservation) => {
    navigation.navigate('ReservationDetail', { reservation });
  };

  const renderReservationItem = ({ item }: { item: Reservation }) => (
    <TouchableOpacity 
      style={styles.reservationItem}
      onPress={() => handleReservationPress(item)}
    >
      <View style={styles.reservationHeader}>
        <Text style={styles.reservationTitle}>{item.title}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.status === 'confirmed' ? '#00B383' : '#FF6B6B' }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'confirmed' ? 'Onaylandı' : 'Beklemede'}
          </Text>
        </View>
      </View>
      {item.startTime && (
        <Text style={styles.reservationTime}>
          {item.startTime} - {item.endTime}
        </Text>
      )}
      {item.description && (
        <Text style={styles.reservationDescription}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#007AFF',
          todayTextColor: '#007AFF',
          arrowColor: '#007AFF',
        }}
      />

      <View style={styles.bottomSection}>
        <View style={styles.dateHeader}>
          <Text style={styles.selectedDateText}>
            {selectedDate ? selectedDate : 'Bir tarih seçin'}
          </Text>
          {selectedDate && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddReservation}
            >
              <Text style={styles.addButtonText}>+ Ekle</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedDate && (
          <FlatList
            data={getReservationsForSelectedDate()}
            renderItem={renderReservationItem}
            keyExtractor={item => item.id}
            style={styles.reservationsList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Bu tarihte rezervasyon yok</Text>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  bottomSection: {
    flex: 1,
    padding: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  selectedDateText: {
    fontSize: 18,
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
  reservationsList: {
    flex: 1,
  },
  reservationItem: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reservationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reservationTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reservationDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 50,
  },
});

export default CalendarScreen;