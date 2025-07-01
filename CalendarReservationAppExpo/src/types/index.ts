export interface User {
  id: string;
  username: string; // İşletme adı
  email: string;
  password: string; // Hashlenmiş şifre (gerçek uygulamada)
  role: 'admin' | 'user' | 'master';
  isActive: boolean;
  isPending?: boolean; // Onay bekleyen kullanıcılar için
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  name: string;
  description?: string;
  address?: string;
  userId: string;
  image?: string;
  isLocked?: boolean;
  isArchived?: boolean;
  settings?: {
    allowOverlapping?: boolean;
    requireApproval?: boolean;
    maxAdvanceDays?: number;
  };
  createdAt: Date;
}

export interface SubUser {
  id: string;
  name: string;
  email?: string;
  parentUserId: string;
  createdAt: Date;
}

export interface Reservation {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format (start date)
  endDate?: string; // YYYY-MM-DD format (end date for range reservations)
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  userId: string;
  propertyId: string;
  subUserId?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  MasterDashboard: undefined;
  Login: undefined;
  Register: undefined;
  Calendar: undefined;
  PropertyCalendar: { property: Property };
  ReservationDetail: { reservation: Reservation };
  AddReservation: { selectedDate?: string; endDate?: string; propertyId: string; editingReservation?: Reservation };
  UserManagement: undefined;
  PropertyManagement: { editingProperty?: Property };
  Debug: undefined;
  Settings: undefined;
};