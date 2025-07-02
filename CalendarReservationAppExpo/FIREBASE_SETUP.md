# Firebase Kurulum Rehberi

## 1. Firebase Projesi Oluşturma

1. [Firebase Console](https://console.firebase.google.com/) 'a git
2. "Create a project" veya "Add project" butonuna tıkla
3. Proje adını "reservas-app" olarak gir
4. Google Analytics'i kapatabilirsin (isteğe bağlı)
5. Projeyi oluştur

## 2. Authentication Aktifleştirme

1. Firebase Console'da projenizi açın
2. Sol menüden "Authentication" seçin
3. "Get started" butonuna tıklayın
4. "Sign-in method" sekmesinde "Email/Password" seçin
5. Enable yapın ve kaydedin

## 3. Firestore Database Kurulumu

1. Sol menüden "Firestore Database" seçin
2. "Create database" butonuna tıklayın
3. "Start in test mode" seçin (geliştirme için)
4. Location olarak yakın bir bölge seçin

## 4. Web App Ekleme

1. Project Overview'da "Web" app ikonuna (</>) tıklayın
2. App nickname: "Reservas Web"
3. "Register app" butonuna tıklayın
4. SDK configuration kısmını kopyalayın

## 5. Konfigürasyon Güncelleme

`src/config/firebase.ts` dosyasındaki yapılandırmayı Firebase Console'dan aldığınız bilgiler ile değiştirin:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id", 
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 6. Firestore Security Rules

Firestore Rules sekmesinde aşağıdaki kuralları ekleyin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Business data - only business members can access
    match /businesses/{businessId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/businessMembers/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/businessMembers/$(request.auth.uid)).data.businessId == businessId;
    }
    
    // Business members
    match /businessMembers/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == memberId || 
         get(/databases/$(database)/documents/businessMembers/$(request.auth.uid)).data.role == 'master');
    }
    
    // Properties - business members can access
    match /properties/{propertyId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/businessMembers/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/businessMembers/$(request.auth.uid)).data.businessId == resource.data.businessId;
    }
    
    // Reservations - business members can access  
    match /reservations/{reservationId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/businessMembers/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/businessMembers/$(request.auth.uid)).data.businessId == resource.data.businessId;
    }
  }
}
```

## 7. Test Kullanıcısı Oluşturma

Uygulamayı test etmek için:

1. İlk kullanıcı kaydol (master olacak)
2. Diğer kullanıcılar kaydolabilir
3. Master kullanıcı, diğer kullanıcıları employee olarak ekleyebilir

## 8. Sistem Nasıl Çalışacak

### Master Kullanıcı (İşletme Sahibi)
- İlk kayıt olan kişi master olur
- Çalışan ekleyebilir/çıkarabilir
- Tüm verilere erişimi var

### Employee Kullanıcı (Çalışan)
- Master tarafından eklenen kullanıcılar
- Aynı business ID'si altında çalışır
- Rezervasyon ve property verilerini görebilir/düzenleyebilir

### Veri Paylaşımı
- Aynı business ID'si olan kullanıcılar aynı verileri görür
- Gerçek zamanlı senkronizasyon
- Çoklu cihaz desteği

## Önemli Notlar

1. **İnternet Bağlantısı Gerekli**: Firebase çalışması için internet gerekli
2. **Master Mod**: "master" kullanıcısı offline mod olarak çalışmaya devam eder
3. **Güvenlik**: Firestore rules ile veri güvenliği sağlanır
4. **Maliyet**: Firebase'in ücretsiz planı küçük işletmeler için yeterli

## Sorunlar ve Çözümler

### Build Hataları
Expo ile Firebase kullanırken bazı build sorunları yaşanabilir. Bu durumda:
- expo-dev-client kullanın
- EAS Build ile native build yapın

### Authentication Sorunları  
- Firebase Console'da Email/Password aktif olduğundan emin olun
- Konfigürasyon bilgilerini kontrol edin

Bu kurulum ile 3 kişi aynı hesabı farklı telefonlarda kullanabilecek ve rezervasyonları gerçek zamanlı olarak görebilecek.