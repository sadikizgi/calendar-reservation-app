import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextInput,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import firebaseService from '../services/firebaseService';

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
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [selectedDateForPrice, setSelectedDateForPrice] = useState('');
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

  // Navigation başlığını ev ismi yap
  useEffect(() => {
    navigation.setOptions({
      title: currentProperty.name,
    });
  }, [currentProperty.name, navigation]);

  const loadReservations = async () => {
    try {
      if (!state.user?.id) return;
      
      console.log('Loading reservations for user:', state.user.id, 'property:', property.id);
      
      if (state.user.role === 'master') {
        // Master user - AsyncStorage kullan
        const reservationsString = await AsyncStorage.getItem('reservations');
        console.log('Raw reservations from AsyncStorage:', reservationsString);
        if (reservationsString) {
          const allReservations = JSON.parse(reservationsString);
          console.log('All reservations:', allReservations.length);
          const propertyReservations = allReservations.filter(
            (r: Reservation) => r.propertyId === property.id
          );
          console.log('Property reservations for', property.id, ':', propertyReservations.length);
          setReservations(propertyReservations);
        } else {
          console.log('No reservations in AsyncStorage');
          setReservations([]);
        }
      } else {
        // Firebase user - Firebase'den çek
        const allUserReservations = await firebaseService.getReservations(state.user.id);
        console.log('All Firebase reservations:', allUserReservations.length);
        
        const propertyReservations = allUserReservations.filter(
          (r: Reservation) => r.propertyId === property.id
        );
        console.log('Property reservations for', property.id, ':', propertyReservations.length);
        console.log('Property reservations:', propertyReservations);
        setReservations(propertyReservations);
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
      if (state.user?.role === 'master') {
        // Master user - AsyncStorage kullan
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
      } else {
        // Firebase user - Firebase'den güncel property'yi çek
        if (state.user?.id) {
          const userProperties = await firebaseService.getProperties(state.user.id);
          const updatedProperty = userProperties.find(p => p.id === property.id);
          if (updatedProperty) {
            console.log('Firebase property updated:', updatedProperty);
            setCurrentProperty(updatedProperty);
          }
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

  const isDateInReservations = useCallback((date: string): boolean => {
    return reservations.some(reservation => {
      if (reservation.endDate) {
        return date >= reservation.date && date <= reservation.endDate;
      } else {
        return reservation.date === date;
      }
    });
  }, [reservations]);

  const updateMarkedDates = useCallback(() => {
    const marked: any = {};
    
    // Mevcut rezervasyonları işaretle
    reservations.forEach(reservation => {
      const backgroundColor = getReservationColor(reservation.id);
      
      if (reservation.endDate) {
        // Aralık rezervasyonu
        const reservationDates = getDatesBetween(reservation.date, reservation.endDate);
        reservationDates.forEach((date, index) => {
          marked[date] = {
            color: backgroundColor,
            textColor: '#333',
            startingDay: index === 0,
            endingDay: index === reservationDates.length - 1,
          };
        });
      } else {
        // Tek günlük rezervasyon
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
        marked[date] = {
          ...marked[date],
          color: '#E3F2FD',
          textColor: '#007AFF',
          startingDay: index === 0,
          endingDay: index === rangeDates.length - 1,
        };
      });
    } else if (startDate) {
      // Başlangıç tarihi seçili
      marked[startDate] = marked[startDate]?.color 
        ? { ...marked[startDate], marked: true, dotColor: '#007AFF' }
        : { ...marked[startDate], color: '#B3D9FF', textColor: '#000', startingDay: true, endingDay: true };
    }

    // Tek tarih seçimi
    if (selectedDate) {
      marked[selectedDate] = marked[selectedDate]?.color 
        ? { ...marked[selectedDate], marked: true, dotColor: '#007AFF' }
        : { ...marked[selectedDate], color: '#B3D9FF', textColor: '#000', startingDay: true, endingDay: true };
    }

    setMarkedDates(marked);
  }, [reservations, selectedDate, startDate, endDate]);

  const onDayPress = useCallback((day: any) => {
    const selectedDateStr = day.dateString;
    
    // Önce o tarihte rezervasyon var mı kontrol et
    const dateHasReservation = isDateInReservations(selectedDateStr);
    
    if (dateHasReservation) {
      // Rezerve edilmiş tarihe tıklandı - tek tarih seçimi olarak göster
      setStartDate('');
      setEndDate('');
      setSelectedDate(selectedDateStr);
      return;
    }
    
    if (!startDate || (startDate && endDate)) {
      // İlk tıklama veya aralık seçimi sıfırla
      setStartDate(selectedDateStr);
      setEndDate('');
      setSelectedDate(selectedDateStr);
    } else if (startDate && !endDate) {
      // İkinci tıklama - bitiş tarihi
      if (selectedDateStr < startDate) {
        // Geriye gidildi - yeni başlangıç tarihi yap
        setStartDate(selectedDateStr);
        setEndDate('');
        setSelectedDate(selectedDateStr);
      } else {
        // İleriye gidildi - arada rezervasyon var mı kontrol et
        const datesInRange = getDatesBetween(startDate, selectedDateStr);
        const hasReservationInRange = datesInRange.some(date => isDateInReservations(date));
        
        if (hasReservationInRange) {
          // Arada rezervasyon var - yeni başlangıç tarihi yap
          setStartDate(selectedDateStr);
          setEndDate('');
          setSelectedDate(selectedDateStr);
        } else {
          // Arada rezervasyon yok - normal bitiş tarihi
          setEndDate(selectedDateStr);
          setSelectedDate('');
        }
      }
    }
  }, [startDate, endDate, selectedDate, reservations]);

  const onMonthChange = (month: any) => {
    setCurrentMonth(new Date(month.year, month.month - 1));
  };

  const getReservationsForSelectedDate = () => {
    if (startDate && endDate) {
      // Aralık seçiliyse o aralıktaki rezervasyonları göster
      return reservations.filter(r => {
        if (r.endDate) {
          // Aralık rezervasyonu - kesişim kontrolü
          return (r.date <= endDate && r.endDate >= startDate);
        } else {
          // Tek günlük rezervasyon
          return r.date >= startDate && r.date <= endDate;
        }
      });
    } else if (selectedDate) {
      return reservations.filter(r => {
        if (r.endDate) {
          // Aralık rezervasyonu içinde mi?
          return selectedDate >= r.date && selectedDate <= r.endDate;
        } else {
          // Tek günlük rezervasyon
          return r.date === selectedDate;
        }
      });
    }
    return [];
  };

  const clearSelection = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDate('');
  };

  // Fiyat yönetim fonksiyonları
  const getPriceForDate = useCallback((date: string): number | null => {
    if (!currentProperty.pricing) return null;
    
    // Önce o tarihe özel fiyat var mı bak
    if (currentProperty.pricing.dailyPrices?.[date]) {
      return currentProperty.pricing.dailyPrices[date];
    }
    
    // Yoksa default fiyatı dön
    return currentProperty.pricing.defaultPrice || null;
  }, [currentProperty.pricing]);

  const formatPrice = (price: number | null): string => {
    if (!price) return '';
    const currency = currentProperty.pricing?.currency || '₺';
    return `${price}${currency}`;
  };

  // Bugünün tarihini memoize et
  const todayString = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const handleAddPrice = () => {
    
    if (selectedDate && !isDateInReservations(selectedDate)) {
      // Tek tarih seçimi
      setSelectedDateForPrice(selectedDate);
      const existingPrice = getPriceForDate(selectedDate);
      setPriceInput(existingPrice ? existingPrice.toString() : '');
      setShowPriceModal(true);
    } else if (startDate && endDate) {
      // Tarih aralığı seçimi
      const reservationsInRange = getReservationsForSelectedDate();
      if (reservationsInRange.length === 0) {
        // Tarih aralığını düzgün formatta set et
        const rangeText = `${startDate} ile ${endDate} arası`;
        setSelectedDateForPrice(rangeText);
        setPriceInput('');
        setShowPriceModal(true);
      } else {
        Alert.alert('Uyarı', 'Seçili aralıkta rezervasyon var');
      }
    } else {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tarih veya tarih aralığı seçin');
    }
  };

  const saveDailyPrice = async () => {
    if (!priceInput.trim()) {
      Alert.alert('Hata', 'Fiyat giriniz');
      return;
    }

    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Hata', 'Geçerli bir fiyat giriniz');
      return;
    }

    try {
      let updatedProperty: Property = currentProperty;
      
      if (state.user?.role === 'master') {
        // Master user - AsyncStorage kullan
        const propertiesString = await AsyncStorage.getItem('properties');
        if (propertiesString) {
          const allProperties = JSON.parse(propertiesString);
          const updatedProperties = allProperties.map((p: Property) => {
            if (p.id === currentProperty.id) {
              const updated = {
                ...p,
                pricing: {
                  ...p.pricing,
                  defaultPrice: p.pricing?.defaultPrice,
                  currency: p.pricing?.currency || '₺',
                  dailyPrices: {
                    ...p.pricing?.dailyPrices,
                  }
                }
              };

              // Tarih aralığı mı tek tarih mi kontrol et
              if (selectedDateForPrice.includes('arası')) {
                // "2024-01-01 ile 2024-01-05 arası" formatından tarihleri çıkar
                const parts = selectedDateForPrice.split(' ile ');
                const startDateStr = parts[0];
                const endDateStr = parts[1].split(' arası')[0];
                
                const dates = getDatesBetween(startDateStr, endDateStr);
                dates.forEach(date => {
                  updated.pricing.dailyPrices[date] = price;
                });
              } else {
                // Tek tarih
                updated.pricing.dailyPrices[selectedDateForPrice] = price;
              }

              return updated;
            }
            return p;
          });

          await AsyncStorage.setItem('properties', JSON.stringify(updatedProperties));
          const foundProperty = updatedProperties.find((p: Property) => p.id === currentProperty.id);
          if (foundProperty) {
            updatedProperty = foundProperty;
          }
        }
      } else {
        // Firebase user - Firebase'de güncelle
        const updated = {
          ...currentProperty,
          pricing: {
            ...currentProperty.pricing,
            defaultPrice: currentProperty.pricing?.defaultPrice,
            currency: currentProperty.pricing?.currency || '₺',
            dailyPrices: {
              ...currentProperty.pricing?.dailyPrices,
            }
          }
        };

        // Tarih aralığı mı tek tarih mi kontrol et
        if (selectedDateForPrice.includes('arası')) {
          // "2024-01-01 ile 2024-01-05 arası" formatından tarihleri çıkar
          const parts = selectedDateForPrice.split(' ile ');
          const startDateStr = parts[0];
          const endDateStr = parts[1].split(' arası')[0];
          
          const dates = getDatesBetween(startDateStr, endDateStr);
          dates.forEach(date => {
            updated.pricing.dailyPrices[date] = price;
          });
        } else {
          // Tek tarih
          updated.pricing.dailyPrices[selectedDateForPrice] = price;
        }

        await firebaseService.updateProperty(currentProperty.id, { pricing: updated.pricing });
        updatedProperty = updated;
      }
      
      // Current property'yi güncelle
      setCurrentProperty(updatedProperty);
      
      // Modal'ı kapat
      setShowPriceModal(false);
      setPriceInput('');
      setSelectedDateForPrice('');
      
      const dateText = selectedDateForPrice.includes('arası') ? 'seçili tarihlere' : 'seçili tarihe';
      Alert.alert('Başarılı', `Fiyat ${dateText} eklendi`);
      
      // Property'yi yeniden yükle ve takvimi yenile
      await loadProperty();
      updateMarkedDates();
    } catch (error) {
      console.error('Save price error:', error);
      Alert.alert('Hata', 'Fiyat kaydedilemedi');
    }
  };


  const getSubUserName = (subUserId?: string): string => {
    if (!subUserId) return 'Ana Kullanıcı';
    const subUser = subUsers.find(su => su.id === subUserId);
    return subUser ? subUser.name : 'Bilinmeyen Kullanıcı';
  };

  // Rezervasyon renkleri - Genişletilmiş palet
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
    '#FFE5CC', // Açık şeftali
    '#CCFFE5', // Açık nane
    '#E5CCFF', // Açık eflatun
    '#FFCCCC', // Pastel kırmızı
    '#CCFFFF', // Açık cyan
    '#FFFFCC', // Açık fildişi
    '#CCFFCC', // Pastel yeşil
    '#FFCCFF', // Pastel magenta
    '#CCE5FF', // Bebek mavisi
    '#FFE5FF', // Açık orkide
    '#E5FFCC', // Açık kireç
    '#FFCCF5', // Açık gül
    '#CCF5FF', // Açık gökyüzü
    '#F5FFCC', // Açık vanilya
    '#FFCCEE', // Açık fuşya
    '#CCFFF5', // Açık su yeşili
    '#EECCFF', // Açık ametist
    '#FFF5CC', // Açık krem
  ];

  const getReservationColor = (reservationId: string): string => {
    // Gelişmiş hash algoritması - daha iyi dağılım için
    let hash = 0;
    let hash2 = 5381; // djb2 hash başlangıç değeri
    
    for (let i = 0; i < reservationId.length; i++) {
      const char = reservationId.charCodeAt(i);
      // Birinci hash (FNV-1a benzeri)
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
      // İkinci hash (djb2)
      hash2 = ((hash2 << 5) + hash2) + char;
    }
    
    // İki hash'i kombine et
    const combinedHash = Math.abs(hash ^ hash2);
    // Property ID'sini de ekleyerek daha unique dağılım sağla
    const propertyHash = property.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const finalHash = combinedHash + propertyHash;
    
    const colorIndex = Math.abs(finalHash) % reservationColors.length;
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
    
    // Geçmiş 3 ay + mevcut ay + gelecek 24 ay
    for (let i = -3; i <= 24; i++) {
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
        hideArrows
        hideExtraDays
        disableMonthChange
        hideDayNames={false}
        markingType="period"
        firstDay={1}
        dayComponent={({date, state}) => {
          if (!date) return null;
          
          const dateString = date.dateString;
          const isDisabled = state === 'disabled';
          const isPastDate = dateString < todayString;
          const markData = markedDates[dateString];
          const isToday = dateString === todayString;
          
          // Hızlı stil hesaplama
          let containerStyle = styles.dayContainer;
          let textStyle = styles.dayText;
          let priceStyle = styles.priceText;
          
          if (isPastDate && !markData?.color) {
            // Sadece geçmiş günlerde ve rezervasyon yoksa soluklaştır
            containerStyle = [containerStyle, styles.disabledDayContainer];
            textStyle = [textStyle, styles.disabledDayText];
            priceStyle = [priceStyle, styles.disabledPriceText];
          } else if (markData?.color) {
            // Rezervasyon stili
            containerStyle = [containerStyle, {
              backgroundColor: markData.color,
              borderTopLeftRadius: markData.startingDay ? 8 : 0,
              borderBottomLeftRadius: markData.startingDay ? 8 : 0,
              borderTopRightRadius: markData.endingDay ? 8 : 0,
              borderBottomRightRadius: markData.endingDay ? 8 : 0,
              width: 60,
              marginLeft: -11,
              marginRight: -11,
            }];
            textStyle = [textStyle, styles.reservedDayText];
            priceStyle = [priceStyle, styles.reservedPriceText];
          } else if (selectedDate === dateString || markData?.marked) {
            containerStyle = [containerStyle, styles.selectedDayContainer];
            textStyle = [textStyle, styles.selectedDayText];
            priceStyle = [priceStyle, styles.selectedPriceText];
          }
          
          if (isToday) {
            textStyle = [textStyle, styles.todayText];
            priceStyle = [priceStyle, styles.todayPriceText];
          }

          return (
            <View style={containerStyle}>
              <TouchableOpacity 
                style={styles.dayTouchable}
                onPress={(isPastDate && !markData?.color) ? undefined : () => onDayPress(date)}
                disabled={isPastDate && !markData?.color}
              >
                {isToday && <View style={styles.todayCircle} />}
                <Text style={textStyle}>{date.day}</Text>
                {/* Normal günlerde fiyatı içinde göster */}
                {!isToday && currentProperty.pricing?.dailyPrices?.[dateString] && (
                  <Text style={priceStyle}>
                    {currentProperty.pricing.dailyPrices[dateString]}{currentProperty.pricing?.currency || '₺'}
                  </Text>
                )}
                {!isToday && !currentProperty.pricing?.dailyPrices?.[dateString] && currentProperty.pricing?.defaultPrice && (
                  <Text style={priceStyle}>
                    {currentProperty.pricing.defaultPrice}{currentProperty.pricing?.currency || '₺'}
                  </Text>
                )}
              </TouchableOpacity>
              {/* Bugünün fiyatını yuvarlağın altında göster */}
              {isToday && currentProperty.pricing?.dailyPrices?.[dateString] && (
                <Text style={styles.todayPriceOutside}>
                  {currentProperty.pricing.dailyPrices[dateString]}{currentProperty.pricing?.currency || '₺'}
                </Text>
              )}
              {isToday && !currentProperty.pricing?.dailyPrices?.[dateString] && currentProperty.pricing?.defaultPrice && (
                <Text style={styles.todayPriceOutside}>
                  {currentProperty.pricing.defaultPrice}{currentProperty.pricing?.currency || '₺'}
                </Text>
              )}
            </View>
          );
        }}
        theme={{
          selectedDayBackgroundColor: 'transparent',
          selectedDayTextColor: '#000',
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
              paddingHorizontal: 15,
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
        initialScrollIndex={3}
        removeClippedSubviews={false}
        getItemLayout={(data, index) => ({
          length: 450,
          offset: 450 * index,
          index,
        })}
        snapToInterval={450}
        snapToAlignment="start"
        decelerationRate="fast"
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
              ) : startDate ? (
                // Sadece başlangıç tarihi seçiliyse
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddReservation}
                >
                  <Text style={styles.addButtonText}>Tek Gün Rezervasyon</Text>
                </TouchableOpacity>
              ) : null}
              
              {(startDate || selectedDate) && (
                <TouchableOpacity 
                  style={styles.priceButton}
                  onPress={handleAddPrice}
                >
                  <Text style={styles.priceButtonText}>Fiyat Ekle</Text>
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

      {/* Fiyat Ekleme Modalı */}
      <Modal
        visible={showPriceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPriceModal(false)}>
              <Text style={styles.cancelButton}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Fiyat Ekle</Text>
            <TouchableOpacity onPress={saveDailyPrice}>
              <Text style={styles.saveButton}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.priceModalInfo}>
              <Text style={styles.priceModalDate}>
                📅 {selectedDateForPrice || 'Tarih seçilmedi'}
              </Text>
              {selectedDateForPrice && selectedDateForPrice.includes('arası') && (
                <Text style={styles.priceModalSubtitle}>
                  Bu tarih aralığındaki tüm günler için aynı fiyat uygulanacak
                </Text>
              )}
            </View>
            
            <TextInput
              style={styles.priceModalInput}
              placeholder="Fiyat giriniz"
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="numeric"
              autoFocus
            />
            
            <Text style={styles.priceModalNote}>
              Para birimi: {currentProperty.pricing?.currency || '₺'}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  manageButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
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
  // Fiyat butonu stili
  priceButton: {
    backgroundColor: '#00B383',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  priceButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Fiyat modalı stilleri
  priceModalInfo: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  priceModalDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  priceModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  priceModalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  priceModalNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Day component styles
  dayContainer: {
    width: 38,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayContainer: {
    backgroundColor: '#E3F2FD',
  },
  selectedDayContainer: {
    backgroundColor: '#B3D9FF',
  },
  startingDayContainer: {
    backgroundColor: '#E3F2FD',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  endingDayContainer: {
    backgroundColor: '#E3F2FD',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  periodMiddleContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 0,
  },
  reservedDayContainer: {
    backgroundColor: '#FFE6E6',
    borderRadius: 0, // Reservations should be continuous
  },
  disabledDayContainer: {
    opacity: 0.7,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  todayText: {
    color: '#FFF',
    fontWeight: 'bold',
    zIndex: 2,
  },
  selectedDayText: {
    color: '#000',
    fontWeight: 'bold',
  },
  reservedDayText: {
    color: '#333',
  },
  disabledDayText: {
    color: '#d9e1e8',
  },
  priceText: {
    fontSize: 9,
    color: '#666',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 10,
  },
  selectedPriceText: {
    color: '#666',
    fontWeight: 'bold',
  },
  reservedPriceText: {
    color: '#666',
    fontWeight: 'bold',
  },
  disabledPriceText: {
    color: '#d9e1e8',
  },
  todayCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    top: '50%',
    left: '50%',
    marginTop: -11,
    marginLeft: -12,
    zIndex: 1,
  },
  todayPriceText: {
    color: '#FFF',
    fontWeight: 'bold',
    zIndex: 2,
  },
  todayPriceOutside: {
    color: '#666',
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -25,
    width: 50,
    textAlign: 'center',
    zIndex: 3,
    fontSize: 9,
    lineHeight: 10,
  },
});

export default SimplePropertyCalendarScreen;