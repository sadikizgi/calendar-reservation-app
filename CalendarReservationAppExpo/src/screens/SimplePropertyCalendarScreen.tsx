import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

// Calendar locale ayarları
LocaleConfig.locales['tr'] = {
  monthNames: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ],
  monthNamesShort: [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
  ],
  dayNames: [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
  ],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün'
};

LocaleConfig.locales['en'] = {
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  monthNamesShort: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ],
  dayNames: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};

LocaleConfig.defaultLocale = 'tr';

interface SimplePropertyCalendarScreenProps {
  navigation: any;
  route: any;
}

const SimplePropertyCalendarScreen: React.FC<SimplePropertyCalendarScreenProps> = ({ navigation, route }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [subUsers, setSubUsers] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentProperty, setCurrentProperty] = useState<Property>(route.params.property);
  const { state } = useAuth();
  const { t, language } = useLanguage();
  const { property }: { property: Property } = route.params;

  console.log('SimplePropertyCalendarScreen opened for:', property.name);

  // Dil değiştiğinde calendar locale'ını güncelle
  useEffect(() => {
    console.log('Setting calendar locale to:', language);
    LocaleConfig.defaultLocale = language;
  }, [language]);

  useEffect(() => {
    loadReservations();
    loadSubUsers();
    navigation.setOptions({
      title: property.name,
    });
  }, []);

  // Ekrana focus olduğunda rezervasyonları ve property'yi yeniden yükle
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, reloading data...');
      loadReservations();
      loadSubUsers();
      loadProperty(); // Property'yi de yeniden yükle
      // Seçimi temizle (yeni rezervasyon eklendikten sonra)
      clearSelection();
    }, [])
  );

  useEffect(() => {
    updateMarkedDates();
  }, [reservations, selectedDate, startDate, endDate]);

  // Navigation başlığını güncelle
  useEffect(() => {
    navigation.setOptions({
      title: currentProperty.name,
    });
  }, [currentProperty.name, navigation]);

  const loadReservations = async () => {
    try {
      const reservationsString = await AsyncStorage.getItem('reservations');
      console.log('Raw reservations from storage:', reservationsString);
      if (reservationsString) {
        const allReservations = JSON.parse(reservationsString);
        console.log('All reservations:', allReservations.length);
        const propertyReservations = allReservations.filter(
          (r: Reservation) => r.propertyId === property.id
        );
        console.log('Property reservations for', property.id, ':', propertyReservations.length);
        console.log('Property reservations:', propertyReservations);
        setReservations(propertyReservations);
      } else {
        console.log('No reservations in storage');
        setReservations([]);
      }
    } catch (error) {
      console.error('Load reservations error:', error);
    }
  };

  const loadSubUsers = async () => {
    try {
      const subUsersString = await AsyncStorage.getItem('subUsers');
      if (subUsersString) {
        const allSubUsers = JSON.parse(subUsersString);
        const userSubUsers = allSubUsers.filter(
          (su: any) => su.parentUserId === state.user?.id
        );
        setSubUsers(userSubUsers);
      } else {
        setSubUsers([]);
      }
    } catch (error) {
      console.error('Load sub users error:', error);
    }
  };

  const loadProperty = async () => {
    try {
      const propertiesString = await AsyncStorage.getItem('properties');
      if (propertiesString) {
        const allProperties = JSON.parse(propertiesString);
        const updatedProperty = allProperties.find(
          (p: Property) => p.id === property.id
        );
        if (updatedProperty) {
          console.log('Property updated:', updatedProperty);
          setCurrentProperty(updatedProperty);
        }
      }
    } catch (error) {
      console.error('Load property error:', error);
    }
  };

  const getDatesBetween = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const isDateInReservations = (date: string): boolean => {
    return reservations.some(reservation => {
      if (reservation.endDate) {
        // Aralık rezervasyonu varsa
        const reservationDates = getDatesBetween(reservation.date, reservation.endDate);
        return reservationDates.includes(date);
      } else {
        // Tek günlük rezervasyon
        return reservation.date === date;
      }
    });
  };

  const updateMarkedDates = () => {
    const marked: any = {};
    
    // Mevcut rezervasyonları işaretle
    reservations.forEach(reservation => {
      if (reservation.endDate) {
        // Aralık rezervasyonu
        const reservationDates = getDatesBetween(reservation.date, reservation.endDate);
        reservationDates.forEach((date, index) => {
          const isFirst = index === 0;
          const isLast = index === reservationDates.length - 1;
          const backgroundColor = getReservationColor(reservation.id);
          
          marked[date] = {
            color: backgroundColor,
            textColor: '#333',
            startingDay: isFirst,
            endingDay: isLast,
          };
        });
      } else {
        // Tek günlük rezervasyon
        const backgroundColor = getReservationColor(reservation.id);
        marked[reservation.date] = {
          color: backgroundColor,
          textColor: '#333',
          startingDay: true,
          endingDay: true,
        };
      }
    });

    // Seçilen tarih aralığını işaretle
    if (startDate && endDate) {
      const rangeDates = getDatesBetween(startDate, endDate);
      rangeDates.forEach((date, index) => {
        const isFirst = index === 0;
        const isLast = index === rangeDates.length - 1;
        
        marked[date] = {
          ...marked[date],
          color: '#E3F2FD',
          textColor: '#007AFF',
          startingDay: isFirst,
          endingDay: isLast,
        };
      });
    } else if (startDate) {
      // Sadece başlangıç tarihi seçili - marked dot ile işaretle (sayı kaymasın)
      if (marked[startDate]?.color) {
        // Rezerve tarihte başlangıç seçimi - period üzerine dot ekle
        marked[startDate] = {
          ...marked[startDate],
          marked: true,
          dotColor: '#007AFF',
        };
      } else {
        // Boş tarihte başlangıç seçimi - yuvarlak period
        marked[startDate] = {
          ...marked[startDate],
          color: '#B3D9FF',
          textColor: '#000',
          startingDay: true,
          endingDay: true,
        };
      }
    }

    // Tek tarih seçimi (rezerve tarih dahil) - marked dot ile işaretle
    if (selectedDate) {
      // Eğer seçilen tarih rezerve ise, hem period hem dot özelliklerini birleştir
      if (marked[selectedDate]?.color) {
        // Rezerve tarihte seçim - period üzerine dot ekle
        marked[selectedDate] = {
          ...marked[selectedDate],
          marked: true,
          dotColor: '#007AFF',
        };
      } else {
        // Boş tarihte seçim - yuvarlak period
        marked[selectedDate] = {
          ...marked[selectedDate],
          color: '#B3D9FF',
          textColor: '#000',
          startingDay: true,
          endingDay: true,
        };
      }
    }

    console.log('Marked dates:', JSON.stringify(marked, null, 2));
    setMarkedDates(marked);
  };

  const onDayPress = (day: any) => {
    const selectedDateStr = day.dateString;
    
    // Önce o tarihte rezervasyon var mı kontrol et
    const dateHasReservation = isDateInReservations(selectedDateStr);
    
    if (dateHasReservation) {
      // Rezerve edilmiş tarihe tıklandı - tek tarih seçimi olarak göster
      setStartDate('');
      setEndDate('');
      setSelectedDate(selectedDateStr);
      console.log('Reserved date selected:', selectedDateStr);
      return;
    }
    
    if (!startDate || (startDate && endDate)) {
      // İlk tıklama veya aralık seçimi sıfırla
      setStartDate(selectedDateStr);
      setEndDate('');
      setSelectedDate(selectedDateStr);
      console.log('Start date selected:', selectedDateStr);
    } else if (startDate && !endDate) {
      // İkinci tıklama - bitiş tarihi
      if (selectedDateStr < startDate) {
        // Eğer bitiş tarihi başlangıçtan küçükse, başlangıç yapı bitiş tarihi
        setStartDate(selectedDateStr);
        setEndDate(startDate);
      } else {
        setEndDate(selectedDateStr);
      }
      setSelectedDate(''); // Tek tarih seçimini temizle
      console.log('End date selected:', selectedDateStr);
      console.log('Date range:', startDate, '-', selectedDateStr);
    }
  };

  const onMonthChange = (month: any) => {
    setCurrentMonth(new Date(month.year, month.month - 1));
  };

  const getReservationsForSelectedDate = () => {
    console.log('Getting reservations for:', { startDate, endDate, selectedDate });
    console.log('Total reservations:', reservations.length);
    
    if (startDate && endDate) {
      // Aralık seçiliyse o aralıktaki rezervasyonları göster
      const filtered = reservations.filter(r => {
        if (r.endDate) {
          // Aralık rezervasyonu - kesişim kontrolü
          return (r.date <= endDate && r.endDate >= startDate);
        } else {
          // Tek günlük rezervasyon
          return r.date >= startDate && r.date <= endDate;
        }
      });
      console.log('Filtered reservations for range:', filtered.length);
      return filtered;
    } else if (selectedDate) {
      const filtered = reservations.filter(r => {
        if (r.endDate) {
          // Aralık rezervasyonu içinde mi?
          return selectedDate >= r.date && selectedDate <= r.endDate;
        } else {
          // Tek günlük rezervasyon
          return r.date === selectedDate;
        }
      });
      console.log('Filtered reservations for single date:', filtered.length);
      return filtered;
    }
    return [];
  };

  const clearSelection = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDate('');
  };

  const getSubUserName = (subUserId?: string): string => {
    if (!subUserId) return 'Ana Kullanıcı';
    const subUser = subUsers.find(su => su.id === subUserId);
    return subUser ? subUser.name : 'Bilinmeyen Kullanıcı';
  };

  // Rezervasyon renkleri
  const reservationColors = [
    '#FFE5E5', // Açık kırmızı
    '#E5F4FF', // Açık mavi
    '#E5FFE5', // Açık yeşil
    '#FFF5E5', // Açık turuncu
    '#F0E5FF', // Açık mor
    '#FFE5F5', // Açık pembe
    '#E5FFFF', // Açık turkuaz
    '#FFFEE5', // Açık sarı
    '#F5E5FF', // Açık lavanta
    '#E5FFE0', // Açık lime
    '#FFE0E5', // Pastel pembe
    '#E0E5FF', // Pastel mavi
  ];

  const getReservationColor = (reservationId: string): string => {
    // Rezervasyon ID'sinden hash oluştur
    let hash = 0;
    for (let i = 0; i < reservationId.length; i++) {
      const char = reservationId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer'a çevir
    }
    // Hash'i pozitif yap ve renk arrayindeki index'e çevir
    const colorIndex = Math.abs(hash) % reservationColors.length;
    return reservationColors[colorIndex];
  };

  // Ayarlar fonksiyonları
  const updateProperty = async (updatedProperty: Property) => {
    try {
      const propertiesString = await AsyncStorage.getItem('properties');
      if (propertiesString) {
        const properties = JSON.parse(propertiesString);
        const updatedProperties = properties.map((p: Property) =>
          p.id === updatedProperty.id ? updatedProperty : p
        );
        await AsyncStorage.setItem('properties', JSON.stringify(updatedProperties));
        setCurrentProperty(updatedProperty);
      }
    } catch (error) {
      console.error('Update property error:', error);
    }
  };

  const handleToggleLock = () => {
    Alert.alert(
      currentProperty.isLocked ? 'Kilidi Aç' : 'Takvimi Kilitle',
      currentProperty.isLocked 
        ? 'Bu takvim için yeni rezervasyonlara izin verilecek.'
        : 'Bu takvim kilitlenecek ve yeni rezervasyon yapılamayacak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: currentProperty.isLocked ? 'Kilidi Aç' : 'Kilitle',
          onPress: () => {
            const updated = { ...currentProperty, isLocked: !currentProperty.isLocked };
            updateProperty(updated);
            setShowSettingsModal(false);
          }
        }
      ]
    );
  };


  const handleEditProperty = () => {
    setShowSettingsModal(false);
    navigation.navigate('Main', {
      screen: 'PropertyManagement',
      params: { editingProperty: currentProperty }
    });
  };

  const handleExportReservations = () => {
    Alert.alert(
      'Dışa Aktarma',
      `${reservations.length} rezervasyon dışa aktarılacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Dışa Aktar',
          onPress: () => {
            // TODO: Export functionality
            Alert.alert(t('info'), 'Export feature coming soon');
          }
        }
      ]
    );
  };

  const handleClearReservations = () => {
    Alert.alert(
      'Tüm Rezervasyonları Sil',
      `Bu işlem ${reservations.length} rezervasyonu kalıcı olarak silecek. Bu işlem geri alınamaz!`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const allReservationsString = await AsyncStorage.getItem('reservations');
              if (allReservationsString) {
                const allReservations = JSON.parse(allReservationsString);
                const filteredReservations = allReservations.filter(
                  (r: Reservation) => r.propertyId !== property.id
                );
                await AsyncStorage.setItem('reservations', JSON.stringify(filteredReservations));
                setReservations([]);
                clearSelection();
                setShowSettingsModal(false);
                Alert.alert(t('success'), 'All reservations deleted');
              }
            } catch (error) {
              console.error('Clear reservations error:', error);
              Alert.alert(t('error'), 'Could not delete reservations');
            }
          }
        }
      ]
    );
  };

  const handleDeleteProperty = () => {
    Alert.alert(
      'Takvimi Sil',
      `"${property.name}" takvimi ve tüm rezervasyonları kalıcı olarak silinecek. Bu işlem geri alınamaz!`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              // Önce rezervasyonları sil
              const allReservationsString = await AsyncStorage.getItem('reservations');
              if (allReservationsString) {
                const allReservations = JSON.parse(allReservationsString);
                const filteredReservations = allReservations.filter(
                  (r: Reservation) => r.propertyId !== property.id
                );
                await AsyncStorage.setItem('reservations', JSON.stringify(filteredReservations));
              }

              // Sonra property'yi sil
              const propertiesString = await AsyncStorage.getItem('properties');
              if (propertiesString) {
                const properties = JSON.parse(propertiesString);
                const filteredProperties = properties.filter(
                  (p: Property) => p.id !== property.id
                );
                await AsyncStorage.setItem('properties', JSON.stringify(filteredProperties));
              }

              setShowSettingsModal(false);
              navigation.goBack();
              Alert.alert(t('success'), 'Calendar deleted');
            } catch (error) {
              console.error('Delete property error:', error);
              Alert.alert(t('error'), 'Could not delete calendar');
            }
          }
        }
      ]
    );
  };

  const getReservationForDate = (date: string): Reservation | null => {
    return reservations.find(r => {
      if (r.endDate) {
        // Aralık rezervasyonu
        return date >= r.date && date <= r.endDate;
      } else {
        // Tek günlük rezervasyon
        return r.date === date;
      }
    }) || null;
  };

  const handleAddReservation = () => {
    if (currentProperty.isLocked) {
      Alert.alert(
        'Takvim Kilitli',
        'Bu takvim kilitli olduğu için yeni rezervasyon yapılamaz. Ayarlardan kilidi açabilirsiniz.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    if (startDate && endDate) {
      navigation.navigate('AddReservation', { 
        selectedDate: startDate,
        endDate: endDate,
        propertyId: property.id 
      });
    } else if (selectedDate) {
      navigation.navigate('AddReservation', { 
        selectedDate, 
        propertyId: property.id 
      });
    } else if (startDate) {
      navigation.navigate('AddReservation', { 
        selectedDate: startDate, 
        propertyId: property.id 
      });
    }
  };

  const handleManageReservation = (reservation: Reservation) => {
    console.log('Managing reservation:', reservation);
    
    Alert.alert(
      'Rezervasyon Yönetimi',
      `"${reservation.title}" rezervasyonunu ne yapmak istiyorsunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Düzenle', 
          onPress: () => {
            console.log('Navigating to edit reservation:', reservation);
            navigation.navigate('AddReservation', { 
              selectedDate: reservation.date,
              endDate: reservation.endDate,
              propertyId: property.id,
              editingReservation: reservation
            });
          }
        },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => handleDeleteReservation(reservation.id)
        }
      ]
    );
  };

  const handleDeleteReservation = async (reservationId: string) => {
    Alert.alert(
      'Rezervasyonu Sil',
      'Bu rezervasyonu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const existingReservationsString = await AsyncStorage.getItem('reservations');
              if (existingReservationsString) {
                const existingReservations = JSON.parse(existingReservationsString);
                const updatedReservations = existingReservations.filter(
                  (r: Reservation) => r.id !== reservationId
                );
                await AsyncStorage.setItem('reservations', JSON.stringify(updatedReservations));
                loadReservations(); // Yeniden yükle
                clearSelection(); // Seçimi temizle
                Alert.alert(t('success'), t('reservationDeleted'));
              }
            } catch (error) {
              console.error('Delete reservation error:', error);
              Alert.alert(t('error'), t('deleteError'));
            }
          }
        }
      ]
    );
  };

  const generateMonths = () => {
    const months = [];
    const today = new Date();
    
    for (let i = -1; i <= 24; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key: monthKey,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        title: date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
      });
    }
    
    return months;
  };

  const renderMonth = ({ item }: any) => (
    <View style={styles.monthContainer}>
      <Text style={styles.monthTitle}>{item.title}</Text>
      <Calendar
        current={`${item.year}-${String(item.month).padStart(2, '0')}-01`}
        onDayPress={onDayPress}
        markedDates={markedDates}
        minDate={new Date().toISOString().split('T')[0]}
        hideArrows
        hideExtraDays
        disableMonthChange
        hideDayNames={false}
        markingType="period"
        firstDay={1}
        theme={{
          selectedDayBackgroundColor: '#B3D9FF', // Açık mavi
          selectedDayTextColor: '#000', // Siyah yazı
          todayTextColor: '#007AFF',
          dayTextColor: '#333',
          textDisabledColor: '#d9e1e8',
          monthTextColor: 'transparent',
          textDayFontSize: 16,
          textMonthFontSize: 0,
          textDayHeaderFontSize: 14,
          calendarBackground: '#FFF',
          'stylesheet.calendar.main': {
            week: {
              marginTop: 7,
              marginBottom: 7,
              flexDirection: 'row',
              justifyContent: 'space-around',
            },
          },
          'stylesheet.day.period': {
            base: {
              overflow: 'hidden',
              height: 34,
              alignItems: 'center',
              width: 38,
            },
          },
          'stylesheet.day.basic': {
            selected: {
              backgroundColor: '#007AFF',
              borderRadius: 17,
              width: 34,
              height: 34,
              justifyContent: 'center',
              alignItems: 'center',
            },
            selectedText: {
              color: '#000', // Siyah yazı
              fontWeight: 'bold',
              fontSize: 16,
            },
            today: {
              backgroundColor: 'transparent',
            },
            todayText: {
              color: '#007AFF',
              fontWeight: 'bold',
            },
          },
        }}
        style={styles.calendar}
      />
    </View>
  );

  const renderReservationItem = ({ item }: { item: Reservation }) => (
    <View style={[styles.reservationItem, { borderLeftColor: getReservationColor(item.id) }]}>
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
      
      <View style={styles.reservationDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅 Tarih:</Text>
          <Text style={styles.detailValue}>
            {item.endDate ? `${item.date} - ${item.endDate}` : item.date}
            {item.endDate && ` (${getDatesBetween(item.date, item.endDate).length} gün)`}
          </Text>
        </View>
        
        {item.startTime && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏰ Saat:</Text>
            <Text style={styles.detailValue}>{item.startTime} - {item.endTime}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>👤 Kişi:</Text>
          <Text style={styles.detailValue}>{getSubUserName(item.subUserId)}</Text>
        </View>
        
        {item.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📝 Not:</Text>
            <Text style={styles.detailValue}>{item.description}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📋 Oluşturma:</Text>
          <Text style={styles.detailValue}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.propertyInfo}>
        <View style={styles.propertyHeader}>
          <View style={styles.propertyMainInfo}>
            <Text style={styles.propertyName}>
              {currentProperty.isLocked && '🔒 '}
              {currentProperty.name}
            </Text>
            {property.address && (
              <Text style={styles.propertyAddress}>{property.address}</Text>
            )}
            <Text style={styles.reservationCount}>
              Toplam {reservations.length} rezervasyon
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={generateMonths()}
        renderItem={renderMonth}
        keyExtractor={item => item.key}
        style={styles.monthsList}
        showsVerticalScrollIndicator={true}
        initialScrollIndex={1}
        getItemLayout={(data, index) => ({
          length: 350,
          offset: 350 * index,
          index,
        })}
      />

      {(selectedDate || (startDate && endDate) || startDate || reservations.length > 0) && (
        <View style={styles.bottomSection}>
          <View style={styles.dateHeader}>
            <View style={styles.dateInfo}>
              {startDate && endDate ? (
                <>
                  <Text style={styles.selectedDateText}>
                    {startDate} - {endDate}
                  </Text>
                  <Text style={styles.selectedDateDay}>
                    ✨ {getDatesBetween(startDate, endDate).length} gün seçildi
                  </Text>
                  <Text style={styles.selectedDateExtra}>
                    {new Date(startDate).toLocaleDateString('tr-TR', { weekday: 'long' })} - {new Date(endDate).toLocaleDateString('tr-TR', { weekday: 'long' })}
                  </Text>
                </>
              ) : startDate ? (
                <>
                  <Text style={styles.selectedDateText}>
                    {startDate} (Başlangıç)
                  </Text>
                  <Text style={styles.selectedDateDay}>
                    👆 Bitiş tarihi seçin
                  </Text>
                  <Text style={styles.selectedDateExtra}>
                    {new Date(startDate).toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.selectedDateText}>{selectedDate}</Text>
                  <Text style={styles.selectedDateDay}>
                    {new Date(selectedDate).toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.buttonContainer}>
              {selectedDate && isDateInReservations(selectedDate) ? (
                // Rezerve edilmiş tarih seçiliyse
                <TouchableOpacity 
                  style={styles.manageButton}
                  onPress={() => {
                    console.log('Manage button pressed for date:', selectedDate);
                    const reservation = getReservationForDate(selectedDate);
                    console.log('Found reservation:', reservation);
                    if (reservation) {
                      handleManageReservation(reservation);
                    } else {
                      Alert.alert(t('error'), 'Reservation not found');
                    }
                  }}
                >
                  <Text style={styles.manageButtonText}>Rezervasyonu Yönet</Text>
                </TouchableOpacity>
              ) : (startDate && endDate) ? (
                // Boş tarih aralığı seçiliyse
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddReservation}
                >
                  <Text style={styles.addButtonText}>Rezervasyon Yap</Text>
                </TouchableOpacity>
              ) : null}
              
              {(startDate || selectedDate) && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.clearButtonText}>Temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Rezervasyon Detayları Bölümü */}
          {(() => {
            let reservation = null;
            let warningMessage = null;

            if (selectedDate) {
              reservation = getReservationForDate(selectedDate);
            } else if (startDate && !endDate) {
              reservation = getReservationForDate(startDate);
            } else if (startDate && endDate) {
              const reservationsInRange = getReservationsForSelectedDate();
              if (reservationsInRange.length > 0) {
                reservation = reservationsInRange[0];
                warningMessage = `⚠️ Bu aralıkta "${reservation.title}" rezervasyonu var`;
              }
            }

            if (reservation || warningMessage) {
              return (
                <View style={[styles.reservationInfoSection, reservation && { borderLeftColor: getReservationColor(reservation.id) }]}>
                  {warningMessage && (
                    <Text style={styles.warningMessage}>{warningMessage}</Text>
                  )}
                  {reservation && (
                    <>
                      <Text style={styles.reservationInfoTitle}>
                        {reservation.title}
                      </Text>
                      {reservation.description && (
                        <Text style={styles.reservationInfoNote}>
                          {reservation.description}
                        </Text>
                      )}
                      <Text style={styles.reservationInfoPerson}>
                        👤 {getSubUserName(reservation.subUserId)}
                      </Text>
                    </>
                  )}
                </View>
              );
            }
            return null;
          })()}

          {(selectedDate || startDate || endDate) ? (
            <FlatList
              data={getReservationsForSelectedDate()}
              renderItem={renderReservationItem}
              keyExtractor={item => item.id}
              style={styles.reservationsList}
              ListEmptyComponent={
                <View style={styles.emptyReservations}>
                  <Text style={styles.emptyText}>Bu tarihte rezervasyon yok</Text>
                  {(startDate && endDate) && (
                    <TouchableOpacity 
                      style={styles.addEmptyButton}
                      onPress={handleAddReservation}
                    >
                      <Text style={styles.addEmptyButtonText}>Rezervasyon Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          ) : (
            <View style={styles.allReservationsContainer}>
              <Text style={styles.allReservationsTitle}>
                Tüm Rezervasyonlar ({reservations.length})
              </Text>
              <FlatList
                data={reservations}
                renderItem={renderReservationItem}
                keyExtractor={item => item.id}
                style={styles.reservationsList}
                ListEmptyComponent={
                  <View style={styles.emptyReservations}>
                    <Text style={styles.emptyText}>Henüz rezervasyon yok</Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      )}

      {/* Ayarlar Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Text style={styles.cancelButton}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Takvim Ayarları</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Durum Ayarları */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Durum</Text>
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => handleToggleLock()}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🔒</Text>
                  <View>
                    <Text style={styles.settingTitle}>
                      {currentProperty.isLocked ? 'Kilidi Aç' : 'Kilitle'}
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      {currentProperty.isLocked 
                        ? 'Yeni rezervasyonlara izin ver' 
                        : 'Yeni rezervasyonları engelle'
                      }
                    </Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>→</Text>
              </TouchableOpacity>

            </View>

            {/* Yönetim Ayarları */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Yönetim</Text>
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => handleEditProperty()}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>✏️</Text>
                  <View>
                    <Text style={styles.settingTitle}>Düzenle</Text>
                    <Text style={styles.settingSubtitle}>İsim, açıklama ve adres</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => handleExportReservations()}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>📤</Text>
                  <View>
                    <Text style={styles.settingTitle}>Dışa Aktar</Text>
                    <Text style={styles.settingSubtitle}>Rezervasyonları dışa aktar</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Tehlikeli İşlemler */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Tehlikeli İşlemler</Text>
              
              <TouchableOpacity 
                style={[styles.settingItem, styles.dangerItem]}
                onPress={() => handleClearReservations()}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🗑️</Text>
                  <View>
                    <Text style={[styles.settingTitle, styles.dangerText]}>
                      Tüm Rezervasyonları Sil
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Bu işlem geri alınamaz
                    </Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.settingItem, styles.dangerItem]}
                onPress={() => handleDeleteProperty()}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🗑️</Text>
                  <View>
                    <Text style={[styles.settingTitle, styles.dangerText]}>
                      Takvimi Sil
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Takvim ve tüm rezervasyonları sil
                    </Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>→</Text>
              </TouchableOpacity>
            </View>
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
  propertyInfo: {
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  propertyMainInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  settingsIcon: {
    fontSize: 20,
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
  monthsList: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  monthContainer: {
    marginVertical: 10,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  calendar: {
    paddingHorizontal: 15,
  },
  bottomSection: {
    backgroundColor: '#FFF',
    maxHeight: 650,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: -80,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateInfo: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
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
  selectedDateExtra: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '600',
  },
  selectedDateNote: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  selectedDatePerson: {
    fontSize: 11,
    color: '#333',
    marginTop: 2,
    fontWeight: '500',
  },
  reservationInfoSection: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  warningMessage: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  reservationInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  reservationInfoNote: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 10,
    fontStyle: 'italic',
  },
  reservationInfoPerson: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  clearButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  manageButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  manageButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reservationsList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  reservationItem: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reservationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  reservationDetails: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    width: 85,
    marginRight: 12,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    lineHeight: 22,
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
  emptyReservations: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  addEmptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addEmptyButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  allReservationsContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  allReservationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingVertical: 5,
    textAlign: 'center',
  },
  // Modal styles
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
  placeholder: {
    width: 50,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  settingsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingLeft: 5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  settingArrow: {
    fontSize: 18,
    color: '#CCC',
  },
  dangerItem: {
    backgroundColor: '#FFF5F5',
  },
  dangerText: {
    color: '#FF3B30',
  },
});

export default SimplePropertyCalendarScreen;