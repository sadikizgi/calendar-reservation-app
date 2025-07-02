import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import firebaseService from '../services/firebaseService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 80) / 2; // 80 = container padding (40) + row padding (20) + spacing (20)

interface CalendarScreenProps {
  navigation: any;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showAvailabilitySearch, setShowAvailabilitySearch] = useState(false);
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [isSelectingStartDate, setIsSelectingStartDate] = useState(true);
  const { state } = useAuth();
  const { t } = useLanguage();

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
      if (!state.user?.id) return;
      
      console.log('Loading properties for user:', state.user.id);
      
      if (state.user.role === 'master') {
        // Master user - AsyncStorage kullan
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

  const loadReservations = async () => {
    try {
      if (!state.user?.id) return;
      
      console.log('Loading reservations for user:', state.user.id);
      
      if (state.user.role === 'master') {
        // Master user - AsyncStorage kullan
        const reservationsString = await AsyncStorage.getItem('reservations');
        if (reservationsString) {
          const allReservations = JSON.parse(reservationsString);
          const userReservations = allReservations.filter(
            (r: Reservation) => r.userId === state.user?.id
          );
          setReservations(userReservations);
        }
      } else {
        // Firebase user - Firebase'den çek
        const userReservations = await firebaseService.getReservations(state.user.id);
        console.log('Firebase reservations loaded:', userReservations.length);
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

  const findAvailableProperties = () => {
    if (!searchStartDate || !searchEndDate) {
      Alert.alert(t('error'), t('selectDatesError'));
      return;
    }

    const start = new Date(searchStartDate);
    const end = new Date(searchEndDate);
    
    if (start > end) {
      Alert.alert(t('error'), t('invalidDateRange'));
      return;
    }

    const available: Property[] = [];

    properties.forEach(property => {
      const propertyReservations = reservations.filter(r => r.propertyId === property.id);
      let isAvailable = true;

      // Seçilen tarih aralığını kontrol et
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Bu tarihte rezervasyon var mı kontrol et
        const hasReservation = propertyReservations.some(reservation => {
          if (reservation.endDate) {
            // Tarih aralığı rezervasyonu
            return dateString >= reservation.date && dateString <= reservation.endDate;
          } else {
            // Tek günlük rezervasyon
            return dateString === reservation.date;
          }
        });

        if (hasReservation) {
          isAvailable = false;
          break;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (isAvailable) {
        available.push(property);
      }
    });

    setAvailableProperties(available);
  };

  const resetSearch = () => {
    setSearchStartDate('');
    setSearchEndDate('');
    setAvailableProperties([]);
    setIsSelectingStartDate(true);
    setShowAvailabilitySearch(false);
  };

  const onCalendarDayPress = (day: any) => {
    if (isSelectingStartDate) {
      setSearchStartDate(day.dateString);
      setSearchEndDate(''); // Reset end date when selecting new start date
      setIsSelectingStartDate(false);
    } else {
      if (day.dateString < searchStartDate) {
        // If selected end date is before start date, swap them
        setSearchEndDate(searchStartDate);
        setSearchStartDate(day.dateString);
      } else {
        setSearchEndDate(day.dateString);
      }
      setIsSelectingStartDate(true);
    }
  };

  const getMarkedDatesForSearch = () => {
    const marked: any = {};
    
    if (searchStartDate) {
      if (searchEndDate && searchStartDate !== searchEndDate) {
        // Period marking for date range
        marked[searchStartDate] = {
          startingDay: true,
          color: '#007AFF',
          textColor: '#FFF',
        };
        marked[searchEndDate] = {
          endingDay: true,
          color: '#007AFF',
          textColor: '#FFF',
        };
        
        // Mark days in between
        const start = new Date(searchStartDate);
        const end = new Date(searchEndDate);
        const current = new Date(start);
        current.setDate(current.getDate() + 1);
        
        while (current < end) {
          const dateString = current.toISOString().split('T')[0];
          marked[dateString] = {
            color: '#B3D9FF',
            textColor: '#000',
          };
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Single day selection
        marked[searchStartDate] = {
          selected: true,
          selectedColor: '#007AFF',
          selectedTextColor: '#FFF',
        };
      }
    }
    
    return marked;
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{properties.length}</Text>
            <Text style={styles.statLabel}>{t('totalProperties')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{reservations.length}</Text>
            <Text style={styles.statLabel}>{t('activeReservations')}</Text>
          </View>
        </View>

        {properties.length > 0 && (
          <View style={styles.availabilitySection}>
            <TouchableOpacity 
              style={styles.availabilityButton}
              onPress={() => setShowAvailabilitySearch(true)}
            >
              <Text style={styles.availabilityButtonText}>
                🔍 {t('findAvailableProperties')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
                    {getReservationCountForProperty(item.id)} {t('reservationCount')}
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

      <Modal
        visible={showAvailabilitySearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetSearch}>
              <Text style={styles.cancelButton}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('findAvailableProperties')}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.searchInstructions}>
              {isSelectingStartDate 
                ? t('selectStartDate')
                : t('selectEndDate')}
            </Text>
            
            <Calendar
              onDayPress={onCalendarDayPress}
              markedDates={getMarkedDatesForSearch()}
              markingType="period"
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#FFF',
                todayTextColor: '#007AFF',
                dayTextColor: '#333',
                textDisabledColor: '#d9e1e8',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
                calendarBackground: '#FFF',
                arrowColor: '#007AFF',
              }}
              firstDay={1}
            />

            {searchStartDate && (
              <View style={styles.selectedDatesInfo}>
                <Text style={styles.selectedDateText}>
                  {t('startDate')}: {searchStartDate}
                </Text>
                {searchEndDate && (
                  <Text style={styles.selectedDateText}>
                    {t('endDate')}: {searchEndDate}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.searchButtons}>
              <TouchableOpacity 
                style={[
                  styles.searchButton,
                  (!searchStartDate || !searchEndDate) && styles.disabledButton
                ]}
                onPress={findAvailableProperties}
                disabled={!searchStartDate || !searchEndDate}
              >
                <Text style={styles.searchButtonText}>{t('search')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetSearch}
              >
                <Text style={styles.resetButtonText}>{t('clear')}</Text>
              </TouchableOpacity>
            </View>

            {availableProperties.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>{t('availableProperties')}</Text>
                {availableProperties.map(property => (
                  <TouchableOpacity
                    key={property.id}
                    style={styles.resultItem}
                    onPress={() => {
                      setShowAvailabilitySearch(false);
                      handlePropertyPress(property);
                    }}
                  >
                    <Text style={styles.resultText}>{property.name}</Text>
                    <Text style={styles.resultArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {searchStartDate && searchEndDate && availableProperties.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  {t('noPropertiesAvailable')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
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
  availabilitySection: {
    marginBottom: 20,
  },
  availabilityButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  availabilityButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  headerSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  searchInstructions: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  selectedDatesInfo: {
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 6,
    marginVertical: 15,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  searchButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  searchButton: {
    backgroundColor: '#00B383',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  searchButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  resetButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  resultArrow: {
    fontSize: 16,
    color: '#007AFF',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default CalendarScreen;