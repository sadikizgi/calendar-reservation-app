import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { User, AuthState } from '../types';
import { auth } from '../config/firebase';
import firebaseService, { UserProfile } from '../services/firebaseService';

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, businessName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addEmployee: (email: string) => Promise<void>;
  getPendingUsers: () => Promise<UserProfile[]>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  unapproveUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserActive: (userId: string, isActive: boolean) => Promise<void>;
  getApprovedUsers: () => Promise<UserProfile[]>;
}

type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔴 AuthContext: Auth state changed, user:', firebaseUser?.email || 'null');
      console.log('🔴 AuthContext: IMPORTANT - This listener should ONLY READ, NEVER WRITE to Firestore');
      
      if (firebaseUser) {
        try {
          console.log('AuthContext: Getting user profile for:', firebaseUser.uid);
          
          // Eğer kayıt işlemi devam ediyorsa müdahale etme
          if (isRegistering) {
            console.log('AuthContext: Registration in progress, ignoring auth state change');
            return;
          }
          
          // Firebase user var, profil bilgilerini getir
          const userProfile = await firebaseService.getUserProfile(firebaseUser.uid);
          console.log('AuthContext: User profile received:', userProfile);
          console.log('AuthContext: Profile check details:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            profileStatus: userProfile.status,
            profileIsApproved: userProfile.isApproved,
            profileIsActive: userProfile.isActive
          });
          
          // Kullanıcı onaylanmış ve aktif mi kontrol et
          // Ancak status="pending" olan kullanıcılar için de onay kontrolü yap
          const isNotApproved = userProfile.status === 'pending' || (!userProfile.isApproved || userProfile.isApproved === false);
          
          if (isNotApproved || userProfile.isActive === false) {
            console.log('AuthContext: User not approved or not active, signing out:', userProfile.isApproved, userProfile.isActive, userProfile.status);
            // Kullanıcı onaylanmamış veya aktif değilse çıkış yap
            await firebaseService.signOut();
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          console.log('AuthContext: User approved, setting user state');
          
          // Eğer zaten user set edilmişse tekrar set etme
          if (state.user && state.user.id === userProfile.id) {
            console.log('AuthContext: User already set, skipping');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          // User interface'ine dönüştür
          const user: User = {
            id: userProfile.id,
            username: userProfile.businessName || userProfile.email,
            email: userProfile.email,
            password: '', // Firebase'de şifre saklanmaz
            role: userProfile.role === 'master' ? 'master' : 'admin', // Firebase'deki role'ü kullan
            isActive: (userProfile.isApproved === true || userProfile.status !== 'pending') && (userProfile.isActive === undefined || userProfile.isActive === true),
            businessId: userProfile.id, // User'ın kendi ID'si business ID olur
            createdAt: userProfile.createdAt,
            updatedAt: new Date(),
            lastLoginAt: new Date()
          };
          
          console.log('AuthContext: Dispatching SET_USER with:', user);
          dispatch({ type: 'SET_USER', payload: user });
        } catch (error) {
          console.error('AuthContext: User profile fetch error:', error);
          // Hata varsa çıkış yap
          await firebaseService.signOut();
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('AuthContext: No Firebase user, checking local auth');
        // Master user kontrolü (offline mod)
        await checkLocalAuth();
      }
    });

    return unsubscribe;
  }, []);

  const checkLocalAuth = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        // Sadece master user'a izin ver
        if (user.role === 'master') {
          dispatch({ type: 'SET_USER', payload: user });
          return;
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Local auth check error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('Login attempt:', email);
      
      // Master user kontrolü (offline mod)
      if (email.toLowerCase() === 'master' && password === '805046800') {
        console.log('Master login detected');
        
        // Master kullanıcıyı Firebase'e de kaydet/giriş yap
        try {
          console.log('Attempting Firebase login for master...');
          await firebaseService.signIn('master@system.local', '805046800');
          console.log('Master Firebase login successful');
        } catch (firebaseError: any) {
          console.log('Master Firebase login failed, trying to create account:', firebaseError.message);
          try {
            console.log('Creating master Firebase account...');
            await firebaseService.signUpSimple('master@system.local', '805046800', 'Master System');
            console.log('Master account created successfully');
          } catch (createError: any) {
            console.log('Master account creation failed (probably already exists) - silently continuing');
          }
          
          // Tekrar giriş yapmayı dene - şimdi profil de oluşturulmuş olmalı
          try {
            await firebaseService.signIn('master@system.local', '805046800');
            console.log('Master Firebase login after account/profile creation successful');
          } catch (secondLoginError: any) {
            console.log('Second master login attempt failed:', secondLoginError.message);
            // Firebase başarısız olursa offline mode devam et
          }
        }
        
        const masterUser: User = {
          id: 'master-user-id',
          username: 'master',
          email: 'master@system.local',
          password: '805046800',
          role: 'master',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        };
        
        await AsyncStorage.setItem('user', JSON.stringify(masterUser));
        dispatch({ type: 'SET_USER', payload: masterUser });
        return true;
      }
      
      // Firebase ile giriş yap - signIn fonksiyonu kendi içinde status kontrolü yapıyor
      console.log('Attempting Firebase login...');
      const userProfile = await firebaseService.signIn(email, password);
      console.log('Firebase login successful, got user profile:', userProfile);
      
      // onAuthStateChanged listener'ın user'ı set etmesini bekle
      console.log('Login successful, onAuthStateChanged will handle user state');
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }
  };

  const register = async (email: string, password: string, businessName: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      setIsRegistering(true); // Kayıt işlemi başladı
      console.log('AuthContext: Starting registration for:', email, businessName);
      
      const userProfile = await firebaseService.signUpSimple(email, password, businessName);
      console.log('AuthContext: Registration completed, user profile:', userProfile);
      
      // signUpSimple zaten çıkış yaptı, sadece state'i temizle
      console.log('AuthContext: Registration successful, cleaning up state...');
      
      // State'i de temizle
      dispatch({ type: 'LOGOUT' });
      setIsRegistering(false); // Kayıt işlemi bitti
      
      return true;
    } catch (error: any) {
      console.error('AuthContext: Register error:', error);
      setIsRegistering(false); // Hata durumunda da flag'i temizle
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Firebase hata kodlarını kontrol et
      if (error.code === 'auth/email-already-in-use' || error.message?.includes('auth/email-already-in-use')) {
        console.log('AuthContext: Email already in use, checking for ghost user...');
        
        // Ghost user kontrolü yap
        try {
          const isGhostUser = await firebaseService.cleanupGhostUser(email);
          if (isGhostUser) {
            throw new Error(`Bu email adresi daha önce kullanılmış ve sistem kayıtlarında sorun var. Çözüm: Firebase Console > Authentication bölümünden bu email'i manuel olarak silin veya farklı bir email kullanın.`);
          } else {
            throw new Error('Bu email adresi zaten sistemde kayıtlı');
          }
        } catch (ghostError: any) {
          console.error('AuthContext: Ghost user check failed:', ghostError);
          // Eğer ghostError zaten bizim attığımız hata ise, onu yeniden fırlat
          if (ghostError.message.includes('Firebase Console')) {
            throw ghostError;
          }
          throw new Error('Bu email adresi zaten kullanılıyor');
        }
      } else if (error.code === 'auth/weak-password' || error.message?.includes('auth/weak-password')) {
        throw new Error('Şifre en az 6 karakter olmalı');
      } else if (error.code === 'auth/invalid-email' || error.message?.includes('auth/invalid-email')) {
        throw new Error('Geçersiz email adresi');
      }
      
      throw new Error(error.message || 'Kayıt sırasında bir hata oluştu');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseService.signOut();
      await AsyncStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const addEmployee = async (email: string): Promise<void> => {
    if (!state.user?.businessId) {
      throw new Error('Business ID not found');
    }
    await firebaseService.addEmployee(state.user.businessId, email);
  };

  const getPendingUsers = async (): Promise<UserProfile[]> => {
    return await firebaseService.getPendingUsers();
  };

  const approveUser = async (userId: string): Promise<void> => {
    await firebaseService.approveUser(userId);
  };

  const rejectUser = async (userId: string): Promise<void> => {
    await firebaseService.rejectUser(userId);
  };

  const unapproveUser = async (userId: string): Promise<void> => {
    await firebaseService.unapproveUser(userId);
  };

  const deleteUser = async (userId: string): Promise<void> => {
    await firebaseService.deleteUser(userId);
  };

  const toggleUserActive = async (userId: string, isActive: boolean): Promise<void> => {
    await firebaseService.toggleUserActive(userId, isActive);
  };

  const getApprovedUsers = async (): Promise<UserProfile[]> => {
    return await firebaseService.getApprovedUsers();
  };

  return (
    <AuthContext.Provider value={{ 
      state, 
      login, 
      register, 
      logout, 
      addEmployee, 
      getPendingUsers, 
      approveUser, 
      rejectUser,
      unapproveUser,
      deleteUser,
      toggleUserActive,
      getApprovedUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};