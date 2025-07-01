import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const SettingsScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = async (lang: 'tr' | 'en') => {
    await setLanguage(lang);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          
          <TouchableOpacity
            style={[
              styles.languageOption,
              language === 'tr' && styles.languageOptionActive
            ]}
            onPress={() => handleLanguageChange('tr')}
          >
            <Text style={[
              styles.languageText,
              language === 'tr' && styles.languageTextActive
            ]}>
              🇹🇷 {t('turkish')}
            </Text>
            {language === 'tr' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageOption,
              language === 'en' && styles.languageOptionActive
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={[
              styles.languageText,
              language === 'en' && styles.languageTextActive
            ]}>
              🇺🇸 {t('english')}
            </Text>
            {language === 'en' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  languageOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  languageText: {
    fontSize: 16,
    color: '#666',
  },
  languageTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default SettingsScreen;