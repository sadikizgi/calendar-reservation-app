import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Calendar, CalendarList, DateData } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface PropertyCalendarScreenProps {
  navigation: any;
  route: any;
}

const PropertyCalendarScreen: React.FC<PropertyCalendarScreenProps> = ({ navigation, route }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const { state } = useAuth();
  const { property }: { property: Property } = route.params;

  console.log('PropertyCalendarScreen opened for property:', property.name);

  useEffect(() => {
    try {
      console.log('PropertyCalendarScreen useEffect running');
      loadReservations();
      // Set navigation title
      navigation.setOptions({
        title: property.name,
        headerShown: true,
      });
    } catch (error) {
      console.error('PropertyCalendarScreen useEffect error:', error);
    }
  }, []);

  useEffect(() => {
    updateMarkedDates();
  }, [reservations, selectedDate]);

  const loadReservations = async () => {
    try {
      const reservationsString = await AsyncStorage.getItem('reservations');
      if (reservationsString) {
        const allReservations = JSON.parse(reservationsString);
        const propertyReservations = allReservations.filter(
          (r: Reservation) => r.propertyId === property.id
        );
        setReservations(propertyReservations);
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
        activeOpacity: 0.7,
      };
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
        selectedTextColor: '#FFF',
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
    navigation.navigate('AddReservation', { 
      selectedDate, 
      propertyId: property.id 
    });
  };

  const handleReservationPress = (reservation: Reservation) => {
    navigation.navigate('ReservationDetail', { reservation });
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const generateMonthRange = () => {
    const months = [];
    const today = new Date();
    
    // Show 12 months starting from current month
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthString = date.toISOString().slice(0, 7); // YYYY-MM format
      months.push(monthString);
    }
    
    return months;
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
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName}>{property.name}</Text>
        {property.address && (
          <Text style={styles.propertyAddress}>{property.address}</Text>
        )}
        <Text style={styles.reservationCount}>
          Toplam {reservations.length} rezervasyon
        </Text>
        <Text style={{color: 'red', fontSize: 12}}>
          DEBUG: PropertyCalendarScreen yüklendi
        </Text>
      </View>

      <View style={styles.calendarContainer}>
        <CalendarList
          onDayPress={onDayPress}
          markedDates={markedDates}
          pastScrollRange={2}
          futureScrollRange={24}
          scrollEnabled={true}
          showScrollIndicator={true}
          pagingEnabled={false}
          horizontal={false}
          current={getCurrentDate()}
          calendarHeight={320}
          calendarWidth={width - 20}
          theme={{
            selectedDayBackgroundColor: '#007AFF',
            todayTextColor: '#007AFF',
            arrowColor: '#007AFF',
            monthTextColor: '#333',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            calendarBackground: '#FFF',
            textSectionTitleColor: '#666',
            dayTextColor: '#333',
            selectedDayTextColor: '#FFF',
            textDayFontSize: 15,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 13,
            'stylesheet.calendar.header': {
              week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-between',
              },
            },
          }}
          style={styles.calendarList}
        />
      </View>

      {selectedDate && (
        <View style={styles.bottomSection}>
          <View style={styles.dateHeader}>
            <View>
              <Text style={styles.selectedDateText}>{selectedDate}</Text>
              <Text style={styles.selectedDateDay}>
                {new Date(selectedDate).toLocaleDateString('tr-TR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddReservation}
            >
              <Text style={styles.addButtonText}>+ Rezervasyon</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={getReservationsForSelectedDate()}
            renderItem={renderReservationItem}
            keyExtractor={item => item.id}
            style={styles.reservationsList}
            ListEmptyComponent={
              <View style={styles.emptyReservations}>
                <Text style={styles.emptyText}>Bu tarihte rezervasyon yok</Text>
                <TouchableOpacity 
                  style={styles.addEmptyButton}
                  onPress={handleAddReservation}
                >
                  <Text style={styles.addEmptyButtonText}>Rezervasyon Ekle</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  propertyInfo: {
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  reservationCount: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  calendarList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  bottomSection: {
    backgroundColor: '#FFF',
    maxHeight: 280,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDateDay: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    fontSize: 14,
  },
  reservationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reservationItem: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
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
  emptyReservations: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 15,
  },
  addEmptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addEmptyButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default PropertyCalendarScreen;