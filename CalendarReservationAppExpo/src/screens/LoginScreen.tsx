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

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const { state, login, register } = useAuth();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Hata', 'İşletme adı ve şifre gerekli');
      return;
    }

    if (!isLoginMode && !email.trim()) {
      Alert.alert('Hata', 'E-posta adresi gerekli');
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
          'Hata', 
          isLoginMode 
            ? 'Geçersiz işletme adı veya şifre. Sadece onaylanmış kullanıcılar giriş yapabilir.' 
            : 'Bu işletme adı veya e-posta zaten kayıtlı. Lütfen farklı bilgiler deneyin.'
        );
      } else if (!isLoginMode) {
        // Registration successful - show pending approval message
        Alert.alert(
          'Kayıt Başarılı',
          'Hesabınız oluşturuldu. Giriş yapabilmeniz için sistem yöneticisinin onayını beklemeniz gerekiyor. Onay aldıktan sonra işletme adı ve şifrenizle giriş yapabilirsiniz.',
          [{ text: 'Tamam' }]
        );
        // Reset to login mode
        setIsLoginMode(true);
        setEmail('');
        setUsername('');
        setPassword('');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <View style={styles.brandingSection}>
          <Text style={styles.appName}>ReservaHub</Text>
          <View style={styles.categoryContainer}>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryText}>Ev</Text>
            </View>
            <View style={styles.categorySeparator} />
            <View style={styles.categoryItem}>
              <Text style={styles.categoryText}>Konut</Text>
            </View>
            <View style={styles.categorySeparator} />
            <View style={styles.categoryItem}>
              <Text style={styles.categoryText}>Oda</Text>
            </View>
          </View>
          <Text style={styles.appTagline}>Rezervasyon Yönetimi</Text>
        </View>
        
        <Text style={styles.title}>
          {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="İşletme Adı"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        {!isLoginMode && (
          <TextInput
            style={styles.input}
            placeholder="E-posta"
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
          placeholder="Şifre"
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
              {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => setIsLoginMode(!isLoginMode)}
        >
          <Text style={styles.linkText}>
            {isLoginMode 
              ? 'Hesabınız yok mu? Kayıt olun' 
              : 'Zaten hesabınız var mı? Giriş yapın'}
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