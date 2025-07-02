import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  deleteUser as deleteAuthUser,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Property, Reservation } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  settings?: {
    defaultCurrency: string;
  };
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  email: string;
  role: 'master' | 'employee';
  status: 'active' | 'pending' | 'inactive';
  addedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  businessId?: string;
  businessName?: string;
  role: 'master' | 'employee';
  status?: 'pending' | 'approved' | 'rejected';
  isApproved?: boolean;
  isActive?: boolean;
  createdAt: Date;
}

class FirebaseService {
  // Basit kayıt sistemi - Master onayı gerekiyor
  async signUpSimple(email: string, password: string, businessName: string): Promise<UserProfile> {
    try {
      console.log('FirebaseService: Creating user with email:', email);
      
      // Önce Firestore'da bu email ile kullanıcı var mı kontrol et
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        console.log('FirebaseService: User already exists in Firestore');
        throw new Error('Bu email adresi zaten kayıtlı');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('FirebaseService: User created with UID:', user.uid);

      // Master kullanıcısı için özel durum
      const isMasterUser = email === 'master@system.local';
      
      const userProfile: UserProfile = {
        id: user.uid,
        email: user.email!,
        businessName: businessName,
        role: isMasterUser ? 'master' : 'employee',
        createdAt: new Date()
      };
      
      // Conditionally add fields to avoid undefined values
      if (isMasterUser) {
        userProfile.isApproved = true;
        userProfile.isActive = true;
      } else {
        userProfile.status = 'pending';
      }
      
      console.log('🚨🚨🚨 CRITICAL WRITE: signUpSimple - setDoc called for:', user.uid);
      console.log('🚨🚨🚨 CRITICAL WRITE: signUpSimple - Data being written:', userProfile);
      console.error('🚨🚨🚨 CRITICAL WRITE: signUpSimple - STACK TRACE:', new Error().stack);
      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log('FirebaseService: User profile saved successfully');

      // Master kullanıcısı değilse kayıt sonrası çıkış yap
      if (!isMasterUser) {
        console.log('FirebaseService: Signing out immediately after registration');
        await signOut(auth);
      } else {
        console.log('FirebaseService: Master user registration, staying logged in');
      }

      // Kayıt sonrası kontrol et
      const savedDoc = await getDoc(doc(db, 'users', user.uid));
      if (savedDoc.exists()) {
        console.log('FirebaseService: Verification - user doc exists:', savedDoc.data());
      } else {
        console.error('FirebaseService: ERROR - user doc was not saved!');
      }

      return userProfile;
    } catch (error: any) {
      console.error('FirebaseService: SignUp error:', error);
      throw new Error(error.message);
    }
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      console.log('🔷 FirebaseService: STARTING signIn for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('🔷 FirebaseService: Auth successful, getting user profile for UID:', user.uid);

      // User profile'ını getir
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        console.log('❌ FirebaseService: User profile not found in Firestore for:', email);
        
        // SADECE master kullanıcısı için profil oluştur
        if (email === 'master@system.local') {
          console.log('🔷 FirebaseService: Creating master profile during login...');
          const masterProfile: UserProfile = {
            id: user.uid,
            email: user.email!,
            businessName: 'Master System',
            role: 'master',
            isApproved: true,
            isActive: true,
            createdAt: new Date()
          };
          
          console.log('🚨🚨🚨 CRITICAL WRITE: signIn - setDoc called for master profile:', user.uid);
          console.log('🚨🚨🚨 CRITICAL WRITE: signIn - Data being written:', masterProfile);
          console.error('🚨🚨🚨 CRITICAL WRITE: signIn - STACK TRACE:', new Error().stack);
          await setDoc(doc(db, 'users', user.uid), masterProfile);
          console.log('✅ FirebaseService: Master profile created during login');
          
          // Yeni oluşturulan profili return et
          return masterProfile;
        } else {
          // Normal kullanıcılar için profil oluşturma - BU ASLA OLMAMALI
          console.error('❌ FirebaseService: ERROR - Normal user has no Firestore profile!');
          console.error('❌ FirebaseService: User UID:', user.uid);
          console.error('❌ FirebaseService: User Email:', user.email);
          throw new Error('User profile not found - please contact administrator');
        }
      }

      console.log('🔷 FirebaseService: User profile found, loading data...');

      const userProfile = userDoc.data() as UserProfile;
      console.log('🔷 FirebaseService: User profile loaded FROM FIRESTORE:', userProfile);
      console.log('🔷 FirebaseService: CRITICAL - Profile details BEFORE any processing:', {
        id: userProfile.id,
        email: userProfile.email,
        status: userProfile.status,
        isApproved: userProfile.isApproved,
        isActive: userProfile.isActive,
        role: userProfile.role
      });
      
      // 🚨 CRITICAL CHECK: Bu noktada herhangi bir Firestore yazma işlemi YAPMIYORUZ
      console.log('🔷 FirebaseService: About to check user approval status - NO WRITING TO FIRESTORE');
      
      // Master kullanıcısı için özel kontrol
      if (userProfile.role === 'master') {
        console.log('FirebaseService: Master user login, skipping approval checks');
      } else {
        // Kullanıcı onaylanmış mı kontrol et - status="pending" VEYA isApproved=false
        const isNotApproved = userProfile.status === 'pending' || (!userProfile.isApproved || userProfile.isApproved === false);
        
        if (isNotApproved) {
          console.log('FirebaseService: User is not approved, signing out');
          // Kullanıcı çıkış yap
          await signOut(auth);
          throw new Error('Hesabınız henüz onaylanmamış. Lütfen master kullanıcısından onay isteyiniz.');
        }
        
        // Kullanıcı onaylanmış ancak aktif değilse
        if (userProfile.isApproved === true && userProfile.isActive === false) {
          console.log('FirebaseService: User is approved but inactive, signing out');
          // Kullanıcı çıkış yap
          await signOut(auth);
          throw new Error('Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçiniz.');
        }
      }

      console.log('🔷 FirebaseService: User approved, login successful');
      console.log('🔷 FirebaseService: FINAL - Returning user profile WITHOUT any modifications:', {
        id: userProfile.id,
        email: userProfile.email,
        status: userProfile.status,
        isApproved: userProfile.isApproved,
        isActive: userProfile.isActive,
        role: userProfile.role
      });
      return userProfile;
    } catch (error: any) {
      // Firebase auth hatalarını gizle, sadece genel hata mesajı göster
      if (error.code === 'auth/invalid-email' || error.code === 'auth/invalid-credential') {
        console.log('FirebaseService: Silent auth error (invalid credentials)');
        throw new Error('Geçersiz email veya şifre');
      } else {
        console.log('❌ FirebaseService: SignIn error:', error.message);
        throw new Error(error.message);
      }
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  async createMasterProfile(): Promise<void> {
    console.log('FirebaseService: Creating master profile...');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }
      
      const masterProfile: UserProfile = {
        id: currentUser.uid,
        email: currentUser.email!,
        businessName: 'Master System',
        role: 'master',
        isApproved: true,
        isActive: true,
        createdAt: new Date()
      };
      
      console.log('🚨🚨🚨 CRITICAL WRITE: createMasterProfile - setDoc called for:', currentUser.uid);
      console.log('🚨🚨🚨 CRITICAL WRITE: createMasterProfile - Data being written:', masterProfile);
      console.error('🚨🚨🚨 CRITICAL WRITE: createMasterProfile - STACK TRACE:', new Error().stack);
      await setDoc(doc(db, 'users', currentUser.uid), masterProfile);
      console.log('FirebaseService: Master profile created successfully');
    } catch (error) {
      console.error('FirebaseService: Error creating master profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    console.log('🟡 FirebaseService: getUserProfile - Getting user profile for ID:', userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('❌ FirebaseService: getUserProfile - User profile not found for ID:', userId);
      throw new Error('User profile not found');
    }
    const userData = userDoc.data() as UserProfile;
    console.log('🟡 FirebaseService: getUserProfile - Profile data FROM FIRESTORE:', userData);
    console.log('🟡 FirebaseService: getUserProfile - ONLY READING, NO WRITING');
    return userData;
  }

  // Master onay fonksiyonları
  async getPendingUsers(): Promise<UserProfile[]> {
    console.log('FirebaseService: Getting pending users...');
    try {
      // Tüm kullanıcıları getir ve client-side filtering yap
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      console.log('FirebaseService: Query executed, total docs count:', snapshot.docs.length);
      
      // Bekleme ekle - cache'in refresh olması için
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const allUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as UserProfile;
      });
      
      // Pending kullanıcıları filtrele: status="pending" VEYA isApproved olmayan/false
      const pendingUsers = allUsers.filter(user => {
        const isPending = user.status === 'pending' || (!user.isApproved || user.isApproved === false);
        console.log('FirebaseService: User filtering:', {
          id: user.id,
          email: user.email,
          isApproved: user.isApproved,
          status: user.status,
          isPending: isPending
        });
        return isPending;
      });
      
      console.log('FirebaseService: Total pending users found:', pendingUsers.length);
      console.log('FirebaseService: Pending users emails:', pendingUsers.map(u => u.email));
      
      return pendingUsers;
    } catch (error) {
      console.error('FirebaseService: Error getting pending users:', error);
      throw error;
    }
  }

  async approveUser(userId: string): Promise<void> {
    console.log('🔵 FirebaseService: STARTING approveUser for:', userId);
    try {
      console.log('🔵 FirebaseService: Attempting to update user document...');
      
      const userRef = doc(db, 'users', userId);
      
      // Önce dokümantın var olduğunu kontrol et
      const beforeDoc = await getDoc(userRef);
      if (!beforeDoc.exists()) {
        console.error('❌ FirebaseService: User document not found for ID:', userId);
        throw new Error('User document not found');
      }
      
      const beforeData = beforeDoc.data();
      console.log('🔵 FirebaseService: User document BEFORE update:', beforeData);
      console.log('🔵 FirebaseService: Document ID:', beforeDoc.id);
      console.log('🔵 FirebaseService: Document ref path:', userRef.path);
      console.log('🔵 FirebaseService: Current user auth:', auth.currentUser?.uid);
      console.log('🔵 FirebaseService: Before data status:', beforeData.status);
      console.log('🔵 FirebaseService: Before data isApproved:', beforeData.isApproved);
      
      // Mevcut kullanıcının master olup olmadığını kontrol et
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('FirebaseService: No authenticated user, trying to create master user for approval');
        // Master kullanıcı Firebase'e kayıtlı değilse, güncelleme için setDoc kullan
        const updateData = {
          ...beforeData,
          isApproved: true,
          isActive: true,
          updatedAt: new Date(),
          approvedAt: new Date()
        };
        // status alanını hariç tut
        delete updateData.status;
        
        console.log('🚨🚨🚨 CRITICAL WRITE: approveUser - setDoc called for master approval:', userId);
        console.log('🚨🚨🚨 CRITICAL WRITE: approveUser - Data being written:', updateData);
        console.error('🚨🚨🚨 CRITICAL WRITE: approveUser - STACK TRACE:', new Error().stack);
        await setDoc(userRef, updateData);
        console.log('FirebaseService: setDoc completed');
      } else {
        // Normal authenticated user flow
        const updateData = {
          status: deleteField(),
          isApproved: true,
          isActive: true,
          updatedAt: new Date(),
          approvedAt: new Date()
        };
        
        console.log('🚨🚨🚨 CRITICAL WRITE: approveUser - updateDoc called for authenticated user:', userId);
        console.log('🚨🚨🚨 CRITICAL WRITE: approveUser - Data being written:', updateData);
        console.error('🚨🚨🚨 CRITICAL WRITE: approveUser - STACK TRACE:', new Error().stack);
        await updateDoc(userRef, updateData);
        console.log('✅ FirebaseService: updateDoc completed successfully');
      }
      
      // Daha uzun bir bekleme sonrası kontrol et (cache refresh için)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Güncelleme sonrası kontrol et - fresh data için cache'i force et
      console.log('🔵 FirebaseService: Checking update results after 2s delay...');
      const afterDoc = await getDoc(userRef);
      if (afterDoc.exists()) {
        const userData = afterDoc.data();
        console.log('🔵 FirebaseService: User data AFTER update:', userData);
        console.log('🔵 FirebaseService: After data status:', userData.status);
        console.log('🔵 FirebaseService: After data isApproved:', userData.isApproved);
        console.log('🔵 FirebaseService: After data isActive:', userData.isActive);
        
        // Status alanının silindiğini kontrol et
        if (userData.status === undefined || userData.status === null) {
          console.log('✅ FirebaseService: Status field successfully removed');
        } else {
          console.error('❌ FirebaseService: Status field still exists:', userData.status);
          console.error('❌ FirebaseService: Full user data:', userData);
          throw new Error('Status field was not removed, still showing: ' + userData.status);
        }
        
        // isApproved alanının eklendiğini kontrol et
        if (userData.isApproved === true) {
          console.log('✅ FirebaseService: isApproved successfully set to true');
        } else {
          console.error('❌ FirebaseService: isApproved was NOT set, value:', userData.isApproved);
          throw new Error('isApproved field was not set correctly');
        }
        
        if (userData.isActive === true) {
          console.log('FirebaseService: ✅ isActive successfully set to true');
        } else {
          console.log('FirebaseService: ⚠️ isActive is:', userData.isActive);
        }
        
        if (userData.approvedAt) {
          console.log('FirebaseService: ✅ approvedAt timestamp set:', userData.approvedAt);
        }
      } else {
        console.error('FirebaseService: ❌ Document disappeared after update!');
        throw new Error('Document not found after update');
      }
      
      console.log('🎉 FirebaseService: User approval completed successfully');
    } catch (error: any) {
      console.error('❌ FirebaseService: Error approving user:', error);
      console.error('❌ FirebaseService: Error code:', error.code);
      console.error('❌ FirebaseService: Error message:', error.message);
      console.error('❌ FirebaseService: Full error object:', error);
      throw error;
    }
  }

  async rejectUser(userId: string): Promise<void> {
    console.log('🚨🚨🚨 CRITICAL WRITE: rejectUser - updateDoc called for:', userId);
    console.log('🚨🚨🚨 CRITICAL WRITE: rejectUser - Data being written:', { status: 'rejected' });
    console.error('🚨🚨🚨 CRITICAL WRITE: rejectUser - STACK TRACE:', new Error().stack);
    await updateDoc(doc(db, 'users', userId), {
      status: 'rejected'
    });
  }

  async unapproveUser(userId: string): Promise<void> {
    console.log('🚨🚨🚨 CRITICAL: unapproveUser called for:', userId);
    console.error('🚨🚨🚨 STACK TRACE:', new Error().stack);
    try {
      const userRef = doc(db, 'users', userId);
      
      // Önce dokümantın var olduğunu kontrol et
      const beforeDoc = await getDoc(userRef);
      if (!beforeDoc.exists()) {
        console.error('FirebaseService: User document not found for ID:', userId);
        throw new Error('User document not found');
      }
      
      const beforeData = beforeDoc.data();
      console.log('FirebaseService: User document before unapproval:', beforeData);
      
      // isApproved ve isActive alanlarını sil, status="pending" ekle
      const updateData = {
        isApproved: deleteField(),
        isActive: deleteField(),
        status: 'pending',
        updatedAt: new Date(),
        unapprovedAt: new Date()
      };
      
      console.log('🚨🚨🚨 CRITICAL WRITE: unapproveUser - updateDoc called for:', userId);
      console.log('🚨🚨🚨 CRITICAL WRITE: unapproveUser - Data being written:', updateData);
      console.error('🚨🚨🚨 CRITICAL WRITE: unapproveUser - STACK TRACE:', new Error().stack);
      await updateDoc(userRef, updateData);
      console.log('FirebaseService: User unapproval completed');
      
      // Kontrol et
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterDoc = await getDoc(userRef);
      if (afterDoc.exists()) {
        const userData = afterDoc.data();
        console.log('FirebaseService: User data after unapproval:', userData);
        
        if (userData.status === 'pending') {
          console.log('FirebaseService: ✅ Status successfully set to pending');
        } else {
          console.error('FirebaseService: ❌ Status was NOT set to pending:', userData.status);
        }
        
        if (userData.isApproved === undefined) {
          console.log('FirebaseService: ✅ isApproved successfully removed');
        } else {
          console.log('FirebaseService: ⚠️ isApproved still exists:', userData.isApproved);
        }
      }
    } catch (error: any) {
      console.error('FirebaseService: Error unapproving user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    console.log('FirebaseService: Deleting user completely:', userId);
    try {
      const userRef = doc(db, 'users', userId);
      
      // Önce kullanıcı var mı kontrol et
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.error('FirebaseService: User document not found for ID:', userId);
        throw new Error('User document not found');
      }
      
      const userData = userDoc.data();
      console.log('FirebaseService: Deleting user data:', userData);
      
      // Batch işlem başlat - kullanıcı ile ilgili tüm verileri sil
      const batch = writeBatch(db);
      
      // 1. User document'ini sil
      batch.delete(userRef);
      
      // 2. User'a ait properties'leri sil
      try {
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('userId', '==', userId)
        );
        const propertiesSnapshot = await getDocs(propertiesQuery);
        propertiesSnapshot.docs.forEach(doc => {
          console.log('FirebaseService: Marking property for deletion:', doc.id);
          batch.delete(doc.ref);
        });
      } catch (error) {
        console.log('FirebaseService: No properties found for user or error:', error);
      }
      
      // 3. User'a ait reservations'ları sil
      try {
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('userId', '==', userId)
        );
        const reservationsSnapshot = await getDocs(reservationsQuery);
        reservationsSnapshot.docs.forEach(doc => {
          console.log('FirebaseService: Marking reservation for deletion:', doc.id);
          batch.delete(doc.ref);
        });
      } catch (error) {
        console.log('FirebaseService: No reservations found for user or error:', error);
      }
      
      // 4. User'a ait subUsers'ları sil
      try {
        const subUsersQuery = query(
          collection(db, 'subUsers'),
          where('parentUserId', '==', userId)
        );
        const subUsersSnapshot = await getDocs(subUsersQuery);
        subUsersSnapshot.docs.forEach(doc => {
          console.log('FirebaseService: Marking subUser for deletion:', doc.id);
          batch.delete(doc.ref);
        });
      } catch (error) {
        console.log('FirebaseService: No subUsers found for user or error:', error);
      }
      
      // 5. Business members tablosundan kullanıcıyı sil
      try {
        const businessMembersQuery = query(
          collection(db, 'businessMembers'),
          where('userId', '==', userId)
        );
        const businessMembersSnapshot = await getDocs(businessMembersQuery);
        businessMembersSnapshot.docs.forEach(doc => {
          console.log('FirebaseService: Marking business member for deletion:', doc.id);
          batch.delete(doc.ref);
        });
      } catch (error) {
        console.log('FirebaseService: No business members found for user or error:', error);
      }
      
      // Batch'i commit et
      await batch.commit();
      console.log('FirebaseService: ✅ User and all related Firestore data deleted successfully');
      
      // Firebase Authentication'dan da kullanıcıyı silmeye çalış
      // Not: Bu sadece mevcut kullanıcı kendini silebilir, başka kullanıcıları silemez
      try {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
          console.log('FirebaseService: Deleting user from Firebase Auth...');
          await deleteAuthUser(currentUser);
          console.log('FirebaseService: ✅ User deleted from Firebase Auth successfully');
        } else {
          console.log('FirebaseService: ⚠️ Cannot delete from Auth - user not currently authenticated or different user');
          console.log('FirebaseService: 📝 Note - User still exists in Firebase Auth, manual deletion required');
        }
      } catch (authDeleteError: any) {
        console.error('FirebaseService: ❌ Error deleting from Firebase Auth:', authDeleteError);
        console.log('FirebaseService: 📝 Note - Firestore data deleted but Auth user remains');
      }
      
    } catch (error: any) {
      console.error('FirebaseService: Error deleting user:', error);
      throw error;
    }
  }

  async toggleUserActive(userId: string, isActive: boolean): Promise<void> {
    console.log('FirebaseService: Toggling user active status:', userId, isActive);
    try {
      const userRef = doc(db, 'users', userId);
      
      // Önce dokümantın var olduğunu kontrol et
      const beforeDoc = await getDoc(userRef);
      if (!beforeDoc.exists()) {
        throw new Error('User document not found');
      }
      console.log('FirebaseService: User document before toggle:', beforeDoc.data());
      
      // Güncelleme işlemi
      const toggleData = {
        isActive: isActive,
        updatedAt: new Date()
      };
      console.log('🚨🚨🚨 CRITICAL WRITE: toggleUserActive - updateDoc called for:', userId);
      console.log('🚨🚨🚨 CRITICAL WRITE: toggleUserActive - Data being written:', toggleData);
      console.error('🚨🚨🚨 CRITICAL WRITE: toggleUserActive - STACK TRACE:', new Error().stack);
      await updateDoc(userRef, toggleData);
      console.log('FirebaseService: updateDoc completed for toggle');
      
      // Güncelleme sonrası kontrol et
      const afterDoc = await getDoc(userRef);
      if (afterDoc.exists()) {
        const userData = afterDoc.data();
        console.log('FirebaseService: User data after toggle:', userData);
        
        if (userData.isActive === isActive) {
          console.log('FirebaseService: ✅ isActive successfully updated to', isActive);
        } else {
          console.error('FirebaseService: ❌ isActive was NOT updated, still:', userData.isActive);
        }
      }
    } catch (error: any) {
      console.error('FirebaseService: Error toggling user active:', error);
      throw error;
    }
  }

  async getApprovedUsers(): Promise<UserProfile[]> {
    console.log('FirebaseService: Getting approved users...');
    try {
      const q = query(
        collection(db, 'users'),
        where('isApproved', '==', true)
      );
      const snapshot = await getDocs(q);
      console.log('FirebaseService: Approved users query executed, docs count:', snapshot.docs.length);
      
      const approvedUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('FirebaseService: Approved user doc:', doc.id, {
          email: data.email,
          isApproved: data.isApproved,
          isActive: data.isActive
        });
        return { id: doc.id, ...data } as UserProfile;
      });
      
      console.log('FirebaseService: Returning approved users:', approvedUsers);
      return approvedUsers;
    } catch (error) {
      console.error('FirebaseService: Error getting approved users:', error);
      throw error;
    }
  }

  // Debug fonksiyonları
  async getAllUsers(): Promise<UserProfile[]> {
    console.log('FirebaseService: Getting all users...');
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      console.log('FirebaseService: All users count:', snapshot.docs.length);
      
      const allUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('FirebaseService: User doc:', doc.id, data);
        return { id: doc.id, ...data } as UserProfile;
      });
      
      return allUsers;
    } catch (error) {
      console.error('FirebaseService: Error getting all users:', error);
      throw error;
    }
  }

  async deleteUserFromAuth(): Promise<void> {
    // Sadece debug için - mevcut kullanıcıyı auth'tan sil
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('Deleting current user from auth:', currentUser.email);
      await currentUser.delete();
    }
  }

  async checkUserStatus(email: string): Promise<UserProfile | null> {
    console.log('FirebaseService: Checking user status for:', email);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('FirebaseService: No user found with email:', email);
        return null;
      }
      
      const userDoc = snapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
      console.log('FirebaseService: User found:', userData);
      return userData;
    } catch (error) {
      console.error('FirebaseService: Error checking user status:', error);
      throw error;
    }
  }

  // Ghost user (Firebase Auth'da var ama Firestore'da yok) temizleme fonksiyonu
  async cleanupGhostUser(email: string): Promise<boolean> {
    console.log('FirebaseService: Checking for ghost user:', email);
    try {
      // Firestore'da kullanıcı var mı kontrol et
      const firestoreUser = await this.checkUserStatus(email);
      
      if (firestoreUser) {
        console.log('FirebaseService: User exists in Firestore, not a ghost user');
        return false;
      }
      
      console.log('FirebaseService: User not found in Firestore - checking if ghost user');
      
      // Ghost user detection: Bu email ile giriş yapmayı dene
      // Eğer auth/wrong-password alırsak, kullanıcı Auth'da var demektir
      try {
        await signInWithEmailAndPassword(auth, email, 'dummy-wrong-password');
        // Bu satıra gelmemeli
        return false;
      } catch (testError: any) {
        console.log('FirebaseService: Auth test error:', testError.code);
        
        if (testError.code === 'auth/wrong-password' || testError.code === 'auth/invalid-credential') {
          console.log('FirebaseService: ✅ Confirmed ghost user - exists in Auth but not in Firestore');
          return true;
        } else if (testError.code === 'auth/user-not-found') {
          console.log('FirebaseService: User not found in Auth either - safe to register');
          return false;
        } else {
          console.log('FirebaseService: Unknown auth error, assuming not ghost user');
          return false;
        }
      }
    } catch (error) {
      console.error('FirebaseService: Error checking ghost user:', error);
      return false;
    }
  }

  // Business Management
  async getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
    const q = query(
      collection(db, 'businessMembers'), 
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as BusinessMember);
  }

  async addEmployee(businessId: string, email: string): Promise<void> {
    // Önce kullanıcının var olup olmadığını kontrol et
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      throw new Error('Bu email adresi ile kayıtlı kullanıcı bulunamadı');
    }

    const userData = usersSnapshot.docs[0].data() as UserProfile;
    
    // Zaten bir business'a üye mi kontrol et
    if (userData.businessId && userData.businessId !== businessId) {
      throw new Error('Bu kullanıcı zaten başka bir işletmenin üyesi');
    }

    // Business member ekle
    const memberData: BusinessMember = {
      id: userData.id,
      businessId: businessId,
      userId: userData.id,
      email: email,
      role: 'employee',
      status: 'active',
      addedAt: new Date()
    };

    console.log('🚨🚨🚨 CRITICAL WRITE: addEmployee - setDoc called for member:', userData.id);
    console.log('🚨🚨🚨 CRITICAL WRITE: addEmployee - Member data being written:', memberData);
    console.error('🚨🚨🚨 CRITICAL WRITE: addEmployee - STACK TRACE:', new Error().stack);
    await setDoc(doc(db, 'businessMembers', userData.id), memberData);
    
    // User profile'ını güncelle
    const userUpdateData = {
      businessId: businessId,
      role: 'employee'
    };
    console.log('🚨🚨🚨 CRITICAL WRITE: addEmployee - updateDoc called for user:', userData.id);
    console.log('🚨🚨🚨 CRITICAL WRITE: addEmployee - User update data being written:', userUpdateData);
    console.error('🚨🚨🚨 CRITICAL WRITE: addEmployee - STACK TRACE:', new Error().stack);
    await updateDoc(doc(db, 'users', userData.id), userUpdateData);
  }

  // Properties - User ID bazlı basit sistem
  async getProperties(userId: string): Promise<Property[]> {
    const q = query(
      collection(db, 'properties'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Property[];
  }

  async addProperty(userId: string, property: Omit<Property, 'id'>): Promise<string> {
    const propertyData = {
      ...property,
      userId: userId,
      createdAt: new Date()
    };
    const docRef = await addDoc(collection(db, 'properties'), propertyData);
    return docRef.id;
  }

  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<void> {
    console.log('🚨🚨🚨 CRITICAL WRITE: updateProperty - updateDoc called for property:', propertyId);
    console.log('🚨🚨🚨 CRITICAL WRITE: updateProperty - Updates being written:', updates);
    console.error('🚨🚨🚨 CRITICAL WRITE: updateProperty - STACK TRACE:', new Error().stack);
    await updateDoc(doc(db, 'properties', propertyId), updates);
  }

  async deleteProperty(propertyId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Property'yi sil
    batch.delete(doc(db, 'properties', propertyId));
    
    // Bu property'ye ait rezervasyonları da sil
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('propertyId', '==', propertyId)
    );
    const reservationsSnapshot = await getDocs(reservationsQuery);
    
    reservationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  // Reservations - User ID bazlı basit sistem
  async getReservations(userId: string): Promise<Reservation[]> {
    const q = query(
      collection(db, 'reservations'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reservation[];
  }

  async addReservation(userId: string, reservation: Omit<Reservation, 'id'>): Promise<string> {
    const reservationData = {
      ...reservation,
      userId: userId,
      createdAt: new Date()
    };
    const docRef = await addDoc(collection(db, 'reservations'), reservationData);
    return docRef.id;
  }

  async updateReservation(reservationId: string, updates: Partial<Reservation>): Promise<void> {
    console.log('🚨🚨🚨 CRITICAL WRITE: updateReservation - updateDoc called for reservation:', reservationId);
    console.log('🚨🚨🚨 CRITICAL WRITE: updateReservation - Updates being written:', updates);
    console.error('🚨🚨🚨 CRITICAL WRITE: updateReservation - STACK TRACE:', new Error().stack);
    await updateDoc(doc(db, 'reservations', reservationId), updates);
  }

  async deleteReservation(reservationId: string): Promise<void> {
    await deleteDoc(doc(db, 'reservations', reservationId));
  }

  // SubUser deletion
  async deleteSubUser(subUserId: string): Promise<void> {
    console.log('FirebaseService: Deleting subUser:', subUserId);
    try {
      const subUserRef = doc(db, 'subUsers', subUserId);
      
      // Önce subUser var mı kontrol et
      const subUserDoc = await getDoc(subUserRef);
      if (!subUserDoc.exists()) {
        console.error('FirebaseService: SubUser document not found for ID:', subUserId);
        throw new Error('SubUser document not found');
      }
      
      const subUserData = subUserDoc.data();
      console.log('FirebaseService: Deleting subUser data:', subUserData);
      
      // SubUser'ı Firebase'den sil
      await deleteDoc(subUserRef);
      console.log('FirebaseService: ✅ SubUser deleted from Firebase successfully');
      
      // AsyncStorage'dan da sil (eğer varsa)
      try {
        const existingSubUsersString = await AsyncStorage.getItem('subUsers');
        if (existingSubUsersString) {
          const existingSubUsers = JSON.parse(existingSubUsersString);
          const filteredSubUsers = existingSubUsers.filter((su: any) => su.id !== subUserId);
          await AsyncStorage.setItem('subUsers', JSON.stringify(filteredSubUsers));
          console.log('FirebaseService: ✅ SubUser removed from AsyncStorage');
        }
      } catch (storageError) {
        console.log('FirebaseService: ⚠️ Error updating AsyncStorage:', storageError);
      }
      
    } catch (error: any) {
      console.error('FirebaseService: Error deleting subUser:', error);
      throw error;
    }
  }

  // Real-time listeners - User ID bazlı
  subscribeToProperties(userId: string, callback: (properties: Property[]) => void): () => void {
    const q = query(
      collection(db, 'properties'),
      where('userId', '==', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const properties = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
      callback(properties);
    });
  }

  subscribeToReservations(userId: string, callback: (reservations: Reservation[]) => void): () => void {
    const q = query(
      collection(db, 'reservations'),
      where('userId', '==', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const reservations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reservation[];
      callback(reservations);
    });
  }
}

export default new FirebaseService();