import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const { state, login, register } = useAuth();
  const { t, tNested, language, setLanguage } = useLanguage();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('error'), t('fieldsRequired'));
      return;
    }

    if (!isLoginMode && !email.trim()) {
      Alert.alert(t('error'), t('emailRequired'));
      return;
    }

    try {
      let success = false;
      if (isLoginMode) {
        success = await login(username, password);
      } else {
        success = await register(username, email, password);
      }

      if (!success) {
        Alert.alert(
          t('error'), 
          isLoginMode 
            ? t('invalidCredentials')
            : t('userAlreadyExists')
        );
      } else if (!isLoginMode) {
        // Registration successful - show pending approval message
        Alert.alert(
          t('registrationSuccess'),
          t('pendingApproval'),
          [{ text: t('ok') }]
        );
        // Reset to login mode
        setIsLoginMode(true);
        setEmail('');
        setUsername('');
        setPassword('');
      }
    } catch (error) {
      Alert.alert(t('error'), t('genericError'));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Language Selector */}
      <View style={styles.languageSelector}>
        <TouchableOpacity
          style={[
            styles.flagButton,
            language === 'tr' && styles.flagButtonActive
          ]}
          onPress={() => setLanguage('tr')}
        >
          <Text style={styles.flagText}>🇹🇷</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.flagButton,
            language === 'en' && styles.flagButtonActive
          ]}
          onPress={() => setLanguage('en')}
        >
          <Text style={styles.flagText}>🇺🇸</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.brandingSection}>
          <Text style={styles.appName}>{t('appName')}</Text>
          <View style={styles.categoryContainer}>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryText}>{tNested('categories.house')}</Text>
            </View>
            <View style={styles.categorySeparator} />
            <View style={styles.categoryItem}>
              <Text style={styles.categoryText}>{tNested('categories.residence')}</Text>
            </View>
            <View style={styles.categorySeparator} />
            <View style={styles.categoryItem}>
              <Text style={styles.categoryText}>{tNested('categories.room')}</Text>
            </View>
          </View>
          <Text style={styles.appTagline}>{t('appTagline')}</Text>
        </View>
        
        <Text style={styles.title}>
          {isLoginMode ? t('login') : t('register')}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder={t('businessName')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        {!isLoginMode && (
          <TextInput
            style={styles.input}
            placeholder={t('email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit}
          disabled={state.isLoading}
        >
          {state.isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isLoginMode ? t('login') : t('register')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => setIsLoginMode(!isLoginMode)}
        >
          <Text style={styles.linkText}>
            {isLoginMode 
              ? t('noAccount')
              : t('alreadyHaveAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  languageSelector: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    zIndex: 1000,
  },
  flagButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flagButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flagText: {
    fontSize: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#F8F9FA',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
    marginBottom: 15,
    letterSpacing: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  categoryItem: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  categoryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categorySeparator: {
    width: 8,
    height: 2,
    backgroundColor: '#007AFF',
    marginHorizontal: 8,
    opacity: 0.6,
  },
  appTagline: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default LoginScreen;