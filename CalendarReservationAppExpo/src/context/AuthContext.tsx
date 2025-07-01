import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '../types';

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for master user first
      if (username.toLowerCase() === 'master' && password === '805046800') {
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
      
      // Get registered users from AsyncStorage
      const usersString = await AsyncStorage.getItem('registeredUsers');
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      
      // Find user with matching credentials
      const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password && // Gerçek uygulamada hash karşılaştırması
        u.isActive && 
        !u.isPending // Onay bekleyen kullanıcılar giriş yapamaz
      );
      
      if (!user) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return false;
      }
      
      // Update last login
      const updatedUser = {
        ...user,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      };
      
      // Update user in registered users list
      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
      await AsyncStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      
      // Save current session
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: 'SET_USER', payload: updatedUser });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get existing users
      const usersString = await AsyncStorage.getItem('registeredUsers');
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      
      // Check if username or email already exists
      const existingUser = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === email.toLowerCase()
      );
      
      if (existingUser) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return false; // User already exists
      }
      
      // Create new user as pending (requires master approval)
      const newUser: User = {
        id: Date.now().toString(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password, // Gerçek uygulamada hash'lenmeli
        role: 'admin',
        isActive: false, // Inactive until approved
        isPending: true, // Onay bekliyor
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Add to registered users
      const updatedUsers = [...users, newUser];
      await AsyncStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      
      // Don't log in automatically - user needs approval
      dispatch({ type: 'SET_LOADING', payload: false });
      return true;
    } catch (error) {
      console.error('Register error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout }}>
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